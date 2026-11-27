import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Artboard,
  AutoLayoutConfig,
  CanvasNode,
  ChromeTheme,
  DesignSnapshot,
  DesignTokens,
  DocumentState,
  InspectorTab,
  LeftRailTab,
  Locale,
  Point,
  ToolType,
  UiMode,
  Viewport,
  ViewportBreakpoint,
} from './types/canvas';
import { createDocumentByTemplateId } from './engines/templates';
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type HistoryState,
} from './engines/history';
import {
  clampZoom,
  fitArtboardsToViewport,
  fitArtboardToViewport,
  zoomAtPoint,
} from './engines/viewport';
import {
  AtelierCrdtRoom,
  computeCoDesignerStep,
} from './engines/collab';
import {
  createGeneratedNodesForCommand,
  resolveThemeCommand,
} from './engines/commands';
import {
  applyAutoLayoutToArtboard,
  applyAutoLayoutToFrame,
} from './engines/autolayout';
import { applyDesignTokenTheme } from './engines/designTokens';
import { getBreakpointPreset } from './engines/responsive';
import { instantiateAssetKitItem } from './engines/assets';
import { generateReactTailwind } from './engines/codegen';
import { downloadTextFile, exportNodeToSvg } from './engines/exporter';
import { createImageNode } from './engines/nodeFactory';
import type { StudioPhotoPreset } from './engines/media';
import {
  clearWorkspaceLocalStorage,
  getDocumentArtboards,
  loadWorkspaceFromLocalStorage,
  parseAndValidateProjectFile,
  saveWorkspaceToLocalStorage,
  serializeProjectFile,
} from './engines/projectStorage';
import { LABELS } from './i18n/labels';
import { TopBar } from './components/TopBar';
import { ToolDock } from './components/ToolDock';
import { LayersPanel } from './components/LayersPanel';
import { CanvasStage, type ContextMenuAction } from './components/CanvasStage';
import { InspectorPanel, type AlignDirection } from './components/InspectorPanel';
import { CommandPalette } from './components/CommandPalette';
import { ExportModal } from './components/ExportModal';
import { PrototypePlayerModal } from './components/PrototypePlayerModal';
import { EnterpriseLicenseModal } from './components/EnterpriseLicenseModal';

const TOOL_HOTKEYS: Record<string, ToolType> = {
  v: 'select',
  h: 'hand',
  p: 'pen',
  i: 'image',
  f: 'frame',
  r: 'rect',
  o: 'ellipse',
  t: 'text',
  b: 'button',
  g: 'glass',
  l: 'line',
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  );
}

function formatClock(): string {
  return new Date().toTimeString().slice(0, 5);
}

