import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Box,
  Check,
  Code2,
  Copy,
  FileCode2,
  Grid3X3,
  Layers,
  Lock,
  Magnet,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Monitor,
  RotateCcw,
  Ruler,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Unlock,
  Upload,
  Zap,
} from 'lucide-react';
import type {
  Bounds,
  CanvasNode,
  CollaboratorCursor,
  DocumentState,
  NodeType,
  PathPoint,
  Point,
  SnapGuide,
  ToolType,
  UiMode,
  Viewport,
  ViewportBreakpoint,
} from '../types/canvas';
import {
  BREAKPOINT_PRESETS,
  computeBreakpointColumnRects,
  getBreakpointPreset,
} from '../engines/responsive';
import {
  getRulerTicks,
  screenToCanvas,
  zoomAtPoint,
} from '../engines/viewport';
import { computeSnap } from '../engines/snap';
import { resolveArtboardBackground, resolveNodeStyle } from '../engines/tokens';
import {
  computeRedlineMeasurements,
  resolveParentArtboard,
} from '../engines/codegen';
import {
  createNodeFromTool,
  createPathNodeFromPoints,
} from '../engines/nodeFactory';
import { buildSvgPathData, scalePathPoints } from '../engines/bezier';
import { buildImageFilterCss } from '../engines/media';
import { computeInterNodeMeasurements } from '../engines/measure';
import {
  getDocumentArtboards,
  getNodesForArtboard,
} from '../engines/projectStorage';
import type { StudioLabels } from '../i18n/labels';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type ContextMenuAction =
  | 'duplicate'
  | 'bring-front'
  | 'send-back'
  | 'wrap-glass'
  | 'copy-react'
  | 'copy-svg'
  | 'toggle-lock'
  | 'delete';

interface CanvasStageProps {
  doc: DocumentState;
  activeArtboardId: string;
  onSelectArtboard: (artboardId: string) => void;
  viewport: Viewport;
  onViewportChange: (next: Viewport) => void;
  onStageResize: (size: { width: number; height: number }) => void;
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  uiMode: UiMode;
  spacePressed: boolean;
  altPressed: boolean;
  stack3D: boolean;
  onToggleStack3D: () => void;
  breakpoint: ViewportBreakpoint;
  onSelectBreakpoint: (bp: ViewportBreakpoint) => void;
  smartGuidesEnabled: boolean;
  onToggleSmartGuides: () => void;
  snapToGrid8px: boolean;
  onToggleSnapToGrid8px: () => void;
  onLiveUpdateNodes: (nextNodes: CanvasNode[]) => void;
  onCommitNodes: (nextNodes: CanvasNode[]) => void;
  onContextAction: (nodeId: string, action: ContextMenuAction) => void;
  onDropLocalImage: (file: File, canvasPt: Point, artboardId: string) => void;
  coDesigner: CollaboratorCursor;
  crdtSynced: boolean;
  labels: StudioLabels;
}

const RULER_SIZE = 24;

function getSelectionBounds(nodes: CanvasNode[]): Bounds | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

type InteractionState =
  | { kind: 'idle' }
  | { kind: 'pan'; startScreen: Point; startViewport: Viewport }
  | { kind: 'orbit3d'; startScreen: Point; startPitch: number; startYaw: number }
  | {
      kind: 'move';
      startCanvas: Point;
      initialNodes: Map<string, { x: number; y: number }>;
      baseNodes: CanvasNode[];
      movedIds: string[];
    }
  | {
      kind: 'resize';
      handle: ResizeHandle;
      nodeId: string;
      startCanvas: Point;
      initialRect: Bounds;
      initialPathPoints?: PathPoint[];
      baseNodes: CanvasNode[];
    }
  | {
      kind: 'rotate';
      nodeId: string;
      center: Point;
      startAngle: number;
      initialRotation: number;
      baseNodes: CanvasNode[];
    }
  | { kind: 'marquee'; startCanvas: Point; currentCanvas: Point }
  | {
      kind: 'draw';
      tool: Exclude<NodeType, 'path'>;
      startCanvas: Point;
      currentCanvas: Point;
      artboardId: string;
    };

