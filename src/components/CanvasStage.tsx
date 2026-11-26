import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Bounds,
  CanvasNode,
  CollaboratorCursor,
  DocumentState,
  NodeType,
  Point,
  SnapGuide,
  ToolType,
  UiMode,
  Viewport,
} from '../types/canvas';
import {
  getRulerTicks,
  screenToCanvas,
  zoomAtPoint,
} from '../engines/viewport';
import { computeSnap } from '../engines/snap';
import { resolveArtboardBackground, resolveNodeStyle } from '../engines/tokens';
import { computeRedlineMeasurements } from '../engines/codegen';
import { createNodeFromTool } from '../engines/nodeFactory';
import type { StudioLabels } from '../i18n/labels';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface CanvasStageProps {
  doc: DocumentState;
  viewport: Viewport;
  onViewportChange: (next: Viewport) => void;
  onStageResize: (size: { width: number; height: number }) => void;
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  uiMode: UiMode;
  spacePressed: boolean;
  onLiveUpdateNodes: (nextNodes: CanvasNode[]) => void;
  onCommitNodes: (nextNodes: CanvasNode[]) => void;
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
  | { kind: 'draw'; tool: NodeType; startCanvas: Point; currentCanvas: Point };

export function CanvasStage({
  doc,
  viewport,
  onViewportChange,
  onStageResize,
  activeTool,
  onSelectTool,
  selectedIds,
  onSelectIds,
  uiMode,
  spacePressed,
  onLiveUpdateNodes,
  onCommitNodes,
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

  const interactionRef = useRef<InteractionState>({ kind: 'idle' });
  const latestNodesRef = useRef<CanvasNode[]>(doc.nodes);
  latestNodesRef.current = doc.nodes;

  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Observe stage dimensions for responsive rulers & initial centering
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

  // Native non-passive wheel zoom/pan handler
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
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
  }, [onViewportChange]);

  const selectedNodes = useMemo(
    () => doc.nodes.filter((n) => selectedIds.includes(n.id)),
    [doc.nodes, selectedIds],
  );
  const primarySelected = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const selectionBounds = useMemo(
    () => getSelectionBounds(selectedNodes),
    [selectedNodes],
  );

  // Global pointer move & pointer up lifecycle
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
            const candidate: Bounds = {
              x: init.x + dx,
              y: init.y + dy,
              width: targetNode.width,
              height: targetNode.height,
            };
            const siblings = interaction.baseNodes
              .filter((n) => n.id !== movedId && n.visible)
              .map((n) => ({ x: n.x, y: n.y, width: n.width, height: n.height }));
            const artboardBounds: Bounds = {
              x: doc.artboard.x,
              y: doc.artboard.y,
              width: doc.artboard.width,
              height: doc.artboard.height,
            };
            const snap = computeSnap(candidate, siblings, artboardBounds, 6);
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

        if (interaction.handle.includes('e')) {
          width = Math.max(minW, r.width + dx);
        }
        if (interaction.handle.includes('s')) {
          height = Math.max(minH, r.height + dy);
        }
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

        const nextNodes = interaction.baseNodes.map((n) =>
          n.id === interaction.nodeId
            ? {
                ...n,
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(width),
                height: Math.round(height),
              }
            : n,
        );
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
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
        } else {
          deg = Math.round(deg);
        }
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
    doc.artboard,
    doc.nodes,
    doc.tokens,
    getStageOrigin,
    onCommitNodes,
    onLiveUpdateNodes,
    onSelectIds,
    onSelectTool,
    onViewportChange,
  ]);

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editingNodeId) {
      commitInlineText();
    }

    const origin = getStageOrigin();
    const ptCanvas = screenToCanvas(
      { x: e.clientX, y: e.clientY },
      origin,
      viewport,
    );

    // Hand tool, Space key, or Middle Mouse button -> Pan
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

    // Drawing tool active -> Start drawing new node
    if (activeTool !== 'select' && uiMode === 'design') {
      interactionRef.current = {
        kind: 'draw',
        tool: activeTool,
        startCanvas: ptCanvas,
        currentCanvas: ptCanvas,
      };
      setDrawBox({ x: ptCanvas.x, y: ptCanvas.y, width: 1, height: 1 });
      return;
    }

    // Clicked empty background in Select mode -> deselect + start marquee box
    onSelectIds([]);
    if (uiMode === 'design') {
      interactionRef.current = {
        kind: 'marquee',
        startCanvas: ptCanvas,
        currentCanvas: ptCanvas,
      };
    }
  };

  const handleNodePointerDown = (
    e: React.PointerEvent,
    node: CanvasNode,
  ) => {
    e.stopPropagation();
    if (activeTool === 'hand' || spacePressed || e.button === 1) {
      interactionRef.current = {
        kind: 'pan',
        startScreen: { x: e.clientX, y: e.clientY },
        startViewport: { ...viewport },
      };
      return;
    }
    if (e.button !== 0) return;

    // If user is in a drawing tool, let them draw over artboard/cards naturally
    if (activeTool !== 'select' && uiMode === 'design') {
      const origin = getStageOrigin();
      const ptCanvas = screenToCanvas(
        { x: e.clientX, y: e.clientY },
        origin,
        viewport,
      );
      interactionRef.current = {
        kind: 'draw',
        tool: activeTool,
        startCanvas: ptCanvas,
        currentCanvas: ptCanvas,
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

    if (uiMode === 'dev' || node.locked) return;

    const origin = getStageOrigin();
    const ptCanvas = screenToCanvas(
      { x: e.clientX, y: e.clientY },
      origin,
      viewport,
    );
    const movableIds = nextSelected.filter((id) => {
      const found = doc.nodes.find((n) => n.id === id);
      return found && !found.locked;
    });
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

  const startResize = (
    e: React.PointerEvent,
    handle: ResizeHandle,
    node: CanvasNode,
  ) => {
    e.stopPropagation();
    if (node.locked || uiMode === 'dev') return;
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
      baseNodes: doc.nodes,
    };
  };

  const startRotate = (e: React.PointerEvent, node: CanvasNode) => {
    e.stopPropagation();
    if (node.locked || uiMode === 'dev') return;
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
    if (uiMode === 'dev' || node.locked) return;
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

  const artboardBg = useMemo(
    () => resolveArtboardBackground(doc.artboard, doc.tokens),
    [doc.artboard, doc.tokens],
  );

  // Rulers ticks synchronized with viewport
  const topTicks = useMemo(
    () => getRulerTicks(viewport.x - RULER_SIZE, viewport.zoom, Math.max(0, stageSize.width - RULER_SIZE)),
    [viewport.x, viewport.zoom, stageSize.width],
  );
  const leftTicks = useMemo(
    () => getRulerTicks(viewport.y - RULER_SIZE, viewport.zoom, Math.max(0, stageSize.height - RULER_SIZE)),
    [viewport.y, viewport.zoom, stageSize.height],
  );

  // Dev mode active inspect node (selected or hovered)
  const devInspectNode = useMemo(() => {
    if (uiMode !== 'dev') return null;
    if (primarySelected) return primarySelected;
    if (hoveredId) return doc.nodes.find((n) => n.id === hoveredId) ?? null;
    return null;
  }, [uiMode, primarySelected, hoveredId, doc.nodes]);

  const devRedlines = useMemo(() => {
    if (!devInspectNode) return null;
    return computeRedlineMeasurements(devInspectNode, doc.artboard);
  }, [devInspectNode, doc.artboard]);

  const gridSpacing = Math.max(12, 24 * viewport.zoom);
  const cursorStyle =
    activeTool === 'hand' || spacePressed
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

  return (
    <div
      ref={stageRef}
      data-testid="canvas-stage"
      onPointerDown={handleStagePointerDown}
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
      {/* Top-Left Ruler Origin Box */}
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

      {/* Synchronized Top Pixel Ruler */}
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
              borderBottom: '2px solid var(--studio-accent)',
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

      {/* Synchronized Left Pixel Ruler */}
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
              borderRight: '2px solid var(--studio-accent)',
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

      {/* Infinite Transformed World Layer */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`,
        }}
      >
        {/* Artboard Meta Label Floating Above Frame */}
        <div
          className="absolute flex items-center justify-between pointer-events-none"
          style={{
            left: doc.artboard.x,
            top: doc.artboard.y - 26 / viewport.zoom,
            width: doc.artboard.width,
            transformOrigin: 'bottom left',
          }}
        >
          <span
            className="font-mono-tech font-medium tracking-wide"
            style={{
              fontSize: `${11 / viewport.zoom}px`,
              color:
                selectedIds.length === 0
                  ? 'var(--studio-accent)'
                  : 'var(--studio-text-muted)',
            }}
          >
            {doc.artboard.name}
          </span>
          <span
            className="font-mono-tech"
            style={{
              fontSize: `${10 / viewport.zoom}px`,
              color: 'var(--studio-text-muted)',
            }}
          >
            {doc.artboard.width} × {doc.artboard.height}
          </span>
        </div>

        {/* Artboard Frame Surface */}
        <div
          data-testid="artboard-frame"
          className="absolute overflow-hidden"
          style={{
            left: doc.artboard.x,
            top: doc.artboard.y,
            width: doc.artboard.width,
            height: doc.artboard.height,
            borderRadius: doc.artboard.radius,
            background: artboardBg.cssBackground,
            boxShadow:
              '0 28px 90px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(255,255,255,0.09)',
          }}
        >
          {doc.nodes
            .filter((n) => n.visible)
            .map((node) => {
              const style = resolveNodeStyle(node, doc.tokens);
              const isSelected = selectedIds.includes(node.id);
              const isHovered = hoveredId === node.id;
              const isEditing = editingNodeId === node.id;

              return (
                <div
                  key={node.id}
                  data-testid={`canvas-node-${node.id}`}
                  data-node-type={node.type}
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startInlineText(node);
                  }}
                  onPointerEnter={() => setHoveredId(node.id)}
                  onPointerLeave={() =>
                    setHoveredId((prev) => (prev === node.id ? null : prev))
                  }
                  className="absolute"
                  style={{
                    left: node.x - doc.artboard.x,
                    top: node.y - doc.artboard.y,
                    width: node.width,
                    height: node.height,
                    transform:
                      node.rotation !== 0 ? `rotate(${node.rotation}deg)` : undefined,
                    borderRadius: style.radius,
                    opacity: node.opacity,
                    background:
                      node.type === 'text' ? 'transparent' : style.cssBackground,
                    border:
                      node.strokeWidth > 0
                        ? `${node.strokeWidth}px solid ${style.strokeColor}`
                        : undefined,
                    backdropFilter:
                      node.blur > 0 ? `blur(${node.blur}px)` : undefined,
                    WebkitBackdropFilter:
                      node.blur > 0 ? `blur(${node.blur}px)` : undefined,
                    boxShadow: style.boxShadow !== 'none' ? style.boxShadow : undefined,
                    mixBlendMode: node.blendMode,
                    display:
                      node.type === 'button' || node.type === 'text'
                        ? 'flex'
                        : undefined,
                    alignItems:
                      node.type === 'button' ? 'center' : 'flex-start',
                    justifyContent:
                      node.type === 'button'
                        ? 'center'
                        : node.textAlign === 'center'
                          ? 'center'
                          : node.textAlign === 'right'
                            ? 'flex-end'
                            : 'flex-start',
                    outline:
                      !isSelected && isHovered
                        ? `${1.25 / viewport.zoom}px solid ${uiMode === 'dev' ? '#06B6D4' : '#6366F1'}`
                        : undefined,
                    cursor:
                      activeTool === 'select'
                        ? uiMode === 'dev'
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
            })}
        </div>

        {/* Selection Bounding Box + 8 Resize Handles + Rotation Handle */}
        {selectionBounds && (
          <div
            data-testid="selection-overlay"
            className="absolute pointer-events-none"
            style={{
              left: selectionBounds.x,
              top: selectionBounds.y,
              width: selectionBounds.width,
              height: selectionBounds.height,
              border: `${1.5 / viewport.zoom}px solid ${uiMode === 'dev' ? '#06B6D4' : '#6366F1'}`,
            }}
          >
            {/* Dimension Pill */}
            <div
              className="absolute left-1/2 -translate-x-1/2 font-mono-tech font-semibold text-white whitespace-nowrap rounded px-1.5 py-0.5"
              style={{
                top: `calc(100% + ${8 / viewport.zoom}px)`,
                fontSize: `${10 / viewport.zoom}px`,
                backgroundColor: uiMode === 'dev' ? '#0891B2' : '#6366F1',
              }}
            >
              {Math.round(selectionBounds.width)} × {Math.round(selectionBounds.height)}
              {rotatingAngle !== null ? `  ·  ${rotatingAngle}°` : ''}
            </div>
          </div>
        )}

        {/* 8-Point Resize Handles & Top Rotation Handle (Design Mode, Single Selection) */}
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
            {/* Rotation stem + knob */}
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

        {/* Smart Alignment Magenta Snap Guides */}
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

        {/* DEV MODE Redline Spacing Measurements to Parent Artboard */}
        {uiMode === 'dev' && devInspectNode && devRedlines && (
          <div
            data-testid="dev-redlines"
            className="absolute pointer-events-none"
            style={{
              left: doc.artboard.x,
              top: doc.artboard.y,
              width: doc.artboard.width,
              height: doc.artboard.height,
            }}
          >
            {/* Top measurement */}
            {devRedlines.top > 0 && (
              <>
                <div
                  className="absolute"
                  style={{
                    left: devInspectNode.x - doc.artboard.x + devInspectNode.width / 2,
                    top: 0,
                    height: devRedlines.top,
                    borderLeft: `${1.2 / viewport.zoom}px dashed #F43F5E`,
                  }}
                />
                <span
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded font-mono-tech font-semibold text-white px-1"
                  style={{
                    left: devInspectNode.x - doc.artboard.x + devInspectNode.width / 2,
                    top: devRedlines.top / 2,
                    fontSize: `${9 / viewport.zoom}px`,
                    backgroundColor: '#F43F5E',
                  }}
                >
                  {devRedlines.top}px
                </span>
              </>
            )}
            {/* Bottom measurement */}
            {devRedlines.bottom > 0 && (
              <>
                <div
                  className="absolute"
                  style={{
                    left: devInspectNode.x - doc.artboard.x + devInspectNode.width / 2,
                    top: devInspectNode.y - doc.artboard.y + devInspectNode.height,
                    height: devRedlines.bottom,
                    borderLeft: `${1.2 / viewport.zoom}px dashed #F43F5E`,
                  }}
                />
                <span
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded font-mono-tech font-semibold text-white px-1"
                  style={{
                    left: devInspectNode.x - doc.artboard.x + devInspectNode.width / 2,
                    top: devInspectNode.y - doc.artboard.y + devInspectNode.height + devRedlines.bottom / 2,
                    fontSize: `${9 / viewport.zoom}px`,
                    backgroundColor: '#F43F5E',
                  }}
                >
                  {devRedlines.bottom}px
                </span>
              </>
            )}
            {/* Left measurement */}
            {devRedlines.left > 0 && (
              <>
                <div
                  className="absolute"
                  style={{
                    left: 0,
                    top: devInspectNode.y - doc.artboard.y + devInspectNode.height / 2,
                    width: devRedlines.left,
                    borderTop: `${1.2 / viewport.zoom}px dashed #06B6D4`,
                  }}
                />
                <span
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded font-mono-tech font-semibold text-slate-950 px-1"
                  style={{
                    left: devRedlines.left / 2,
                    top: devInspectNode.y - doc.artboard.y + devInspectNode.height / 2,
                    fontSize: `${9 / viewport.zoom}px`,
                    backgroundColor: '#06B6D4',
                  }}
                >
                  {devRedlines.left}px
                </span>
              </>
            )}
            {/* Right measurement */}
            {devRedlines.right > 0 && (
              <>
                <div
                  className="absolute"
                  style={{
                    left: devInspectNode.x - doc.artboard.x + devInspectNode.width,
                    top: devInspectNode.y - doc.artboard.y + devInspectNode.height / 2,
                    width: devRedlines.right,
                    borderTop: `${1.2 / viewport.zoom}px dashed #06B6D4`,
                  }}
                />
                <span
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded font-mono-tech font-semibold text-slate-950 px-1"
                  style={{
                    left: devInspectNode.x - doc.artboard.x + devInspectNode.width + devRedlines.right / 2,
                    top: devInspectNode.y - doc.artboard.y + devInspectNode.height / 2,
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

        {/* Rubber-band Marquee Box */}
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

        {/* Animated Co-Designer Live Presence Cursor */}
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

      {/* Bottom Floating Precision Telemetry Pill */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 h-7 px-3.5 rounded-full border flex items-center gap-3 text-[10px] font-mono-tech whitespace-nowrap backdrop-blur-md pointer-events-none"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--studio-surface) 88%, transparent)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text-secondary)',
        }}
      >
        <span className="min-w-[84px]">
          X:{pointerCanvas.x}  Y:{pointerCanvas.y}
        </span>
        <span className="opacity-35">|</span>
        <span className="hidden md:inline">{labels.canvasHint}</span>
        <span className="hidden md:inline opacity-35">|</span>
        <span className="flex items-center gap-1.5" style={{ color: 'var(--studio-cyan)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {crdtSynced ? labels.yjsSynced : 'Local'}
        </span>
      </div>
    </div>
  );
}