export function App() {
  const [history, setHistory] = useState<HistoryState<DocumentState>>(() => {
    const restored = loadWorkspaceFromLocalStorage();
    return createHistory(
      restored ?? createDocumentByTemplateId('fintech-spatial'),
    );
  });
  const [snapshots, setSnapshots] = useState<DesignSnapshot[]>(() => [
    {
      id: 'snap-initial',
      label: 'v4.0 Enterprise FinTech',
      timestamp: formatClock(),
      doc: createDocumentByTemplateId('fintech-spatial'),
    },
  ]);
  const [activeArtboardId, setActiveArtboardId] = useState<string>(
    () => history.present.artboard.id,
  );
  const [liveNodesOverride, setLiveNodesOverride] = useState<CanvasNode[] | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [uiMode, setUiMode] = useState<UiMode>('design');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('design');
  const [leftTab, setLeftTab] = useState<LeftRailTab>('layers');
  const [chromeTheme, setChromeTheme] = useState<ChromeTheme>('dark');
  const [locale, setLocale] = useState<Locale>('en');
  const [layersOpen, setLayersOpen] = useState(true);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [breakpoint, setBreakpoint] = useState<ViewportBreakpoint>('fluid');
  const [smartGuidesEnabled, setSmartGuidesEnabled] = useState(true);
  const [snapToGrid8px, setSnapToGrid8px] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [altPressed, setAltPressed] = useState(false);
  const [stack3D, setStack3D] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [coDesignerActive, setCoDesignerActive] = useState(false);
  const [coDesignerStep, setCoDesignerStep] = useState(0);
  const [crdtRevisions, setCrdtRevisions] = useState(1);
  const [crdtSynced, setCrdtSynced] = useState(true);
  const [savedLocally, setSavedLocally] = useState(true);
  const [studioNotice, setStudioNotice] = useState<string | null>(null);

  const stageSizeRef = useRef({ width: 960, height: 640 });
  const hasCenteredInitialRef = useRef(false);
  const [viewport, setViewport] = useState<Viewport>({ x: 32, y: 56, zoom: 0.64 });

  const roomRef = useRef<AtelierCrdtRoom | null>(null);
  const suppressBroadcastRef = useRef(false);

  const committedDoc = history.present;
  const effectiveDoc: DocumentState = useMemo(
    () =>
      liveNodesOverride
        ? { ...committedDoc, nodes: liveNodesOverride }
        : committedDoc,
    [committedDoc, liveNodesOverride],
  );
  const artboards = useMemo(
    () => getDocumentArtboards(effectiveDoc),
    [effectiveDoc],
  );
  const activeArtboard = useMemo(
    () => artboards.find((a) => a.id === activeArtboardId) ?? effectiveDoc.artboard,
    [artboards, activeArtboardId, effectiveDoc.artboard],
  );

  const labels = LABELS[locale];

  const notify = useCallback((msg: string) => {
    setStudioNotice(msg);
    window.setTimeout(() => {
      setStudioNotice((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  // Local-first auto-save to localStorage
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ok = saveWorkspaceToLocalStorage(committedDoc);
      setSavedLocally(ok);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [committedDoc]);

  // Initialize Yjs CRDT multiplayer room
  useEffect(() => {
    const room = new AtelierCrdtRoom(committedDoc);
    roomRef.current = room;
    setCrdtSynced(true);

    room.onRemoteDocument((remoteDoc) => {
      suppressBroadcastRef.current = true;
      setLiveNodesOverride(null);
      setHistory((prev) => pushHistory(prev, remoteDoc));
      setCrdtRevisions(room.getTelemetry().revisionCount);
      setTimeout(() => {
        suppressBroadcastRef.current = false;
      }, 0);
    });

    return () => {
      room.destroy();
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (suppressBroadcastRef.current || !roomRef.current) return;
    roomRef.current.pushLocalDocument(committedDoc);
    setCrdtRevisions(roomRef.current.getTelemetry().revisionCount);
  }, [committedDoc]);

  useEffect(() => {
    if (!coDesignerActive) return;
    const id = window.setInterval(() => {
      setCoDesignerStep((s) => s + 1);
    }, 2200);
    return () => window.clearInterval(id);
  }, [coDesignerActive]);

  const coDesigner = useMemo(
    () => computeCoDesignerStep(effectiveDoc, coDesignerStep, coDesignerActive),
    [effectiveDoc, coDesignerStep, coDesignerActive],
  );

  useEffect(() => {
    const root = document.documentElement;
    if (chromeTheme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [chromeTheme]);

  const toggleChromeTheme = useCallback(() => {
    const apply = () =>
      setChromeTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

    const docWithTransition = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (typeof docWithTransition.startViewTransition === 'function') {
      docWithTransition.startViewTransition(apply);
    } else {
      apply();
    }
  }, []);

  const commitDocument = useCallback((nextDoc: DocumentState) => {
    setLiveNodesOverride(null);
    setHistory((prev) => pushHistory(prev, nextDoc));
  }, []);

  const handleStageResize = useCallback(
    (size: { width: number; height: number }) => {
      stageSizeRef.current = size;
      if (!hasCenteredInitialRef.current && size.width > 120 && size.height > 120) {
        hasCenteredInitialRef.current = true;
        setViewport(
          fitArtboardsToViewport(getDocumentArtboards(committedDoc), size, 52),
        );
      }
    },
    [committedDoc],
  );

  const handleFitToScreen = useCallback(() => {
    setViewport(
      fitArtboardsToViewport(
        getDocumentArtboards(committedDoc),
        stageSizeRef.current,
        52,
      ),
    );
  }, [committedDoc]);

  const handleSelectTemplate = useCallback((templateId: string) => {
    const next = createDocumentByTemplateId(templateId);
    setSelectedIds([]);
    setLiveNodesOverride(null);
    setStack3D(false);
    setActiveArtboardId(next.artboard.id);
    setHistory((prev) => pushHistory(prev, next));
    setViewport(
      fitArtboardsToViewport(
        getDocumentArtboards(next),
        stageSizeRef.current,
        52,
      ),
    );
  }, []);

  const handleExportProjectFile = useCallback(() => {
    const json = serializeProjectFile(committedDoc);
    const slug = committedDoc.artboard.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    downloadTextFile(
      json,
      `${slug || 'atelier-project'}.atelier.json`,
      'application/json;charset=utf-8',
    );
    notify('Saved .atelier.json project file');
  }, [committedDoc, notify]);

  const handleImportProjectFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = parseAndValidateProjectFile(String(reader.result ?? ''));
        if (!result.ok) {
          notify(`Invalid project file: ${result.error}`);
          return;
        }
        commitDocument(result.doc);
        setActiveArtboardId(result.doc.artboard.id);
        setSelectedIds([]);
        setViewport(
          fitArtboardsToViewport(
            getDocumentArtboards(result.doc),
            stageSizeRef.current,
            52,
          ),
        );
        notify(`Opened project: ${result.doc.artboard.name}`);
      };
      reader.readAsText(file);
    },
    [commitDocument, notify],
  );

  const handleResetWorkspace = useCallback(() => {
    clearWorkspaceLocalStorage();
    const fresh = createDocumentByTemplateId('fintech-spatial');
    commitDocument(fresh);
    setActiveArtboardId(fresh.artboard.id);
    setSelectedIds([]);
    setStack3D(false);
    setViewport(
      fitArtboardsToViewport(
        getDocumentArtboards(fresh),
        stageSizeRef.current,
        52,
      ),
    );
    notify('Workspace reset to default');
  }, [commitDocument, notify]);

  const handleSaveSnapshot = useCallback(
    (label?: string) => {
      const nextIndex = snapshots.length + 1;
      const snap: DesignSnapshot = {
        id: `snap-${Date.now().toString(36)}`,
        label: label || `v3.${nextIndex} ${committedDoc.artboard.name}`,
        timestamp: formatClock(),
        doc: structuredClone(committedDoc),
      };
      setSnapshots((prev) => [snap, ...prev]);
      notify(`Snapshot saved: ${snap.label}`);
    },
    [committedDoc, notify, snapshots.length],
  );

  const handleRestoreSnapshot = useCallback(
    (snapshotId: string) => {
      const target = snapshots.find((s) => s.id === snapshotId);
      if (!target) return;
      const cloned = structuredClone(target.doc);
      commitDocument(cloned);
      setActiveArtboardId(cloned.artboard.id);
      setSelectedIds([]);
      notify(`Restored snapshot: ${target.label}`);
    },
    [commitDocument, notify, snapshots],
  );

  const handleInsertStudioPhoto = useCallback(
    (photo: StudioPhotoPreset) => {
      const targetBoard =
        artboards.find((a) => a.id === activeArtboardId) ?? committedDoc.artboard;
      const w = Math.min(photo.defaultW, targetBoard.width - 48);
      const h = Math.min(photo.defaultH, targetBoard.height - 48);
      const x = targetBoard.x + Math.round((targetBoard.width - w) / 2);
      const y = targetBoard.y + Math.round((targetBoard.height - h) / 2);
      const node = createImageNode(
        photo.src,
        photo.title,
        x,
        y,
        w,
        h,
        committedDoc.tokens,
        targetBoard.id,
      );
      commitDocument({
        ...committedDoc,
        nodes: [...committedDoc.nodes, node],
      });
      setSelectedIds([node.id]);
      setUiMode('design');
      notify(`Inserted photo: ${photo.title}`);
    },
    [activeArtboardId, artboards, committedDoc, commitDocument, notify],
  );

  const insertImageFileAt = useCallback(
    (file: File, pt?: Point, targetBoardId?: string) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? '');
        if (!dataUrl) return;
        const board =
          artboards.find((a) => a.id === (targetBoardId ?? activeArtboardId)) ??
          committedDoc.artboard;
        const w = 280;
        const h = 210;
        const x = pt ? pt.x - w / 2 : board.x + (board.width - w) / 2;
        const y = pt ? pt.y - h / 2 : board.y + (board.height - h) / 2;
        const node = createImageNode(
          dataUrl,
          file.name.replace(/\.[^.]+$/, '') || 'Uploaded Photo',
          x,
          y,
          w,
          h,
          committedDoc.tokens,
          board.id,
        );
        commitDocument({
          ...committedDoc,
          nodes: [...committedDoc.nodes, node],
        });
        setSelectedIds([node.id]);
        setUiMode('design');
        notify(`Added local photo: ${node.name}`);
      };
      reader.readAsDataURL(file);
    },
    [activeArtboardId, artboards, committedDoc, commitDocument, notify],
  );

  const handleLiveUpdateNodes = useCallback((nextNodes: CanvasNode[]) => {
    setLiveNodesOverride(nextNodes);
  }, []);

  const handleCommitNodes = useCallback((nextNodes: CanvasNode[]) => {
    setLiveNodesOverride(null);
    setHistory((prev) =>
      pushHistory(prev, {
        ...prev.present,
        nodes: nextNodes,
      }),
    );
  }, []);

  const handleUpdateNode = useCallback(
    (id: string, patch: Partial<CanvasNode>) => {
      setHistory((prev) =>
        pushHistory(prev, {
          ...prev.present,
          nodes: prev.present.nodes.map((n) =>
            n.id === id ? { ...n, ...patch } : n,
          ),
        }),
      );
    },
    [],
  );

  const handleApplyAutoLayout = useCallback(
    (frameId: string, config: AutoLayoutConfig) => {
      setHistory((prev) =>
        pushHistory(prev, {
          ...prev.present,
          nodes: applyAutoLayoutToFrame(frameId, prev.present.nodes, config),
        }),
      );
      if (config.enabled) {
        const modeLbl =
          config.layoutMode === 'grid'
            ? `Grid ${config.columns ?? 2}-col`
            : `Flex ${config.direction}`;
        notify(`Auto-Layout applied (${modeLbl}, gap ${config.gap}px)`);
      }
    },
    [notify],
  );

  const handleApplyArtboardAutoLayout = useCallback(
    (config: AutoLayoutConfig) => {
      setHistory((prev) => {
        const boards = getDocumentArtboards(prev.present);
        const target =
          boards.find((b) => b.id === activeArtboardId) ?? prev.present.artboard;
        const { artboard: nextBoard, nodes: nextNodes } =
          applyAutoLayoutToArtboard(
            target,
            prev.present.nodes,
            config,
            prev.present.artboard.id,
          );
        const updatedBoards = boards.map((b) =>
          b.id === target.id ? nextBoard : b,
        );
        const nextPrimary =
          prev.present.artboard.id === target.id
            ? nextBoard
            : prev.present.artboard;
        return pushHistory(prev, {
          ...prev.present,
          artboard: nextPrimary,
          artboards: updatedBoards,
          nodes: nextNodes,
        });
      });
      if (config.enabled) {
        const modeLbl =
          config.layoutMode === 'grid'
            ? `CSS Grid ${config.columns ?? 2}-col`
            : `Flexbox ${config.direction}`;
        notify(`Artboard Auto-Layout: ${modeLbl} · gap ${config.gap}px`);
      }
    },
    [activeArtboardId, notify],
  );

  const handleSelectBreakpoint = useCallback(
    (nextBp: ViewportBreakpoint) => {
      setBreakpoint(nextBp);
      const preset = getBreakpointPreset(nextBp);
      if (nextBp === 'fluid') {
        setViewport(
          fitArtboardsToViewport(
            getDocumentArtboards(committedDoc),
            stageSizeRef.current,
            52,
          ),
        );
        notify('Viewport: Fluid Fit (All Artboards)');
        return;
      }
      const targetBoard =
        getDocumentArtboards(committedDoc).find((b) => b.id === activeArtboardId) ??
        committedDoc.artboard;
      setViewport(
        fitArtboardToViewport(targetBoard, stageSizeRef.current, 60),
      );
      notify(`Viewport: ${preset.label} · ${preset.columns}-Col Grid`);
    },
    [activeArtboardId, committedDoc, notify],
  );

  const handleUpdateArtboard = useCallback(
    (patch: Partial<Artboard>) => {
      setHistory((prev) => {
        const boards = getDocumentArtboards(prev.present);
        const updatedBoards = boards.map((b) =>
          b.id === activeArtboardId ? { ...b, ...patch } : b,
        );
        const primaryUpdated =
          prev.present.artboard.id === activeArtboardId
            ? { ...prev.present.artboard, ...patch }
            : prev.present.artboard;
        return pushHistory(prev, {
          ...prev.present,
          artboard: primaryUpdated,
          artboards: updatedBoards,
        });
      });
    },
    [activeArtboardId],
  );

  const handleUpdateTokens = useCallback(
    (nextTokens: DesignTokens) => {
      setHistory((prev) =>
        pushHistory(prev, applyDesignTokenTheme(prev.present, nextTokens)),
      );
      notify(`Design Tokens applied: ${nextTokens.name}`);
    },
    [notify],
  );

  const handleInsertAsset = useCallback(
    (assetId: string) => {
      const targetBoard =
        artboards.find((a) => a.id === activeArtboardId) ?? committedDoc.artboard;
      const created = instantiateAssetKitItem(assetId, committedDoc, {
        x: targetBoard.x + targetBoard.width / 2,
        y: targetBoard.y + targetBoard.height / 2,
      }).map((n) => ({ ...n, artboardId: targetBoard.id }));
      if (created.length === 0) return;
      commitDocument({
        ...committedDoc,
        nodes: [...committedDoc.nodes, ...created],
      });
      setSelectedIds([created[0].id]);
      setUiMode('design');
      notify(`Inserted ${created[0].name} (+${created.length} layers)`);
    },
    [activeArtboardId, artboards, committedDoc, commitDocument, notify],
  );

  const handleUndo = useCallback(() => {
    setLiveNodesOverride(null);
    setHistory((prev) => undoHistory(prev));
  }, []);

  const handleRedo = useCallback(() => {
    setLiveNodesOverride(null);
    setHistory((prev) => redoHistory(prev));
  }, []);

  const handleDuplicate = useCallback(() => {
    if (selectedIds.length === 0) return;
    const copies: CanvasNode[] = [];
    for (const id of selectedIds) {
      const orig = committedDoc.nodes.find((n) => n.id === id);
      if (!orig) continue;
      copies.push({
        ...orig,
        id: `${orig.id}-copy-${Date.now().toString(36).slice(-4)}`,
        name: `${orig.name} Copy`,
        x: orig.x + 20,
        y: orig.y + 20,
      });
    }
    if (copies.length === 0) return;
    commitDocument({
      ...committedDoc,
      nodes: [...committedDoc.nodes, ...copies],
    });
    setSelectedIds(copies.map((c) => c.id));
  }, [committedDoc, commitDocument, selectedIds]);

  const handleDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    const remaining = committedDoc.nodes.filter(
      (n) => !selectedIds.includes(n.id) || n.locked,
    );
    commitDocument({ ...committedDoc, nodes: remaining });
    setSelectedIds([]);
  }, [committedDoc, commitDocument, selectedIds]);

  const handleBringForward = useCallback(() => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const idx = committedDoc.nodes.findIndex((n) => n.id === id);
    if (idx < 0 || idx >= committedDoc.nodes.length - 1) return;
    const next = [...committedDoc.nodes];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    commitDocument({ ...committedDoc, nodes: next });
  }, [committedDoc, commitDocument, selectedIds]);

  const handleSendBackward = useCallback(() => {
    if (selectedIds.length !== 1) return;
    const id = selectedIds[0];
    const idx = committedDoc.nodes.findIndex((n) => n.id === id);
    if (idx <= 0) return;
    const next = [...committedDoc.nodes];
    [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
    commitDocument({ ...committedDoc, nodes: next });
  }, [committedDoc, commitDocument, selectedIds]);

  const handleContextAction = useCallback(
    async (nodeId: string, action: ContextMenuAction) => {
      const node = committedDoc.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      switch (action) {
        case 'duplicate': {
          const copy: CanvasNode = {
            ...node,
            id: `${node.id}-copy-${Date.now().toString(36).slice(-4)}`,
            name: `${node.name} Copy`,
            x: node.x + 20,
            y: node.y + 20,
          };
          commitDocument({
            ...committedDoc,
            nodes: [...committedDoc.nodes, copy],
          });
          setSelectedIds([copy.id]);
          notify(`Duplicated ${node.name}`);
          break;
        }
        case 'bring-front': {
          const rest = committedDoc.nodes.filter((n) => n.id !== nodeId);
          commitDocument({ ...committedDoc, nodes: [...rest, node] });
          break;
        }
        case 'send-back': {
          const rest = committedDoc.nodes.filter((n) => n.id !== nodeId);
          commitDocument({ ...committedDoc, nodes: [node, ...rest] });
          break;
        }
        case 'wrap-glass': {
          const pad = 18;
          const wrapper: CanvasNode = {
            id: `glass-wrap-${Date.now().toString(36)}`,
            artboardId: node.artboardId ?? committedDoc.artboard.id,
            name: `${node.name} Glass Frame`,
            type: 'glass',
            x: Math.round(node.x - pad),
            y: Math.round(node.y - pad),
            width: Math.round(node.width + pad * 2),
            height: Math.round(node.height + pad * 2),
            rotation: 0,
            radius: committedDoc.tokens.radiusBase,
            opacity: 1,
            fill: {
              kind: 'gradient',
              color: committedDoc.tokens.surfaceCard,
              gradient: {
                angle: 145,
                from: committedDoc.tokens.surfaceCard,
                to: committedDoc.tokens.surfaceElevated,
              },
            },
            strokeColor: committedDoc.tokens.borderSubtle,
            strokeWidth: 1,
            blur: 20,
            shadow: 'elevated',
            blendMode: 'normal',
            locked: false,
            visible: true,
            tokenBinding: {
              fill: 'surfaceCard',
              fillGradientFrom: 'surfaceCard',
              fillGradientTo: 'surfaceElevated',
              stroke: 'borderSubtle',
              radius: 'radiusBase',
            },
          };
          const idx = committedDoc.nodes.findIndex((n) => n.id === nodeId);
          const next = [...committedDoc.nodes];
          next.splice(Math.max(0, idx), 0, wrapper);
          commitDocument({ ...committedDoc, nodes: next });
          setSelectedIds([wrapper.id]);
          notify(`Wrapped ${node.name} in Glass Card`);
          break;
        }
        case 'copy-react': {
          const code = generateReactTailwind(committedDoc, node);
          try {
            await navigator.clipboard.writeText(code);
          } catch {
            // Clipboard fallback ignored
          }
          notify(`Copied React + TW4 for ${node.name}`);
          break;
        }
        case 'copy-svg': {
          const svg = exportNodeToSvg(node, committedDoc);
          try {
            await navigator.clipboard.writeText(svg);
          } catch {
            // Clipboard fallback ignored
          }
          notify(`Copied standalone SVG for ${node.name}`);
          break;
        }
        case 'toggle-lock': {
          handleUpdateNode(nodeId, { locked: !node.locked });
          break;
        }
        case 'delete': {
          if (node.locked) return;
          commitDocument({
            ...committedDoc,
            nodes: committedDoc.nodes.filter((n) => n.id !== nodeId),
          });
          setSelectedIds([]);
          break;
        }
      }
    },
    [committedDoc, commitDocument, handleUpdateNode, notify],
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      const node = committedDoc.nodes.find((n) => n.id === id);
      if (!node) return;
      handleUpdateNode(id, { visible: !node.visible });
    },
    [committedDoc.nodes, handleUpdateNode],
  );

  const handleToggleLock = useCallback(
    (id: string) => {
      const node = committedDoc.nodes.find((n) => n.id === id);
      if (!node) return;
      handleUpdateNode(id, { locked: !node.locked });
    },
    [committedDoc.nodes, handleUpdateNode],
  );

  const handleAlignSelection = useCallback(
    (dir: AlignDirection) => {
      const targets = committedDoc.nodes.filter(
        (n) => selectedIds.includes(n.id) && !n.locked,
      );
      if (targets.length === 0) return;

      const parentBoard =
        artboards.find((b) => b.id === (targets[0].artboardId ?? committedDoc.artboard.id)) ??
        committedDoc.artboard;

      const refBounds =
        targets.length === 1
          ? {
              x: parentBoard.x,
              y: parentBoard.y,
              width: parentBoard.width,
              height: parentBoard.height,
            }
          : {
              x: Math.min(...targets.map((n) => n.x)),
              y: Math.min(...targets.map((n) => n.y)),
              width:
                Math.max(...targets.map((n) => n.x + n.width)) -
                Math.min(...targets.map((n) => n.x)),
              height:
                Math.max(...targets.map((n) => n.y + n.height)) -
                Math.min(...targets.map((n) => n.y)),
            };

      const nextNodes = committedDoc.nodes.map((node) => {
        if (!selectedIds.includes(node.id) || node.locked) return node;
        switch (dir) {
          case 'left':
            return { ...node, x: Math.round(refBounds.x) };
          case 'centerH':
            return {
              ...node,
              x: Math.round(refBounds.x + (refBounds.width - node.width) / 2),
            };
          case 'right':
            return {
              ...node,
              x: Math.round(refBounds.x + refBounds.width - node.width),
            };
          case 'top':
            return { ...node, y: Math.round(refBounds.y) };
          case 'centerV':
            return {
              ...node,
              y: Math.round(refBounds.y + (refBounds.height - node.height) / 2),
            };
          case 'bottom':
            return {
              ...node,
              y: Math.round(refBounds.y + refBounds.height - node.height),
            };
        }
      });

      commitDocument({ ...committedDoc, nodes: nextNodes });
    },
    [artboards, committedDoc, commitDocument, selectedIds],
  );

  const handleExecuteCommand = useCallback(
    (commandId: string) => {
      const generated = createGeneratedNodesForCommand(commandId, committedDoc);
      if (generated.length > 0) {
        commitDocument({
          ...committedDoc,
          nodes: [...committedDoc.nodes, ...generated],
        });
        setSelectedIds([generated[0].id]);
        setUiMode('design');
        return;
      }

      const theme = resolveThemeCommand(commandId);
      if (theme) {
        handleUpdateTokens(theme);
        setInspectorTab('tokens');
        return;
      }

      if (commandId === 'mode-present-prototype') {
        setPlayerOpen(true);
        return;
      }
      if (commandId === 'enterprise-license') {
        setEnterpriseOpen(true);
        return;
      }
      if (commandId === 'layout-toggle-grid-8px') {
        setSnapToGrid8px((v) => !v);
        notify('Toggled 8px Baseline Snap Grid');
        return;
      }
      if (commandId === 'mode-prototype') {
        setUiMode('prototype');
        return;
      }
      if (commandId === 'mode-toggle-dev') {
        setUiMode((m) => (m === 'dev' ? 'design' : 'dev'));
        return;
      }
      if (commandId === 'mode-toggle-3dstack') {
        setStack3D((v) => !v);
        return;
      }
      if (commandId === 'project-save-file') {
        handleExportProjectFile();
        return;
      }
      if (commandId === 'snapshot-save') {
        handleSaveSnapshot();
        return;
      }
      if (commandId === 'layout-center-selected') {
        handleAlignSelection('centerH');
        return;
      }
      if (commandId === 'export-svg') {
        setExportOpen(true);
        return;
      }
      if (commandId === 'template-editorial') {
        handleSelectTemplate('luxury-editorial');
      } else if (commandId === 'template-swiss') {
        handleSelectTemplate('swiss-poster');
      } else if (commandId === 'template-saas') {
        handleSelectTemplate('ai-saas-hero');
      } else if (commandId === 'template-tokens') {
        handleSelectTemplate('token-sheet');
      } else if (commandId === 'template-fintech') {
        handleSelectTemplate('fintech-spatial');
      }
    },
    [
      committedDoc,
      commitDocument,
      handleAlignSelection,
      handleExportProjectFile,
      handleSaveSnapshot,
      handleSelectTemplate,
      handleUpdateTokens,
      notify,
    ],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setAltPressed(true);
      }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
        return;
      }

      if (isEditableTarget(e.target) || playerOpen) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(true);
        return;
      }

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicate();
        return;
      }

      if (e.shiftKey && e.code === 'Digit1') {
        e.preventDefault();
        setUiMode('design');
        return;
      }
      if (e.shiftKey && e.code === 'Digit2') {
        e.preventDefault();
        setUiMode('prototype');
        return;
      }
      if (e.shiftKey && e.code === 'Digit3') {
        e.preventDefault();
        setUiMode('dev');
        return;
      }
      if (e.shiftKey && e.code === 'Digit0') {
        e.preventDefault();
        handleFitToScreen();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDelete();
        }
        return;
      }

      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
        selectedIds.length > 0
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
        const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
        const nextNodes = committedDoc.nodes.map((n) =>
          selectedIds.includes(n.id) && !n.locked
            ? { ...n, x: n.x + dx, y: n.y + dy }
            : n,
        );
        commitDocument({ ...committedDoc, nodes: nextNodes });
        return;
      }

      const hotkeyTool = TOOL_HOTKEYS[e.key.toLowerCase()];
      if (!mod && !e.shiftKey && !e.altKey && hotkeyTool) {
        e.preventDefault();
        setActiveTool(hotkeyTool);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
      if (e.key === 'Alt') setAltPressed(false);
    };

    const handleBlur = () => {
      setSpacePressed(false);
      setAltPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    committedDoc,
    commitDocument,
    handleDelete,
    handleDuplicate,
    handleFitToScreen,
    handleRedo,
    handleUndo,
    playerOpen,
    selectedIds,
  ]);

  const selectedNodes = useMemo(
    () => effectiveDoc.nodes.filter((n) => selectedIds.includes(n.id)),
    [effectiveDoc.nodes, selectedIds],
  );

  const handleZoomBy = (delta: number) => {
    const center = {
      x: stageSizeRef.current.width / 2,
      y: stageSizeRef.current.height / 2,
    };
    setViewport((v) => zoomAtPoint(v, clampZoom(v.zoom + delta), center));
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col relative"
      style={{
        backgroundColor: 'var(--studio-canvas)',
        color: 'var(--studio-text)',
      }}
    >
      <TopBar
        templateId={effectiveDoc.templateId}
        onSelectTemplate={handleSelectTemplate}
        uiMode={uiMode}
        onSetUiMode={setUiMode}
        onOpenPrototypePlayer={() => setPlayerOpen(true)}
        onOpenEnterpriseModal={() => setEnterpriseOpen(true)}
        mobileInspectorOpen={mobileInspectorOpen}
        onToggleMobileInspector={() => setMobileInspectorOpen((v) => !v)}
        snapshots={snapshots}
        onSaveSnapshot={handleSaveSnapshot}
        onRestoreSnapshot={handleRestoreSnapshot}
        onExportProjectFile={handleExportProjectFile}
        onImportProjectFile={handleImportProjectFile}
        onResetWorkspace={handleResetWorkspace}
        savedLocally={savedLocally}
        zoom={viewport.zoom}
        onZoomIn={() => handleZoomBy(0.15)}
        onZoomOut={() => handleZoomBy(-0.15)}
        onZoomReset={() =>
          setViewport((v) =>
            zoomAtPoint(v, 1, {
              x: stageSizeRef.current.width / 2,
              y: stageSizeRef.current.height / 2,
            }),
          )
        }
        onFitToScreen={handleFitToScreen}
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        coDesignerActive={coDesignerActive}
        onToggleCoDesigner={() => setCoDesignerActive((v) => !v)}
        crdtRevisions={crdtRevisions}
        chromeTheme={chromeTheme}
        onToggleChromeTheme={toggleChromeTheme}
        locale={locale}
        onToggleLocale={() => setLocale((l) => (l === 'en' ? 'vi' : 'en'))}
        onOpenCommandBar={() => setCommandOpen(true)}
        onOpenExportModal={() => setExportOpen(true)}
        labels={labels}
      />

      <main className="flex-1 min-h-0 flex overflow-hidden">
        <ToolDock
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onUploadLocalImage={(file) => insertImageFileAt(file)}
          layersOpen={layersOpen}
          onToggleLayers={() => setLayersOpen((o) => !o)}
        />

        {layersOpen && (
          <LayersPanel
            artboards={artboards}
            activeArtboardId={activeArtboardId}
            onSelectArtboard={setActiveArtboardId}
            nodes={effectiveDoc.nodes}
            selectedIds={selectedIds}
            leftTab={leftTab}
            onSetLeftTab={setLeftTab}
            onSelectIds={setSelectedIds}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onBringForward={handleBringForward}
            onSendBackward={handleSendBackward}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onInsertAsset={handleInsertAsset}
            onInsertStudioPhoto={handleInsertStudioPhoto}
            onUploadLocalImage={(file) => insertImageFileAt(file)}
            labels={labels}
          />
        )}

        <CanvasStage
          doc={effectiveDoc}
          activeArtboardId={activeArtboardId}
          onSelectArtboard={setActiveArtboardId}
          viewport={viewport}
          onViewportChange={setViewport}
          onStageResize={handleStageResize}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          selectedIds={selectedIds}
          onSelectIds={setSelectedIds}
          uiMode={uiMode}
          spacePressed={spacePressed}
          altPressed={altPressed}
          stack3D={stack3D}
          onToggleStack3D={() => setStack3D((v) => !v)}
          breakpoint={breakpoint}
          onSelectBreakpoint={handleSelectBreakpoint}
          smartGuidesEnabled={smartGuidesEnabled}
          onToggleSmartGuides={() => setSmartGuidesEnabled((v) => !v)}
          snapToGrid8px={snapToGrid8px}
          onToggleSnapToGrid8px={() => setSnapToGrid8px((v) => !v)}
          onLiveUpdateNodes={handleLiveUpdateNodes}
          onCommitNodes={handleCommitNodes}
          onContextAction={handleContextAction}
          onDropLocalImage={(file, pt, boardId) =>
            insertImageFileAt(file, pt, boardId)
          }
          coDesigner={coDesigner}
          crdtSynced={crdtSynced}
          labels={labels}
        />

        <InspectorPanel
          doc={effectiveDoc}
          activeArtboard={activeArtboard}
          selectedNodes={selectedNodes}
          uiMode={uiMode}
          activeTab={inspectorTab}
          onSetActiveTab={setInspectorTab}
          onSelectIds={setSelectedIds}
          onUpdateNode={handleUpdateNode}
          onApplyAutoLayout={handleApplyAutoLayout}
          onApplyArtboardAutoLayout={handleApplyArtboardAutoLayout}
          onUpdateArtboard={handleUpdateArtboard}
          onUpdateTokens={handleUpdateTokens}
          onAlignSelection={handleAlignSelection}
          onOpenExportModal={() => setExportOpen(true)}
          onOpenPrototypePlayer={() => setPlayerOpen(true)}
          onOpenEnterpriseModal={() => setEnterpriseOpen(true)}
          mobileOpen={mobileInspectorOpen}
          onCloseMobile={() => setMobileInspectorOpen(false)}
          labels={labels}
        />
      </main>

      {studioNotice && (
        <div
          data-testid="studio-notice"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full border font-mono-tech text-[11px] shadow-2xl backdrop-blur-md pointer-events-none"
          style={{
            backgroundColor: 'var(--studio-surface)',
            borderColor: 'var(--studio-cyan)',
            color: 'var(--studio-cyan)',
          }}
        >
          {studioNotice}
        </div>
      )}

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onExecute={handleExecuteCommand}
        labels={labels}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        doc={effectiveDoc}
        labels={labels}
      />

      <PrototypePlayerModal
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        doc={effectiveDoc}
        onUpdateTokens={handleUpdateTokens}
        onSwitchTemplate={handleSelectTemplate}
      />

      <EnterpriseLicenseModal
        open={enterpriseOpen}
        onClose={() => setEnterpriseOpen(false)}
        locale={locale}
      />
    </div>
  );
}

export default App;