export function CanvasStage({
  doc,
  activeArtboardId,
  onSelectArtboard,
  viewport,
  onViewportChange,
  onStageResize,
  activeTool,
  onSelectTool,
  selectedIds,
  onSelectIds,
  uiMode,
  spacePressed,
  altPressed,
  stack3D,
  onToggleStack3D,
  breakpoint,
  onSelectBreakpoint,
  smartGuidesEnabled,
  onToggleSmartGuides,
  snapToGrid8px,
  onToggleSnapToGrid8px,
  onLiveUpdateNodes,
  onCommitNodes,
  onContextAction,
  onDropLocalImage,
  coDesigner,
  crdtSynced,
  labels,
}: CanvasStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 960, height: 640 });
  const [pointerCanvas, setPointerCanvas] = useState<Point>({ x: 0, y: 0 });
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [marqueeBox, setMarqueeBox] = useState<Bounds | null>(null);
  const [drawBox, setDrawBox] = useState<Bounds | null>(null);
  const [rotatingAngle, setRotatingAngle] = useState<number | null>(null);
  const [penPoints, setPenPoints] = useState<PathPoint[]>([]);
  const [minimapOpen, setMinimapOpen] = useState(true);
  const [measureToggle, setMeasureToggle] = useState(false);
  const [isDragOverFile, setIsDragOverFile] = useState(false);
  const [pitch3D, setPitch3D] = useState(48);
  const [yaw3D, setYaw3D] = useState(-24);
  const [spread3D, setSpread3D] = useState(14);
  const [hovered3DLayer, setHovered3DLayer] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);

  const interactionRef = useRef<InteractionState>({ kind: 'idle' });
  const latestNodesRef = useRef<CanvasNode[]>(doc.nodes);
  latestNodesRef.current = doc.nodes;

  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const penPointsRef = useRef<PathPoint[]>(penPoints);
  penPointsRef.current = penPoints;

  const artboards = useMemo(() => getDocumentArtboards(doc), [doc]);
  const activeBoard = useMemo(
    () => artboards.find((a) => a.id === activeArtboardId) ?? doc.artboard,
    [artboards, activeArtboardId, doc.artboard],
  );

  const resolveBoardAtPoint = useCallback(
    (pt: Point): string => {
      for (const b of artboards) {
        if (
          pt.x >= b.x &&
          pt.x <= b.x + b.width &&
          pt.y >= b.y &&
          pt.y <= b.y + b.height
        ) {
          return b.id;
        }
      }
      return activeBoard.id;
    },
    [artboards, activeBoard.id],
  );

  const finishPenPath = useCallback(() => {
    const pts = penPointsRef.current;
    if (pts.length >= 2) {
      const boardId = resolveBoardAtPoint(pts[0]);
      const created = createPathNodeFromPoints(pts, doc.tokens, boardId);
      onCommitNodes([...latestNodesRef.current, created]);
      onSelectIds([created.id]);
    }
    setPenPoints([]);
    onSelectTool('select');
  }, [doc.tokens, onCommitNodes, onSelectIds, onSelectTool, resolveBoardAtPoint]);

  useEffect(() => {
    if (activeTool !== 'pen' && penPointsRef.current.length > 0) {
      setPenPoints([]);
    }
  }, [activeTool]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) setContextMenu(null);
        if (penPointsRef.current.length > 0) {
          setPenPoints([]);
          onSelectTool('select');
        }
      } else if (e.key === 'Enter' && activeTool === 'pen' && penPointsRef.current.length >= 2) {
        e.preventDefault();
        finishPenPath();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTool, contextMenu, finishPenPath, onSelectTool]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [contextMenu]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
      setStageSize(next);
      onStageResize(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onStageResize]);

  const getStageOrigin = useCallback((): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top } : { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (stack3D) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) >= 4) {
        const factor = e.deltaY < 0 ? 1.09 : 0.92;
        onViewportChange(
          zoomAtPoint(viewportRef.current, viewportRef.current.zoom * factor, anchor),
        );
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [onViewportChange, stack3D]);

  const selectedNodes = useMemo(
    () => doc.nodes.filter((n) => selectedIds.includes(n.id)),
    [doc.nodes, selectedIds],
  );
  const primarySelected = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const selectionBounds = useMemo(
    () => getSelectionBounds(selectedNodes),
    [selectedNodes],
  );

  // Global pointermove / pointerup
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const origin = getStageOrigin();
      const ptCanvas = screenToCanvas(
        { x: e.clientX, y: e.clientY },
        origin,
        viewportRef.current,
      );
      setPointerCanvas({ x: Math.round(ptCanvas.x), y: Math.round(ptCanvas.y) });

      const interaction = interactionRef.current;
      if (interaction.kind === 'idle') return;

      if (interaction.kind === 'orbit3d') {
        const dx = e.clientX - interaction.startScreen.x;
        const dy = e.clientY - interaction.startScreen.y;
        setYaw3D(Math.max(-65, Math.min(65, Math.round(interaction.startYaw + dx * 0.28))));
        setPitch3D(Math.max(15, Math.min(72, Math.round(interaction.startPitch - dy * 0.25))));
        return;
      }

      if (interaction.kind === 'pan') {
        const dx = e.clientX - interaction.startScreen.x;
        const dy = e.clientY - interaction.startScreen.y;
        onViewportChange({
          ...interaction.startViewport,
          x: Math.round(interaction.startViewport.x + dx),
          y: Math.round(interaction.startViewport.y + dy),
        });
        return;
      }

      if (interaction.kind === 'move') {
        const dx = ptCanvas.x - interaction.startCanvas.x;
        const dy = ptCanvas.y - interaction.startCanvas.y;

        let adjustedDx = dx;
        let adjustedDy = dy;

        if (interaction.movedIds.length === 1) {
          const movedId = interaction.movedIds[0];
          const init = interaction.initialNodes.get(movedId);
          const targetNode = interaction.baseNodes.find((n) => n.id === movedId);
          if (init && targetNode) {
            const parentBoard = resolveParentArtboard(targetNode, doc);
            const candidate: Bounds = {
              x: init.x + dx,
              y: init.y + dy,
              width: targetNode.width,
              height: targetNode.height,
            };
            const siblings = interaction.baseNodes
              .filter(
                (n) =>
                  n.id !== movedId &&
                  n.visible &&
                  (n.artboardId ?? doc.artboard.id) === parentBoard.id,
              )
              .map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height }));
            const snap = computeSnap(
              candidate,
              siblings,
              {
                x: parentBoard.x,
                y: parentBoard.y,
                width: parentBoard.width,
                height: parentBoard.height,
              },
              {
                threshold: 6,
                gridSize: snapToGrid8px ? 8 : 0,
                smartGuidesEnabled,
              },
            );
            adjustedDx = snap.x - init.x;
            adjustedDy = snap.y - init.y;
            setSnapGuides(snap.guides);
          }
        } else {
          setSnapGuides([]);
        }

        const nextNodes = interaction.baseNodes.map((node) => {
          const init = interaction.initialNodes.get(node.id);
          if (!init) return node;
          return {
            ...node,
            x: Math.round(init.x + adjustedDx),
            y: Math.round(init.y + adjustedDy),
          };
        });
        onLiveUpdateNodes(nextNodes);
        return;
      }

      if (interaction.kind === 'resize') {
        const dx = ptCanvas.x - interaction.startCanvas.x;
        const dy = ptCanvas.y - interaction.startCanvas.y;
        const r = interaction.initialRect;
        let x = r.x;
        let y = r.y;
        let width = r.width;
        let height = r.height;
        const minW = 16;
        const minH = 2;

        if (interaction.handle.includes('e')) width = Math.max(minW, r.width + dx);
        if (interaction.handle.includes('s')) height = Math.max(minH, r.height + dy);
        if (interaction.handle.includes('w')) {
          const nextW = Math.max(minW, r.width - dx);
          x = r.x + (r.width - nextW);
          width = nextW;
        }
        if (interaction.handle.includes('n')) {
          const nextH = Math.max(minH, r.height - dy);
          y = r.y + (r.height - nextH);
          height = nextH;
        }

        const nextNodes = interaction.baseNodes.map((n) => {
          if (n.id !== interaction.nodeId) return n;
          const roundedW = Math.round(width);
          const roundedH = Math.round(height);
          return {
            ...n,
            x: Math.round(x),
            y: Math.round(y),
            width: roundedW,
            height: roundedH,
            pathData:
              n.pathData && interaction.initialPathPoints
                ? {
                    ...n.pathData,
                    points: scalePathPoints(
                      interaction.initialPathPoints,
                      r.width,
                      r.height,
                      roundedW,
                      roundedH,
                    ),
                  }
                : n.pathData,
          };
        });
        onLiveUpdateNodes(nextNodes);
        return;
      }

      if (interaction.kind === 'rotate') {
        const angleRad = Math.atan2(
          ptCanvas.y - interaction.center.y,
          ptCanvas.x - interaction.center.x,
        );
        let deg =
          interaction.initialRotation +
          ((angleRad - interaction.startAngle) * 180) / Math.PI;
        deg = e.shiftKey ? Math.round(deg / 15) * 15 : Math.round(deg);
        const normalized = ((deg % 360) + 360) % 360;
        setRotatingAngle(normalized);
        const nextNodes = interaction.baseNodes.map((n) =>
          n.id === interaction.nodeId ? { ...n, rotation: normalized } : n,
        );
        onLiveUpdateNodes(nextNodes);
        return;
      }

      if (interaction.kind === 'marquee') {
        interaction.currentCanvas = ptCanvas;
        const box: Bounds = {
          x: Math.min(interaction.startCanvas.x, ptCanvas.x),
          y: Math.min(interaction.startCanvas.y, ptCanvas.y),
          width: Math.abs(ptCanvas.x - interaction.startCanvas.x),
          height: Math.abs(ptCanvas.y - interaction.startCanvas.y),
        };
        setMarqueeBox(box);
        const hits = doc.nodes
          .filter(
            (n) =>
              n.visible &&
              !n.locked &&
              boundsIntersect(box, {
                x: n.x,
                y: n.y,
                width: n.width,
                height: n.height,
              }),
          )
          .map((n) => n.id);
        onSelectIds(hits);
        return;
      }

      if (interaction.kind === 'draw') {
        interaction.currentCanvas = ptCanvas;
        setDrawBox({
          x: Math.min(interaction.startCanvas.x, ptCanvas.x),
          y: Math.min(interaction.startCanvas.y, ptCanvas.y),
          width: Math.abs(ptCanvas.x - interaction.startCanvas.x),
          height: Math.abs(ptCanvas.y - interaction.startCanvas.y),
        });
      }
    };

    const handlePointerUp = () => {
      const interaction = interactionRef.current;
      if (interaction.kind === 'idle') return;

      if (
        interaction.kind === 'move' ||
        interaction.kind === 'resize' ||
        interaction.kind === 'rotate'
      ) {
        onCommitNodes(latestNodesRef.current);
      }

      if (interaction.kind === 'draw') {
        const w = Math.abs(interaction.currentCanvas.x - interaction.startCanvas.x);
        const h = Math.abs(interaction.currentCanvas.y - interaction.startCanvas.y);
        const x = Math.min(interaction.startCanvas.x, interaction.currentCanvas.x);
        const y = Math.min(interaction.startCanvas.y, interaction.currentCanvas.y);
        const isClick = w < 10 && h < 10;
        const created = createNodeFromTool(
          interaction.tool,
          isClick ? interaction.startCanvas.x - 60 : x,
          isClick ? interaction.startCanvas.y - 30 : y,
          isClick ? 0 : w,
          isClick ? 0 : h,
          doc.tokens,
          interaction.artboardId,
        );
        onCommitNodes([...latestNodesRef.current, created]);
        onSelectIds([created.id]);
        onSelectTool('select');
      }

      interactionRef.current = { kind: 'idle' };
      setSnapGuides([]);
      setMarqueeBox(null);
      setDrawBox(null);
      setRotatingAngle(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    doc,
    getStageOrigin,
    onCommitNodes,
    onLiveUpdateNodes,
    onSelectIds,
    onSelectTool,
    onViewportChange,
    smartGuidesEnabled,
    snapToGrid8px,
  ]);

  const handlePenClick = (ptCanvas: Point, detail: number) => {
    const nextPt = { x: Math.round(ptCanvas.x), y: Math.round(ptCanvas.y) };
    if (detail >= 2 && penPointsRef.current.length >= 2) {
      finishPenPath();
      return;
    }
    setPenPoints((prev) => [...prev, nextPt]);
  };

  const beginMoveGroup = (ptCanvas: Point, idsToMove: string[]) => {
    const movableIds = idsToMove.filter((id) => {
      const found = doc.nodes.find((n) => n.id === id);
      return found && !found.locked;
    });
    if (movableIds.length === 0) return;
    const initialMap = new Map<string, { x: number; y: number }>();
    for (const id of movableIds) {
      const found = doc.nodes.find((n) => n.id === id);
      if (found) initialMap.set(id, { x: found.x, y: found.y });
    }
    interactionRef.current = {
      kind: 'move',
      startCanvas: ptCanvas,
      initialNodes: initialMap,
      baseNodes: doc.nodes,
      movedIds: movableIds,
    };
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stack3D) {
      if (e.button === 0) {
        interactionRef.current = {
          kind: 'orbit3d',
          startScreen: { x: e.clientX, y: e.clientY },
          startPitch: pitch3D,
          startYaw: yaw3D,
        };
      }
      return;
    }

    if (contextMenu) setContextMenu(null);
    if (editingNodeId) commitInlineText();

    const origin = getStageOrigin();
    const ptCanvas = screenToCanvas(
      { x: e.clientX, y: e.clientY },
      origin,
      viewport,
    );

    if (activeTool === 'hand' || spacePressed || e.button === 1) {
      e.preventDefault();
      interactionRef.current = {
        kind: 'pan',
        startScreen: { x: e.clientX, y: e.clientY },
        startViewport: { ...viewport },
      };
      return;
    }

    if (e.button !== 0) return;

    const boardHit = resolveBoardAtPoint(ptCanvas);
    onSelectArtboard(boardHit);

    if (activeTool === 'pen' && uiMode === 'design') {
      handlePenClick(ptCanvas, e.detail);
      return;
    }

    if (activeTool !== 'select' && activeTool !== 'pen' && uiMode === 'design') {
      interactionRef.current = {
        kind: 'draw',
        tool: activeTool,
        startCanvas: ptCanvas,
        currentCanvas: ptCanvas,
        artboardId: boardHit,
      };
      setDrawBox({ x: ptCanvas.x, y: ptCanvas.y, width: 1, height: 1 });
      return;
    }

    onSelectIds([]);
    if (uiMode === 'design') {
      interactionRef.current = {
        kind: 'marquee',
        startCanvas: ptCanvas,
        currentCanvas: ptCanvas,
      };
    }
  };

  const handleNodePointerDown = (e: React.PointerEvent, node: CanvasNode) => {
    e.stopPropagation();
    if (contextMenu) setContextMenu(null);

    if (activeTool === 'hand' || spacePressed || e.button === 1) {
      interactionRef.current = {
        kind: 'pan',
        startScreen: { x: e.clientX, y: e.clientY },
        startViewport: { ...viewport },
      };
      return;
    }
    if (e.button !== 0) return;

    const origin = getStageOrigin();
    const ptCanvas = screenToCanvas(
      { x: e.clientX, y: e.clientY },
      origin,
      viewport,
    );
    const parentBoardId = node.artboardId ?? doc.artboard.id;
    onSelectArtboard(parentBoardId);

    if (activeTool === 'pen' && uiMode === 'design') {
      handlePenClick(ptCanvas, e.detail);
      return;
    }

    if (activeTool !== 'select' && activeTool !== 'pen' && uiMode === 'design') {
      interactionRef.current = {
        kind: 'draw',
        tool: activeTool,
        startCanvas: ptCanvas,
        currentCanvas: ptCanvas,
        artboardId: parentBoardId,
      };
      setDrawBox({ x: ptCanvas.x, y: ptCanvas.y, width: 1, height: 1 });
      return;
    }

    let nextSelected: string[];
    if (e.shiftKey) {
      nextSelected = selectedIds.includes(node.id)
        ? selectedIds.filter((id) => id !== node.id)
        : [...selectedIds, node.id];
    } else if (selectedIds.includes(node.id)) {
      nextSelected = selectedIds;
    } else {
      nextSelected = [node.id];
    }
    onSelectIds(nextSelected);

    if (uiMode !== 'design' || node.locked) return;
    beginMoveGroup(ptCanvas, nextSelected);
  };

  const handleNodeContextMenu = (e: React.MouseEvent, node: CanvasNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(node.id)) {
      onSelectIds([node.id]);
    }
    const origin = getStageOrigin();
    const localX = Math.min(stageSize.width - 210, Math.max(30, e.clientX - origin.x));
    const localY = Math.min(stageSize.height - 290, Math.max(30, e.clientY - origin.y));
    setContextMenu({ x: localX, y: localY, nodeId: node.id });
  };

  const startResize = (
    e: React.PointerEvent,
    handle: ResizeHandle,
    node: CanvasNode,
  ) => {
    e.stopPropagation();
    if (node.locked || uiMode !== 'design') return;
    const origin = getStageOrigin();
    const ptCanvas = screenToCanvas(
      { x: e.clientX, y: e.clientY },
      origin,
      viewport,
    );
    interactionRef.current = {
      kind: 'resize',
      handle,
      nodeId: node.id,
      startCanvas: ptCanvas,
      initialRect: {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      },
      initialPathPoints: node.pathData?.points,
      baseNodes: doc.nodes,
    };
  };

  const startRotate = (e: React.PointerEvent, node: CanvasNode) => {
    e.stopPropagation();
    if (node.locked || uiMode !== 'design') return;
    const origin = getStageOrigin();
    const ptCanvas = screenToCanvas(
      { x: e.clientX, y: e.clientY },
      origin,
      viewport,
    );
    const center = { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    const startAngle = Math.atan2(ptCanvas.y - center.y, ptCanvas.x - center.x);
    interactionRef.current = {
      kind: 'rotate',
      nodeId: node.id,
      center,
      startAngle,
      initialRotation: node.rotation,
      baseNodes: doc.nodes,
    };
  };

  const startInlineText = (node: CanvasNode) => {
    if (uiMode !== 'design' || node.locked) return;
    if (node.type !== 'text' && node.type !== 'button') return;
    setEditingNodeId(node.id);
    setEditingDraft(node.text ?? '');
  };

  const commitInlineText = () => {
    if (!editingNodeId) return;
    const nextNodes = doc.nodes.map((n) =>
      n.id === editingNodeId ? { ...n, text: editingDraft } : n,
    );
    onCommitNodes(nextNodes);
    setEditingNodeId(null);
  };

  // Drag & Drop local photos directly onto canvas
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsDragOverFile(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOverFile(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverFile(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith('image/'),
    );
    if (!file) return;
    const origin = getStageOrigin();
    const ptCanvas = screenToCanvas(
      { x: e.clientX, y: e.clientY },
      origin,
      viewport,
    );
    const boardId = resolveBoardAtPoint(ptCanvas);
    onDropLocalImage(file, ptCanvas, boardId);
  };

  const topTicks = useMemo(
    () =>
      getRulerTicks(
        viewport.x - RULER_SIZE,
        viewport.zoom,
        Math.max(0, stageSize.width - RULER_SIZE),
      ),
    [viewport.x, viewport.zoom, stageSize.width],
  );
  const leftTicks = useMemo(
    () =>
      getRulerTicks(
        viewport.y - RULER_SIZE,
        viewport.zoom,
        Math.max(0, stageSize.height - RULER_SIZE),
      ),
    [viewport.y, viewport.zoom, stageSize.height],
  );

  // Dev Mode redlines
  const devInspectNode = useMemo(() => {
    if (uiMode !== 'dev') return null;
    if (primarySelected) return primarySelected;
    if (hoveredId) return doc.nodes.find((n) => n.id === hoveredId) ?? null;
    return null;
  }, [uiMode, primarySelected, hoveredId, doc.nodes]);

  const devInspectBoard = useMemo(
    () => (devInspectNode ? resolveParentArtboard(devInspectNode, doc) : null),
    [devInspectNode, doc],
  );

  const devRedlines = useMemo(() => {
    if (!devInspectNode || !devInspectBoard) return null;
    return computeRedlineMeasurements(devInspectNode, devInspectBoard);
  }, [devInspectNode, devInspectBoard]);

  // Alt-Hover / Measure Mode Inter-Node Spacing Redlines
  const measureActive = altPressed || measureToggle;
  const altMeasureSegments = useMemo(() => {
    if (!measureActive || !selectionBounds || !hoveredId) return [];
    if (selectedIds.includes(hoveredId)) return [];
    const target = doc.nodes.find((n) => n.id === hoveredId);
    if (!target || !target.visible) return [];
    return computeInterNodeMeasurements(selectionBounds, {
      x: target.x,
      y: target.y,
      width: target.width,
      height: target.height,
    });
  }, [measureActive, selectionBounds, hoveredId, selectedIds, doc.nodes]);

  // Multi-artboard Prototype Flow Noodles (spanning across artboards OR targeting layers)
  const prototypeNoodles = useMemo(() => {
    if (uiMode !== 'prototype') return [];
    const connectors: Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      label: string;
      color: string;
    }> = [];

    for (const src of doc.nodes) {
      if (!src.visible || !src.prototype) continue;
      if (
        (src.prototype.clickAction === 'navigate_artboard' ||
          src.prototype.clickAction === 'smart_animate' ||
          src.prototype.clickAction === 'modal_overlay') &&
        src.prototype.targetArtboardId
      ) {
        const dstBoard = artboards.find(
          (b) => b.id === src.prototype?.targetArtboardId,
        );
        if (dstBoard) {
          const goingRight = dstBoard.x >= src.x;
          const isModal = src.prototype.clickAction === 'modal_overlay';
          const isSmart =
            src.prototype.clickAction === 'smart_animate' ||
            src.prototype.transition === 'smart-animate';
          connectors.push({
            id: `nav-${src.id}->${dstBoard.id}`,
            x1: goingRight ? src.x + src.width : src.x,
            y1: src.y + src.height / 2,
            x2: goingRight ? dstBoard.x : dstBoard.x + dstBoard.width,
            y2: goingRight
              ? dstBoard.y + dstBoard.height * (isModal ? 0.68 : 0.36)
              : dstBoard.y + 52,
            label: isModal
              ? 'Modal Overlay'
              : isSmart
                ? 'Smart Animate'
                : (src.prototype.transition ?? 'Navigate To'),
            color: isModal ? '#A78BFA' : isSmart ? '#06B6D4' : '#10B981',
          });
        }
      } else if (
        src.prototype.clickAction === 'pulse-target' &&
        src.prototype.clickPayload
      ) {
        const dst = doc.nodes.find((n) => n.id === src.prototype?.clickPayload);
        if (dst && dst.visible) {
          connectors.push({
            id: `pulse-${src.id}->${dst.id}`,
            x1: src.x + src.width,
            y1: src.y + src.height / 2,
            x2: dst.x,
            y2: dst.y + dst.height / 2,
            label: 'pulse',
            color: '#06B6D4',
          });
        }
      }
    }
    return connectors;
  }, [artboards, doc.nodes, uiMode]);

  const gridSpacing = Math.max(12, 24 * viewport.zoom);
  const cursorStyle = stack3D
    ? 'grab'
    : activeTool === 'hand' || spacePressed
      ? 'grab'
      : activeTool !== 'select' && uiMode === 'design'
        ? 'crosshair'
        : 'default';

  const handlePositions: Array<{ id: ResizeHandle; x: number; y: number; cursor: string }> =
    primarySelected
      ? [
          { id: 'nw', x: primarySelected.x, y: primarySelected.y, cursor: 'nwse-resize' },
          { id: 'n', x: primarySelected.x + primarySelected.width / 2, y: primarySelected.y, cursor: 'ns-resize' },
          { id: 'ne', x: primarySelected.x + primarySelected.width, y: primarySelected.y, cursor: 'nesw-resize' },
          { id: 'e', x: primarySelected.x + primarySelected.width, y: primarySelected.y + primarySelected.height / 2, cursor: 'ew-resize' },
          { id: 'se', x: primarySelected.x + primarySelected.width, y: primarySelected.y + primarySelected.height, cursor: 'nwse-resize' },
          { id: 's', x: primarySelected.x + primarySelected.width / 2, y: primarySelected.y + primarySelected.height, cursor: 'ns-resize' },
          { id: 'sw', x: primarySelected.x, y: primarySelected.y + primarySelected.height, cursor: 'nesw-resize' },
          { id: 'w', x: primarySelected.x, y: primarySelected.y + primarySelected.height / 2, cursor: 'ew-resize' },
        ]
      : [];

  // Multi-artboard Minimap union geometry
  const worldBounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const b of artboards) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }, [artboards]);

  const miniW = 166;
  const miniH = 104;
  const miniScale = Math.min(
    (miniW - 20) / worldBounds.width,
    (miniH - 18) / worldBounds.height,
  );
  const miniOffsetX = (miniW - worldBounds.width * miniScale) / 2 - worldBounds.x * miniScale;
  const miniOffsetY = (miniH - worldBounds.height * miniScale) / 2 - worldBounds.y * miniScale;

  const lensCanvasX = -viewport.x / viewport.zoom;
  const lensCanvasY = -viewport.y / viewport.zoom;
  const lensCanvasW = stageSize.width / viewport.zoom;
  const lensCanvasH = stageSize.height / viewport.zoom;

  const panFromMinimapEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const targetCanvasX = (mx - miniOffsetX) / miniScale;
    const targetCanvasY = (my - miniOffsetY) / miniScale;
    onViewportChange({
      ...viewport,
      x: Math.round(stageSize.width / 2 - targetCanvasX * viewport.zoom),
      y: Math.round(stageSize.height / 2 - targetCanvasY * viewport.zoom),
    });
  };

  const contextNode = contextMenu
    ? doc.nodes.find((n) => n.id === contextMenu.nodeId) ?? null
    : null;

  const accentBorderColor =
    uiMode === 'dev'
      ? '#06B6D4'
      : uiMode === 'prototype'
        ? '#10B981'
        : '#6366F1';

  const renderNodeElement = (
    node: CanvasNode,
    boardX: number,
    boardY: number,
    is3D = false,
    depthIndex = 0,
  ) => {
    const style = resolveNodeStyle(node, doc.tokens);
    const isSelected = selectedIds.includes(node.id);
    const isHovered = hoveredId === node.id;
    const isEditing = !is3D && editingNodeId === node.id;
    const semanticTier =
      node.type === 'ellipse' && node.opacity < 0.5
        ? 0.5
        : node.type === 'glass' || node.type === 'frame'
          ? 1.5
          : node.type === 'rect' || node.type === 'line' || node.type === 'path'
            ? 2.6
            : node.type === 'image' || node.type === 'button'
              ? 3.7
              : 4.6;
    const zElevation = is3D
      ? Math.round(semanticTier * spread3D * 1.9 + (depthIndex % 3) * 2)
      : 0;

    const transform3D = is3D
      ? `translateZ(${zElevation}px)${node.rotation !== 0 ? ` rotate(${node.rotation}deg)` : ''}`
      : node.rotation !== 0
        ? `rotate(${node.rotation}deg)`
        : undefined;

    if (node.type === 'image') {
      const filterCss = buildImageFilterCss(node.imageFilter);
      return (
        <div
          key={node.id}
          data-testid={`canvas-node-${node.id}`}
          data-node-type="image"
          onPointerDown={is3D ? undefined : (e) => handleNodePointerDown(e, node)}
          onContextMenu={is3D ? undefined : (e) => handleNodeContextMenu(e, node)}
          onPointerEnter={() => (is3D ? setHovered3DLayer(node.name) : setHoveredId(node.id))}
          onPointerLeave={() =>
            is3D
              ? setHovered3DLayer(null)
              : setHoveredId((prev) => (prev === node.id ? null : prev))
          }
          className="absolute overflow-hidden"
          style={{
            left: node.x - boardX,
            top: node.y - boardY,
            width: node.width,
            height: node.height,
            transform: transform3D,
            borderRadius: style.radius,
            opacity: node.opacity,
            border:
              node.strokeWidth > 0
                ? `${node.strokeWidth}px solid ${style.strokeColor}`
                : is3D
                  ? '1px solid rgba(6, 182, 212, 0.5)'
                  : undefined,
            boxShadow: is3D
              ? '0 18px 40px rgba(0,0,0,0.45)'
              : style.boxShadow !== 'none'
                ? style.boxShadow
                : undefined,
            outline:
              !is3D && !isSelected && isHovered
                ? `${1.25 / viewport.zoom}px solid ${accentBorderColor}`
                : undefined,
            cursor: !is3D && activeTool === 'select' ? 'move' : undefined,
          }}
        >
          <img
            src={node.imageSrc}
            alt={node.name}
            draggable={false}
            className="w-full h-full pointer-events-none select-none"
            style={{
              objectFit: node.objectFit ?? 'cover',
              filter: filterCss,
            }}
          />
        </div>
      );
    }

    if (node.type === 'path' && node.pathData) {
      const d = buildSvgPathData(
        node.pathData.points,
        node.pathData.smooth !== false,
        Boolean(node.pathData.closed),
      );
      const dash =
        node.pathData.dashStyle === 'dashed'
          ? '8 6'
          : node.pathData.dashStyle === 'dotted'
            ? '2 6'
            : undefined;
      const markerId = `arrow-${node.id.replace(/[^a-zA-Z0-9]/g, '')}`;
      return (
        <div
          key={node.id}
          data-testid={`canvas-node-${node.id}`}
          data-node-type="path"
          onPointerDown={is3D ? undefined : (e) => handleNodePointerDown(e, node)}
          onContextMenu={is3D ? undefined : (e) => handleNodeContextMenu(e, node)}
          onPointerEnter={() => (is3D ? setHovered3DLayer(node.name) : setHoveredId(node.id))}
          onPointerLeave={() =>
            is3D
              ? setHovered3DLayer(null)
              : setHoveredId((prev) => (prev === node.id ? null : prev))
          }
          className="absolute"
          style={{
            left: node.x - boardX,
            top: node.y - boardY,
            width: node.width,
            height: node.height,
            opacity: node.opacity,
            transform: transform3D,
            outline:
              !is3D && !isSelected && isHovered
                ? `${1.25 / viewport.zoom}px dashed ${accentBorderColor}`
                : undefined,
            cursor: !is3D && activeTool === 'select' ? 'move' : undefined,
          }}
        >
          <svg
            viewBox={`0 0 ${node.width} ${node.height}`}
            className="w-full h-full overflow-visible pointer-events-none"
            fill="none"
            style={{
              filter: node.pathData.glow
                ? `drop-shadow(0 0 8px ${style.strokeColor})`
                : undefined,
            }}
          >
            {node.pathData.endArrow && (
              <defs>
                <marker
                  id={markerId}
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 1 1 L 9 5 L 1 9 z" fill={style.strokeColor} />
                </marker>
              </defs>
            )}
            <path
              d={d}
              stroke={style.strokeColor}
              strokeWidth={Math.max(1.5, node.strokeWidth || 2.5)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dash}
              markerEnd={node.pathData.endArrow ? `url(#${markerId})` : undefined}
            />
          </svg>
        </div>
      );
    }

    return (
      <div
        key={node.id}
        data-testid={`canvas-node-${node.id}`}
        data-node-type={node.type}
        onPointerDown={is3D ? undefined : (e) => handleNodePointerDown(e, node)}
        onContextMenu={is3D ? undefined : (e) => handleNodeContextMenu(e, node)}
        onDoubleClick={
          is3D
            ? undefined
            : (e) => {
                e.stopPropagation();
                startInlineText(node);
              }
        }
        onPointerEnter={() => (is3D ? setHovered3DLayer(node.name) : setHoveredId(node.id))}
        onPointerLeave={() =>
          is3D
            ? setHovered3DLayer(null)
            : setHoveredId((prev) => (prev === node.id ? null : prev))
        }
        className="absolute"
        style={{
          left: node.x - boardX,
          top: node.y - boardY,
          width: node.width,
          height: node.height,
          transform: transform3D,
          borderRadius: style.radius,
          opacity: node.opacity,
          background: node.type === 'text' ? 'transparent' : style.cssBackground,
          border:
            node.strokeWidth > 0
              ? `${node.strokeWidth}px solid ${style.strokeColor}`
              : is3D && node.type !== 'text'
                ? '1px solid rgba(99, 102, 241, 0.35)'
                : undefined,
          backdropFilter: !is3D && node.blur > 0 ? `blur(${node.blur}px)` : undefined,
          WebkitBackdropFilter:
            !is3D && node.blur > 0 ? `blur(${node.blur}px)` : undefined,
          boxShadow: is3D
            ? node.type === 'text'
              ? undefined
              : '0 14px 28px rgba(0,0,0,0.42)'
            : style.boxShadow !== 'none'
              ? style.boxShadow
              : undefined,
          mixBlendMode: is3D ? undefined : node.blendMode,
          display: node.type === 'button' || node.type === 'text' ? 'flex' : undefined,
          alignItems: node.type === 'button' ? 'center' : 'flex-start',
          justifyContent:
            node.type === 'button'
              ? 'center'
              : node.textAlign === 'center'
                ? 'center'
                : node.textAlign === 'right'
                  ? 'flex-end'
                  : 'flex-start',
          outline:
            !is3D && !isSelected && isHovered
              ? `${1.25 / viewport.zoom}px solid ${accentBorderColor}`
              : undefined,
          cursor:
            !is3D && activeTool === 'select'
              ? uiMode !== 'design'
                ? 'pointer'
                : node.locked
                  ? 'not-allowed'
                  : 'move'
              : undefined,
        }}
      >
        {(node.type === 'text' || node.type === 'button') &&
          (isEditing ? (
            <textarea
              autoFocus
              value={editingDraft}
              onChange={(e) => setEditingDraft(e.target.value)}
              onBlur={commitInlineText}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
                  e.preventDefault();
                  commitInlineText();
                }
              }}
              className="w-full h-full bg-transparent outline-none resize-none overflow-hidden"
              style={{
                color: style.textColor,
                fontFamily: node.fontFamily ?? 'Inter',
                fontWeight: node.fontWeight ?? 500,
                fontSize: node.fontSize ?? 14,
                letterSpacing: node.letterSpacing ?? 0,
                lineHeight: node.lineHeight ?? 1.25,
                textAlign: node.textAlign ?? 'left',
              }}
            />
          ) : (
            <span
              className="w-full pointer-events-none"
              style={{
                color: style.textColor,
                fontFamily: node.fontFamily ?? 'Inter',
                fontWeight: node.fontWeight ?? 500,
                fontSize: node.fontSize ?? 14,
                letterSpacing: node.letterSpacing ?? 0,
                lineHeight: node.lineHeight ?? 1.25,
                textAlign: node.textAlign ?? 'left',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {node.text}
            </span>
          ))}
      </div>
    );
  };

  const activeBoardNodes = useMemo(
    () => getNodesForArtboard(doc, activeBoard.id).filter((n) => n.visible),
    [doc, activeBoard.id],
  );
  const activeBoardBg = useMemo(
    () => resolveArtboardBackground(activeBoard, doc.tokens),
    [activeBoard, doc.tokens],
  );
  const scale3D = Math.min(
    (stageSize.width - 220) / Math.max(1, activeBoard.width),
    (stageSize.height - 200) / Math.max(1, activeBoard.height),
    0.78,
  );

  return (
    <div
      ref={stageRef}
      data-testid="canvas-stage"
      onPointerDown={handleStagePointerDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 relative overflow-hidden select-none"
      style={{
        cursor: cursorStyle,
        backgroundColor: 'var(--studio-canvas)',
        backgroundImage:
          'radial-gradient(circle, var(--studio-grid-dot) 1px, transparent 1px)',
        backgroundSize: `${gridSpacing}px ${gridSpacing}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
    >
      {/* Top-Left Floating Responsive Breakpoint & Grid HUD */}
      <div
        data-testid="responsive-viewport-toolbar"
        onPointerDown={(e) => e.stopPropagation()}
        className="hidden sm:flex absolute top-8 left-8 z-30 items-center gap-1 p-0.5 rounded-lg border backdrop-blur-md shadow-lg"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--studio-surface) 92%, transparent)',
          borderColor: 'var(--studio-border-strong)',
        }}
      >
        {BREAKPOINT_PRESETS.map((bp) => {
          const isActive = breakpoint === bp.id;
          const Icon =
            bp.id === 'desktop'
              ? Monitor
              : bp.id === 'tablet'
                ? Tablet
                : bp.id === 'mobile'
                  ? Smartphone
                  : Maximize2;
          return (
            <button
              key={bp.id}
              type="button"
              data-testid={`bp-${bp.id}`}
              onClick={() => onSelectBreakpoint(bp.id)}
              title={bp.description}
              className="h-6 px-2 rounded-md font-mono-tech text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
              style={{
                backgroundColor: isActive ? 'var(--studio-accent)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--studio-text-secondary)',
              }}
            >
              <Icon size={11} strokeWidth={1.7} />
              <span className="hidden 2xl:inline">{bp.label}</span>
              <span className="2xl:hidden">
                {bp.width ? `${bp.width}px` : 'Fluid'}
              </span>
            </button>
          );
        })}

        <div
          className="w-px h-3.5 mx-0.5"
          style={{ backgroundColor: 'var(--studio-border-strong)' }}
        />

        <button
          type="button"
          data-testid="btn-toggle-smart-guides"
          onClick={onToggleSmartGuides}
          title="Toggle Visual Smart Snap Guides"
          className="h-6 px-2 rounded-md font-mono-tech text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
          style={{
            backgroundColor: smartGuidesEnabled
              ? 'rgba(244, 63, 94, 0.18)'
              : 'transparent',
            color: smartGuidesEnabled ? '#FB7185' : 'var(--studio-text-muted)',
          }}
        >
          <Magnet size={11} strokeWidth={1.7} />
          <span className="hidden xl:inline">{labels.smartGuidesBtn}</span>
        </button>

        <button
          type="button"
          data-testid="btn-toggle-grid-8px"
          onClick={onToggleSnapToGrid8px}
          title="Toggle Snap-to-8px Baseline Grid"
          className="h-6 px-2 rounded-md font-mono-tech text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
          style={{
            backgroundColor: snapToGrid8px
              ? 'rgba(6, 182, 212, 0.2)'
              : 'transparent',
            color: snapToGrid8px ? 'var(--studio-cyan)' : 'var(--studio-text-muted)',
          }}
        >
          <Grid3X3 size={11} strokeWidth={1.7} />
          <span className="hidden xl:inline">{labels.grid8pxBtn}</span>
        </button>
      </div>

      {/* Top-Right Floating Canvas HUD: Measure + 3D Stack */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-8 right-3 z-30 flex items-center gap-1.5"
      >
        <button
          type="button"
          data-testid="btn-toggle-measure"
          onClick={() => setMeasureToggle((v) => !v)}
          title="Measure distances between layers (or hold Alt while hovering)"
          className="h-7 px-2.5 rounded-lg border backdrop-blur-md font-mono-tech text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          style={{
            backgroundColor: measureActive
              ? 'rgba(244, 63, 94, 0.2)'
              : 'color-mix(in srgb, var(--studio-surface) 90%, transparent)',
            borderColor: measureActive
              ? 'rgba(244, 63, 94, 0.65)'
              : 'var(--studio-border-strong)',
            color: measureActive ? '#FB7185' : 'var(--studio-text-secondary)',
          }}
        >
          <Ruler size={11} />
          <span>{labels.measureBtn}</span>
        </button>

        <button
          type="button"
          data-testid="btn-toggle-3dstack"
          onClick={onToggleStack3D}
          title="3D Stack — Explode Z-index layers in interactive 3D space"
          className="h-7 px-2.5 rounded-lg border backdrop-blur-md font-mono-tech text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          style={{
            backgroundColor: stack3D
              ? 'rgba(99, 102, 241, 0.25)'
              : 'color-mix(in srgb, var(--studio-surface) 90%, transparent)',
            borderColor: stack3D
              ? '#6366F1'
              : 'var(--studio-border-strong)',
            color: stack3D ? '#C7D2FE' : 'var(--studio-text-secondary)',
            boxShadow: stack3D ? '0 0 18px rgba(99,102,241,0.35)' : undefined,
          }}
        >
          <Box size={11} />
          <span>{labels.stack3dBtn}</span>
        </button>
      </div>

      {/* Drag & Drop File Overlay */}
      {isDragOverFile && (
        <div className="absolute inset-4 z-50 rounded-2xl border-2 border-dashed border-cyan-400 bg-cyan-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="px-5 py-3 rounded-xl bg-[#0F131D] border border-cyan-400/50 flex items-center gap-2.5 text-cyan-200 font-display font-semibold text-sm shadow-2xl">
            <Upload size={16} />
            <span>Drop PNG / JPG / WebP Photo to Insert Layer</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE A: 3D STACK (2.5D Z-INDEX LAYER EXPLODE VIEW)             */}
      {/* ============================================================== */}
      {stack3D ? (
        <div
          data-testid="stack-3d-stage"
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{
            perspective: '1600px',
            background:
              'radial-gradient(circle at 50% 45%, rgba(99,102,241,0.14), transparent 62%)',
          }}
        >
          {/* Floating 3D Orbit Controls */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-18 right-3 z-40 w-56 rounded-xl border p-3 space-y-2.5 backdrop-blur-md shadow-2xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--studio-surface) 92%, transparent)',
              borderColor: 'var(--studio-border-strong)',
            }}
          >
            <div className="flex items-center justify-between font-mono-tech text-[10px]">
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--studio-cyan)' }}>
                <Layers size={11} />
                <span>Z-DEPTH EXPLODE</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setPitch3D(48);
                  setYaw3D(-24);
                  setSpread3D(14);
                }}
                title="Reset 3D Angle"
                className="p-1 rounded hover:bg-white/10 cursor-pointer"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <RotateCcw size={10} />
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between font-mono-tech text-[9px]" style={{ color: 'var(--studio-text-secondary)' }}>
                <span>Layer Spread</span>
                <span>{spread3D}px</span>
              </div>
              <input
                type="range"
                min={4}
                max={26}
                value={spread3D}
                onChange={(e) => setSpread3D(Number(e.target.value))}
                className="w-full studio-range"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono-tech text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
              <div className="px-2 py-1 rounded border" style={{ borderColor: 'var(--studio-border)' }}>
                PITCH {pitch3D}°
              </div>
              <div className="px-2 py-1 rounded border" style={{ borderColor: 'var(--studio-border)' }}>
                YAW {yaw3D}°
              </div>
            </div>
            <div className="text-[10px]" style={{ color: 'var(--studio-text-secondary)' }}>
              {hovered3DLayer
                ? `Inspecting: ${hovered3DLayer}`
                : `Drag canvas to orbit · ${activeBoardNodes.length} elevated layers`}
            </div>
          </div>

          {/* 3D Isometric Transformed Artboard Stack */}
          <div
            className="relative"
            style={{
              width: activeBoard.width,
              height: activeBoard.height,
              transformStyle: 'preserve-3d',
              transform: `scale(${scale3D}) rotateX(${pitch3D}deg) rotateZ(${yaw3D}deg)`,
              transition:
                interactionRef.current.kind === 'orbit3d'
                  ? 'none'
                  : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {/* Base Artboard Slab */}
            <div
              className="absolute inset-0"
              style={{
                borderRadius: activeBoard.radius,
                background: activeBoardBg.cssBackground,
                boxShadow:
                  '0 40px 100px rgba(0, 0, 0, 0.72), 0 0 0 1.5px rgba(99, 102, 241, 0.5)',
              }}
            />

            {/* Floating Z-Elevated Layers */}
            {activeBoardNodes.map((node, idx) =>
              renderNodeElement(node, activeBoard.x, activeBoard.y, true, idx),
            )}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* MODE B: INFINITE 2D PRECISION MULTI-ARTBOARD CANVAS            */
        /* ============================================================== */
        <>
          {/* Ruler Origin */}
          <div
            className="absolute top-0 left-0 z-30 border-r border-b flex items-center justify-center font-mono-tech text-[8px]"
            style={{
              width: RULER_SIZE,
              height: RULER_SIZE,
              backgroundColor: 'var(--studio-ruler-bg)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text-muted)',
            }}
          >
            PX
          </div>

          {/* Top Pixel Ruler */}
          <div
            className="absolute top-0 right-0 z-20 border-b overflow-hidden pointer-events-none"
            style={{
              left: RULER_SIZE,
              height: RULER_SIZE,
              backgroundColor: 'var(--studio-ruler-bg)',
              borderColor: 'var(--studio-border)',
            }}
          >
            {selectionBounds && (
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: selectionBounds.x * viewport.zoom + viewport.x - RULER_SIZE,
                  width: selectionBounds.width * viewport.zoom,
                  backgroundColor: 'rgba(99, 102, 241, 0.18)',
                  borderBottom: `2px solid ${accentBorderColor}`,
                }}
              />
            )}
            {topTicks.map((tick) => (
              <div
                key={`tx-${tick.canvasValue}`}
                className="absolute bottom-0"
                style={{ left: tick.screenPos }}
              >
                <div
                  style={{
                    width: 1,
                    height: tick.major ? 9 : 4,
                    backgroundColor: 'var(--studio-ruler-tick)',
                  }}
                />
                {tick.major && (
                  <span
                    className="absolute left-1 -top-3.5 font-mono-tech text-[9px] leading-none"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    {tick.canvasValue}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Left Pixel Ruler */}
          <div
            className="absolute bottom-0 left-0 z-20 border-r overflow-hidden pointer-events-none"
            style={{
              top: RULER_SIZE,
              width: RULER_SIZE,
              backgroundColor: 'var(--studio-ruler-bg)',
              borderColor: 'var(--studio-border)',
            }}
          >
            {selectionBounds && (
              <div
                className="absolute left-0 right-0"
                style={{
                  top: selectionBounds.y * viewport.zoom + viewport.y - RULER_SIZE,
                  height: selectionBounds.height * viewport.zoom,
                  backgroundColor: 'rgba(99, 102, 241, 0.18)',
                  borderRight: `2px solid ${accentBorderColor}`,
                }}
              />
            )}
            {leftTicks.map((tick) => (
              <div
                key={`ty-${tick.canvasValue}`}
                className="absolute right-0"
                style={{ top: tick.screenPos }}
              >
                <div
                  style={{
                    height: 1,
                    width: tick.major ? 9 : 4,
                    backgroundColor: 'var(--studio-ruler-tick)',
                  }}
                />
                {tick.major && (
                  <span
                    className="absolute -left-3.5 top-2.5 font-mono-tech text-[8px] leading-none origin-top-left -rotate-90"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    {tick.canvasValue}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Transformed Infinite World Layer */}
          <div
            className="absolute inset-0 origin-top-left"
            style={{
              transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`,
            }}
          >
            {/* Render ALL Artboards Side-by-Side */}
            {artboards.map((board, bIdx) => {
              const boardBg = resolveArtboardBackground(board, doc.tokens);
              const boardNodes = getNodesForArtboard(doc, board.id).filter(
                (n) => n.visible,
              );
              const isPrimaryActive = activeBoard.id === board.id;

              return (
                <div key={board.id}>
                  {/* Floating Artboard Header */}
                  <div
                    className="absolute flex items-center justify-between gap-2 pointer-events-none whitespace-nowrap"
                    style={{
                      left: board.x,
                      top: board.y - 28 / viewport.zoom,
                      width: board.width,
                      transformOrigin: 'bottom left',
                    }}
                  >
                    <span
                      className="font-mono-tech font-medium tracking-wide truncate"
                      style={{
                        fontSize: `${11 / viewport.zoom}px`,
                        color: isPrimaryActive
                          ? accentBorderColor
                          : 'var(--studio-text-muted)',
                      }}
                    >
                      {artboards.length > 1 ? `0${bIdx + 1} · ` : ''}
                      {board.name}
                    </span>
                    <span
                      className="font-mono-tech shrink-0"
                      style={{
                        fontSize: `${10 / viewport.zoom}px`,
                        color: 'var(--studio-text-muted)',
                      }}
                    >
                      {board.width}×{board.height}
                    </span>
                  </div>

                  {/* Artboard Frame */}
                  <div
                    data-testid={bIdx === 0 ? 'artboard-frame' : `artboard-frame-${board.id}`}
                    data-artboard-id={board.id}
                    className="absolute overflow-hidden"
                    style={{
                      left: board.x,
                      top: board.y,
                      width: board.width,
                      height: board.height,
                      borderRadius: board.radius,
                      background: boardBg.cssBackground,
                      boxShadow: isPrimaryActive
                        ? '0 28px 90px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(99,102,241,0.28)'
                        : '0 24px 72px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Visual 8px Baseline Micro-Grid Overlay */}
                    {snapToGrid8px && (
                      <div
                        data-testid="artboard-8px-grid"
                        className="absolute inset-0 pointer-events-none z-10"
                        style={{
                          backgroundImage:
                            'linear-gradient(to right, rgba(6,182,212,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.12) 1px, transparent 1px)',
                          backgroundSize: '8px 8px',
                        }}
                      />
                    )}

                    {/* Visual Responsive Breakpoint Column Guide Overlay */}
                    {isPrimaryActive && breakpoint !== 'fluid' && (() => {
                      const preset = getBreakpointPreset(breakpoint);
                      const cols = computeBreakpointColumnRects(board.width, preset);
                      return (
                        <div
                          data-testid="responsive-column-overlay"
                          className="absolute inset-0 pointer-events-none z-10"
                        >
                          {cols.map((col) => (
                            <div
                              key={`col-${col.index}`}
                              className="absolute top-0 bottom-0"
                              style={{
                                left: col.x,
                                width: col.width,
                                backgroundColor: 'rgba(99, 102, 241, 0.065)',
                                borderLeft: '1px solid rgba(99, 102, 241, 0.18)',
                                borderRight: '1px solid rgba(99, 102, 241, 0.18)',
                              }}
                            />
                          ))}
                        </div>
                      );
                    })()}

                    {boardNodes.map((node) =>
                      renderNodeElement(node, board.x, board.y, false, 0),
                    )}
                  </div>
                </div>
              );
            })}

            {/* PROTOTYPE MODE Cross-Artboard Flow Noodles & Interaction Badges */}
            {uiMode === 'prototype' && (
              <div
                data-testid="prototype-canvas-overlay"
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  width: Math.max(1, worldBounds.x + worldBounds.width + 80),
                  height: Math.max(1, worldBounds.y + worldBounds.height + 80),
                }}
              >
                {prototypeNoodles.length > 0 && (
                  <svg
                    className="absolute top-0 left-0 overflow-visible"
                    style={{ width: 1, height: 1 }}
                    fill="none"
                  >
                    <defs>
                      <marker
                        id="proto-noodle-arrow"
                        viewBox="0 0 10 10"
                        refX="7"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 1 1 L 9 5 L 1 9 z" fill="#10B981" />
                      </marker>
                    </defs>
                    {prototypeNoodles.map((c) => {
                      const midX = (c.x1 + c.x2) / 2;
                      const curveOffset = Math.min(120, Math.abs(c.x2 - c.x1) * 0.45);
                      const cp1x = c.x2 >= c.x1 ? c.x1 + curveOffset : c.x1 - curveOffset;
                      const cp2x = c.x2 >= c.x1 ? c.x2 - curveOffset : c.x2 + curveOffset;
                      const pathD = `M ${c.x1} ${c.y1} C ${cp1x} ${c.y1}, ${cp2x} ${c.y2}, ${c.x2} ${c.y2}`;
                      return (
                        <g key={c.id}>
                          <circle cx={c.x1} cy={c.y1} r="5" fill={c.color} />
                          <path
                            d={pathD}
                            stroke={c.color}
                            strokeWidth="2.2"
                            strokeDasharray="7 4"
                            markerEnd="url(#proto-noodle-arrow)"
                            style={{
                              filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.7))',
                            }}
                          />
                          <rect
                            x={midX - 38}
                            y={(c.y1 + c.y2) / 2 - 11}
                            width="76"
                            height="20"
                            rx="10"
                            fill="#064E3B"
                            stroke={c.color}
                            strokeWidth="1"
                          />
                          <text
                            x={midX}
                            y={(c.y1 + c.y2) / 2 + 2.5}
                            textAnchor="middle"
                            fill="#A7F3D0"
                            fontFamily="JetBrains Mono, monospace"
                            fontSize="9"
                            fontWeight="600"
                          >
                            {c.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}

                {doc.nodes
                  .filter(
                    (n) =>
                      n.visible &&
                      n.prototype &&
                      (n.prototype.entrance !== 'none' ||
                        n.prototype.clickAction !== 'none'),
                  )
                  .map((node) => {
                    const p = node.prototype!;
                    const badgeText =
                      p.clickAction === 'modal_overlay'
                        ? 'Modal Overlay'
                        : p.clickAction === 'smart_animate'
                          ? 'Smart Animate'
                          : p.clickAction === 'navigate_artboard'
                            ? `Navigate -> ${p.transition ?? 'smart-animate'}`
                            : p.clickAction !== 'none'
                              ? `Click · ${p.clickAction}`
                              : `${p.entrance} · ${p.durationMs}ms`;
                    return (
                      <div
                        key={`pbadge-${node.id}`}
                        className="absolute rounded-full px-1.5 py-0.5 flex items-center gap-1 font-mono-tech font-semibold text-slate-950 shadow-lg whitespace-nowrap"
                        style={{
                          left: node.x,
                          top: node.y - 18 / viewport.zoom,
                          fontSize: `${8.5 / viewport.zoom}px`,
                          backgroundColor:
                            p.clickAction === 'modal_overlay'
                              ? '#C4B5FD'
                              : p.clickAction === 'smart_animate'
                                ? '#22D3EE'
                                : p.clickAction !== 'none'
                                  ? '#34D399'
                                  : '#38BDF8',
                        }}
                      >
                        <Zap size={Math.max(8, 9 / viewport.zoom)} strokeWidth={2.2} />
                        <span>{badgeText}</span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Live Vector Pen Preview */}
            {activeTool === 'pen' && penPoints.length > 0 && (
              <svg
                data-testid="pen-preview-svg"
                className="absolute inset-0 overflow-visible pointer-events-none"
                style={{ width: 1, height: 1 }}
                fill="none"
              >
                <path
                  d={buildSvgPathData([...penPoints, pointerCanvas], true, false)}
                  stroke="#06B6D4"
                  strokeWidth={2 / viewport.zoom}
                  strokeDasharray={`${5 / viewport.zoom} ${4 / viewport.zoom}`}
                  strokeLinecap="round"
                />
                {penPoints.length >= 2 && (
                  <path
                    d={buildSvgPathData(penPoints, true, false)}
                    stroke="#6366F1"
                    strokeWidth={2.5 / viewport.zoom}
                    strokeLinecap="round"
                  />
                )}
                {penPoints.map((pt, idx) => (
                  <circle
                    key={`pen-pt-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={4 / viewport.zoom}
                    fill="#FFFFFF"
                    stroke="#06B6D4"
                    strokeWidth={1.8 / viewport.zoom}
                  />
                ))}
              </svg>
            )}

            {/* Unified Selection Bounding Box (Interactive Group Drag when 2+ Selected) */}
            {selectionBounds && (
              <div
                data-testid="selection-overlay"
                onPointerDown={
                  selectedNodes.length >= 2 && uiMode === 'design'
                    ? (e) => {
                        e.stopPropagation();
                        const origin = getStageOrigin();
                        const ptCanvas = screenToCanvas(
                          { x: e.clientX, y: e.clientY },
                          origin,
                          viewport,
                        );
                        beginMoveGroup(ptCanvas, selectedIds);
                      }
                    : undefined
                }
                className={`absolute ${
                  selectedNodes.length >= 2 && uiMode === 'design'
                    ? 'pointer-events-auto cursor-move'
                    : 'pointer-events-none'
                }`}
                style={{
                  left: selectionBounds.x,
                  top: selectionBounds.y,
                  width: selectionBounds.width,
                  height: selectionBounds.height,
                  border: `${1.5 / viewport.zoom}px solid ${accentBorderColor}`,
                  backgroundColor:
                    selectedNodes.length >= 2
                      ? 'rgba(99, 102, 241, 0.05)'
                      : undefined,
                }}
              >
                <div
                  className="absolute left-1/2 -translate-x-1/2 font-mono-tech font-semibold text-white whitespace-nowrap rounded px-1.5 py-0.5 pointer-events-none"
                  style={{
                    top: `calc(100% + ${8 / viewport.zoom}px)`,
                    fontSize: `${10 / viewport.zoom}px`,
                    backgroundColor: accentBorderColor,
                  }}
                >
                  {selectedNodes.length >= 2 ? `Group (${selectedNodes.length}) · ` : ''}
                  {Math.round(selectionBounds.width)} × {Math.round(selectionBounds.height)}
                  {rotatingAngle !== null ? `  ·  ${rotatingAngle}°` : ''}
                </div>
              </div>
            )}

            {/* 8-Point Resize Handles & Top Rotation Handle */}
            {uiMode === 'design' && primarySelected && !primarySelected.locked && (
              <>
                {handlePositions.map((h) => (
                  <div
                    key={h.id}
                    data-testid={`resize-handle-${h.id}`}
                    onPointerDown={(e) => startResize(e, h.id, primarySelected)}
                    className="absolute bg-white rounded-[2px]"
                    style={{
                      left: h.x - 4 / viewport.zoom,
                      top: h.y - 4 / viewport.zoom,
                      width: 8 / viewport.zoom,
                      height: 8 / viewport.zoom,
                      border: `${1.5 / viewport.zoom}px solid #6366F1`,
                      cursor: h.cursor,
                    }}
                  />
                ))}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: primarySelected.x + primarySelected.width / 2 - 0.5 / viewport.zoom,
                    top: primarySelected.y - 22 / viewport.zoom,
                    width: 1 / viewport.zoom,
                    height: 20 / viewport.zoom,
                    backgroundColor: '#6366F1',
                  }}
                />
                <div
                  data-testid="rotate-handle"
                  onPointerDown={(e) => startRotate(e, primarySelected)}
                  title="Drag to rotate (Shift snaps 15°)"
                  className="absolute rounded-full bg-white cursor-grab"
                  style={{
                    left: primarySelected.x + primarySelected.width / 2 - 5 / viewport.zoom,
                    top: primarySelected.y - 28 / viewport.zoom,
                    width: 10 / viewport.zoom,
                    height: 10 / viewport.zoom,
                    border: `${1.8 / viewport.zoom}px solid #06B6D4`,
                  }}
                />
              </>
            )}

            {/* Alt-Hover Inter-Node Spacing Measurements */}
            {altMeasureSegments.length > 0 && (
              <div data-testid="alt-measure-overlay" className="pointer-events-none">
                {altMeasureSegments.map((seg, idx) => (
                  <div key={`mseg-${idx}`}>
                    {seg.orientation === 'horizontal' ? (
                      <div
                        className="absolute"
                        style={{
                          left: Math.min(seg.x1, seg.x2),
                          top: seg.y1,
                          width: Math.abs(seg.x2 - seg.x1),
                          borderTop: `${1.4 / viewport.zoom}px solid #F43F5E`,
                        }}
                      />
                    ) : (
                      <div
                        className="absolute"
                        style={{
                          left: seg.x1,
                          top: Math.min(seg.y1, seg.y2),
                          height: Math.abs(seg.y2 - seg.y1),
                          borderLeft: `${1.4 / viewport.zoom}px solid #F43F5E`,
                        }}
                      />
                    )}
                    <span
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded font-mono-tech font-semibold text-white px-1 shadow"
                      style={{
                        left: seg.labelX,
                        top: seg.labelY,
                        fontSize: `${9 / viewport.zoom}px`,
                        backgroundColor: '#F43F5E',
                      }}
                    >
                      {seg.distancePx}px
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Smart Snap Alignment Guides */}
            {snapGuides.map((g, i) => (
              <div key={`guide-${i}`} className="pointer-events-none">
                {g.orientation === 'vertical' ? (
                  <div
                    data-testid="snap-guide"
                    className="absolute"
                    style={{
                      left: g.position,
                      top: g.start,
                      width: 1.25 / viewport.zoom,
                      height: Math.max(1, g.end - g.start),
                      backgroundColor: '#F43F5E',
                      boxShadow: '0 0 8px rgba(244, 63, 94, 0.7)',
                    }}
                  />
                ) : (
                  <div
                    data-testid="snap-guide"
                    className="absolute"
                    style={{
                      left: g.start,
                      top: g.position,
                      width: Math.max(1, g.end - g.start),
                      height: 1.25 / viewport.zoom,
                      backgroundColor: '#F43F5E',
                      boxShadow: '0 0 8px rgba(244, 63, 94, 0.7)',
                    }}
                  />
                )}
                {g.distanceLabel &&
                  g.distanceAnchorX !== undefined &&
                  g.distanceAnchorY !== undefined && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 font-mono-tech font-semibold text-white rounded px-1"
                      style={{
                        left: g.distanceAnchorX,
                        top: g.distanceAnchorY,
                        fontSize: `${9 / viewport.zoom}px`,
                        backgroundColor: '#F43F5E',
                      }}
                    >
                      {g.distanceLabel}
                    </div>
                  )}
              </div>
            ))}

            {/* DEV MODE Redlines to Parent Artboard */}
            {uiMode === 'dev' && devInspectNode && devInspectBoard && devRedlines && (
              <div
                data-testid="dev-redlines"
                className="absolute pointer-events-none"
                style={{
                  left: devInspectBoard.x,
                  top: devInspectBoard.y,
                  width: devInspectBoard.width,
                  height: devInspectBoard.height,
                }}
              >
                {devRedlines.top > 0 && (
                  <>
                    <div
                      className="absolute"
                      style={{
                        left: devInspectNode.x - devInspectBoard.x + devInspectNode.width / 2,
                        top: 0,
                        height: devRedlines.top,
                        borderLeft: `${1.2 / viewport.zoom}px dashed #F43F5E`,
                      }}
                    />
                    <span
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded font-mono-tech font-semibold text-white px-1"
                      style={{
                        left: devInspectNode.x - devInspectBoard.x + devInspectNode.width / 2,
                        top: devRedlines.top / 2,
                        fontSize: `${9 / viewport.zoom}px`,
                        backgroundColor: '#F43F5E',
                      }}
                    >
                      {devRedlines.top}px
                    </span>
                  </>
                )}
                {devRedlines.bottom > 0 && (
                  <>
                    <div
                      className="absolute"
                      style={{
                        left: devInspectNode.x - devInspectBoard.x + devInspectNode.width / 2,
                        top: devInspectNode.y - devInspectBoard.y + devInspectNode.height,
                        height: devRedlines.bottom,
                        borderLeft: `${1.2 / viewport.zoom}px dashed #F43F5E`,
                      }}
                    />
                    <span
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded font-mono-tech font-semibold text-white px-1"
                      style={{
                        left: devInspectNode.x - devInspectBoard.x + devInspectNode.width / 2,
                        top: devInspectNode.y - devInspectBoard.y + devInspectNode.height + devRedlines.bottom / 2,
                        fontSize: `${9 / viewport.zoom}px`,
                        backgroundColor: '#F43F5E',
                      }}
                    >
                      {devRedlines.bottom}px
                    </span>
                  </>
                )}
                {devRedlines.left > 0 && (
                  <>
                    <div
                      className="absolute"
                      style={{
                        left: 0,
                        top: devInspectNode.y - devInspectBoard.y + devInspectNode.height / 2,
                        width: devRedlines.left,
                        borderTop: `${1.2 / viewport.zoom}px dashed #06B6D4`,
                      }}
                    />
                    <span
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded font-mono-tech font-semibold text-slate-950 px-1"
                      style={{
                        left: devRedlines.left / 2,
                        top: devInspectNode.y - devInspectBoard.y + devInspectNode.height / 2,
                        fontSize: `${9 / viewport.zoom}px`,
                        backgroundColor: '#06B6D4',
                      }}
                    >
                      {devRedlines.left}px
                    </span>
                  </>
                )}
                {devRedlines.right > 0 && (
                  <>
                    <div
                      className="absolute"
                      style={{
                        left: devInspectNode.x - devInspectBoard.x + devInspectNode.width,
                        top: devInspectNode.y - devInspectBoard.y + devInspectNode.height / 2,
                        width: devRedlines.right,
                        borderTop: `${1.2 / viewport.zoom}px dashed #06B6D4`,
                      }}
                    />
                    <span
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded font-mono-tech font-semibold text-slate-950 px-1"
                      style={{
                        left: devInspectNode.x - devInspectBoard.x + devInspectNode.width + devRedlines.right / 2,
                        top: devInspectNode.y - devInspectBoard.y + devInspectNode.height / 2,
                        fontSize: `${9 / viewport.zoom}px`,
                        backgroundColor: '#06B6D4',
                      }}
                    >
                      {devRedlines.right}px
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Marquee Selection Box */}
            {marqueeBox && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: marqueeBox.x,
                  top: marqueeBox.y,
                  width: marqueeBox.width,
                  height: marqueeBox.height,
                  backgroundColor: 'rgba(99, 102, 241, 0.14)',
                  border: `${1 / viewport.zoom}px solid #6366F1`,
                }}
              />
            )}

            {/* Shape Creation Preview Box */}
            {drawBox && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: drawBox.x,
                  top: drawBox.y,
                  width: drawBox.width,
                  height: drawBox.height,
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  border: `${1.5 / viewport.zoom}px dashed #06B6D4`,
                }}
              />
            )}

            {/* Animated Co-Designer Cursor */}
            {coDesigner.active && (
              <div
                data-testid="co-designer-cursor"
                className="absolute pointer-events-none transition-all duration-1000 ease-in-out"
                style={{
                  left: coDesigner.x,
                  top: coDesigner.y,
                  transform: `scale(${1 / viewport.zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
                  <path
                    d="M1 1L16 8.5L9.2 10.7L6.8 18L1 1Z"
                    fill={coDesigner.color}
                    stroke="#0A0B0E"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <div
                  className="ml-3 -mt-1 rounded-md px-2 py-1 shadow-lg whitespace-nowrap border"
                  style={{
                    backgroundColor: '#0E141D',
                    borderColor: 'rgba(6, 182, 212, 0.5)',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="font-mono-tech text-[10px] font-semibold text-cyan-300">
                      {coDesigner.name} · {coDesigner.role}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-300 mt-0.5">{coDesigner.activity}</div>
                </div>
              </div>
            )}
          </div>

          {/* Pen Finish Pill */}
          {activeTool === 'pen' && penPoints.length >= 2 && (
            <div
              className="absolute top-9 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xl"
              style={{
                backgroundColor: 'var(--studio-surface)',
                borderColor: 'var(--studio-cyan)',
              }}
            >
              <span className="font-mono-tech text-[10px]" style={{ color: 'var(--studio-cyan)' }}>
                {penPoints.length} anchor points plotted
              </span>
              <button
                type="button"
                data-testid="btn-pen-finish"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={finishPenPath}
                className="h-6 px-2.5 rounded-full bg-indigo-500 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check size={11} />
                <span>Finish Curve (Enter)</span>
              </button>
            </div>
          )}

          {/* Right-Click Canvas Context Menu */}
          {contextMenu && contextNode && (
            <div
              data-testid="canvas-context-menu"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute z-50 w-52 rounded-xl border p-1 shadow-2xl"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
                backgroundColor: 'var(--studio-surface)',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              <div
                className="px-2.5 py-1 text-[9px] font-mono-tech uppercase tracking-wider truncate border-b mb-1"
                style={{
                  color: 'var(--studio-text-muted)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                {contextNode.name}
              </div>
              {(
                [
                  ['duplicate', 'Duplicate', 'Ctrl+D', Copy],
                  ['bring-front', 'Bring to Front', '', ArrowUpToLine],
                  ['send-back', 'Send to Back', '', ArrowDownToLine],
                  ['wrap-glass', 'Wrap in Glass Card', '', Sparkles],
                  ['copy-react', 'Copy React + TW4', '', Code2],
                  ['copy-svg', 'Copy Node SVG', '', FileCode2],
                  [
                    'toggle-lock',
                    contextNode.locked ? 'Unlock Layer' : 'Lock Layer',
                    '',
                    contextNode.locked ? Unlock : Lock,
                  ],
                  ['delete', 'Delete Layer', 'Del', Trash2],
                ] as const
              ).map(([action, label, shortcut, Icon]) => (
                <button
                  key={action}
                  type="button"
                  data-testid={`ctx-${action}`}
                  onClick={() => {
                    onContextAction(contextNode.id, action);
                    setContextMenu(null);
                  }}
                  className={`w-full h-7 px-2 rounded-lg flex items-center justify-between text-[11px] font-medium transition-colors cursor-pointer ${
                    action === 'delete'
                      ? 'text-rose-400 hover:bg-rose-500/15'
                      : 'hover:bg-white/10'
                  }`}
                  style={{
                    color: action === 'delete' ? undefined : 'var(--studio-text)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={12} strokeWidth={1.5} />
                    <span>{label}</span>
                  </span>
                  {shortcut && (
                    <span className="font-mono-tech text-[9px] opacity-55">
                      {shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Multi-Artboard Floating Interactive Canvas Minimap */}
          <div
            data-testid="canvas-minimap"
            onPointerDown={(e) => e.stopPropagation()}
            className="hidden lg:block absolute right-3 bottom-3 z-30 rounded-xl border backdrop-blur-md overflow-hidden shadow-xl"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--studio-surface) 90%, transparent)',
              borderColor: 'var(--studio-border-strong)',
            }}
          >
            <div
              className="h-6 px-2 border-b flex items-center justify-between gap-2"
              style={{ borderColor: 'var(--studio-border)' }}
            >
              <span className="font-mono-tech text-[9px] uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--studio-text-muted)' }}>
                <MapIcon size={10} />
                <span>
                  Map · {artboards.length > 1 ? `${artboards.length}S · ` : ''}
                  {Math.round(viewport.zoom * 100)}%
                </span>
              </span>
              <button
                type="button"
                onClick={() => setMinimapOpen((v) => !v)}
                title={minimapOpen ? 'Collapse Minimap' : 'Expand Minimap'}
                className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <Minimize2 size={10} />
              </button>
            </div>
            {minimapOpen && (
              <div
                onPointerDown={panFromMinimapEvent}
                onPointerMove={(e) => {
                  if (e.buttons === 1) panFromMinimapEvent(e);
                }}
                className="relative cursor-crosshair overflow-hidden"
                style={{
                  width: miniW,
                  height: miniH,
                  backgroundColor: 'var(--studio-canvas)',
                }}
              >
                {artboards.map((b) => (
                  <div
                    key={`mm-board-${b.id}`}
                    className="absolute rounded-[2px] border"
                    style={{
                      left: miniOffsetX + b.x * miniScale,
                      top: miniOffsetY + b.y * miniScale,
                      width: b.width * miniScale,
                      height: b.height * miniScale,
                      backgroundColor: doc.tokens.surfaceCard,
                      borderColor:
                        b.id === activeBoard.id
                          ? 'rgba(99,102,241,0.55)'
                          : 'rgba(255,255,255,0.16)',
                    }}
                  />
                ))}
                {doc.nodes
                  .filter((n) => n.visible)
                  .map((n) => (
                    <div
                      key={`mm-${n.id}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: miniOffsetX + n.x * miniScale,
                        top: miniOffsetY + n.y * miniScale,
                        width: Math.max(2, n.width * miniScale),
                        height: Math.max(1.5, n.height * miniScale),
                        backgroundColor: selectedIds.includes(n.id)
                          ? '#06B6D4'
                          : n.type === 'image'
                            ? '#F59E0B'
                            : n.type === 'button'
                              ? doc.tokens.brandPrimary
                              : 'rgba(148, 163, 184, 0.35)',
                        borderRadius: n.type === 'ellipse' ? 999 : 1,
                      }}
                    />
                  ))}

                <div
                  className="absolute pointer-events-none rounded-[2px]"
                  style={{
                    left: miniOffsetX + lensCanvasX * miniScale,
                    top: miniOffsetY + lensCanvasY * miniScale,
                    width: Math.max(12, lensCanvasW * miniScale),
                    height: Math.max(10, lensCanvasH * miniScale),
                    border: `1.5px solid ${accentBorderColor}`,
                    backgroundColor: 'rgba(99, 102, 241, 0.14)',
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Bottom-Left Floating Telemetry Pill */}
      <div
        className="absolute bottom-3 left-9 z-20 h-7 px-3.5 rounded-full border flex items-center gap-3 text-[10px] font-mono-tech whitespace-nowrap backdrop-blur-md pointer-events-none"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--studio-surface) 88%, transparent)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text-secondary)',
        }}
      >
        <span className="min-w-[82px]">
          {stack3D
            ? `3D ${pitch3D}°/${yaw3D}°`
            : `X:${pointerCanvas.x}  Y:${pointerCanvas.y}`}
        </span>
        <span className="opacity-35">|</span>
        <span className="hidden md:inline">
          {stack3D
            ? 'Drag anywhere to orbit 3D layer stack · Click 3D Stack to exit'
            : activeTool === 'pen'
              ? labels.penHint
              : labels.canvasHint}
        </span>
        <span className="hidden md:inline opacity-35">|</span>
        <span className="flex items-center gap-1.5" style={{ color: 'var(--studio-cyan)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {crdtSynced ? labels.yjsSynced : 'Local'}
        </span>
      </div>
    </div>
  );
}
