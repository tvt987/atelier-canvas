import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Artboard,
  CanvasNode,
  ChromeTheme,
  DesignTokens,
  DocumentState,
  InspectorTab,
  Locale,
  ToolType,
  UiMode,
  Viewport,
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
import { LABELS } from './i18n/labels';
import { TopBar } from './components/TopBar';
import { ToolDock } from './components/ToolDock';
import { LayersPanel } from './components/LayersPanel';
import { CanvasStage } from './components/CanvasStage';
import { InspectorPanel, type AlignDirection } from './components/InspectorPanel';
import { CommandPalette } from './components/CommandPalette';
import { ExportModal } from './components/ExportModal';

const TOOL_HOTKEYS: Record<string, ToolType> = {
  v: 'select',
  h: 'hand',
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

export function App() {
  const [history, setHistory] = useState<HistoryState<DocumentState>>(() =>
    createHistory(createDocumentByTemplateId('fintech-spatial')),
  );
  const [liveNodesOverride, setLiveNodesOverride] = useState<CanvasNode[] | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [uiMode, setUiMode] = useState<UiMode>('design');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('design');
  const [chromeTheme, setChromeTheme] = useState<ChromeTheme>('dark');
  const [locale, setLocale] = useState<Locale>('en');
  const [layersOpen, setLayersOpen] = useState(true);
  const [spacePressed, setSpacePressed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [coDesignerActive, setCoDesignerActive] = useState(false);
  const [coDesignerStep, setCoDesignerStep] = useState(0);
  const [crdtRevisions, setCrdtRevisions] = useState(1);
  const [crdtSynced, setCrdtSynced] = useState(true);

  const stageSizeRef = useRef({ width: 960, height: 640 });
  const hasCenteredInitialRef = useRef(false);
  const [viewport, setViewport] = useState<Viewport>({ x: 56, y: 44, zoom: 0.92 });

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

  const labels = LABELS[locale];

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

  // Broadcast local committed document mutations into Yjs CRDT room
  useEffect(() => {
    if (suppressBroadcastRef.current || !roomRef.current) return;
    roomRef.current.pushLocalDocument(committedDoc);
    setCrdtRevisions(roomRef.current.getTelemetry().revisionCount);
  }, [committedDoc]);

  // Animate Co-Designer cursor when enabled
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

  // Sync chrome theme class on <html>
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
        setViewport(fitArtboardToViewport(committedDoc.artboard, size, 64));
      }
    },
    [committedDoc.artboard],
  );

  const handleFitToScreen = useCallback(() => {
    setViewport(
      fitArtboardToViewport(committedDoc.artboard, stageSizeRef.current, 64),
    );
  }, [committedDoc.artboard]);

  const handleSelectTemplate = useCallback((templateId: string) => {
    const next = createDocumentByTemplateId(templateId);
    setSelectedIds([]);
    setLiveNodesOverride(null);
    setHistory((prev) => pushHistory(prev, next));
    setViewport(fitArtboardToViewport(next.artboard, stageSizeRef.current, 64));
  }, []);

  const handleLiveUpdateNodes = useCallback((nextNodes: CanvasNode[]) => {
    setLiveNodesOverride(nextNodes);
  }, []);

  const handleCommitNodes = useCallback(
    (nextNodes: CanvasNode[]) => {
      setLiveNodesOverride(null);
      setHistory((prev) =>
        pushHistory(prev, {
          ...prev.present,
          nodes: nextNodes,
        }),
      );
    },
    [],
  );

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

  const handleUpdateArtboard = useCallback((patch: Partial<Artboard>) => {
    setHistory((prev) =>
      pushHistory(prev, {
        ...prev.present,
        artboard: { ...prev.present.artboard, ...patch },
      }),
    );
  }, []);

  const handleUpdateTokens = useCallback((nextTokens: DesignTokens) => {
    setHistory((prev) =>
      pushHistory(prev, {
        ...prev.present,
        tokens: nextTokens,
      }),
    );
  }, []);

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

      const refBounds =
        targets.length === 1
          ? {
              x: committedDoc.artboard.x,
              y: committedDoc.artboard.y,
              width: committedDoc.artboard.width,
              height: committedDoc.artboard.height,
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
    [committedDoc, commitDocument, selectedIds],
  );

  const handleExecuteCommand = useCallback(
    (commandId: string) => {
      // Generative UI commands
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

      // Theme Morph commands
      const theme = resolveThemeCommand(commandId);
      if (theme) {
        handleUpdateTokens(theme);
        setInspectorTab('tokens');
        return;
      }

      if (commandId === 'layout-center-selected') {
        handleAlignSelection('centerH');
        return;
      }
      if (commandId === 'mode-toggle-dev') {
        setUiMode((m) => (m === 'design' ? 'dev' : 'design'));
        return;
      }
      if (commandId === 'export-svg') {
        setExportOpen(true);
        return;
      }
      if (commandId === 'template-swiss') {
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
      handleSelectTemplate,
      handleUpdateTokens,
    ],
  );

  // Global Figma-grade keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
        return;
      }

      if (isEditableTarget(e.target)) return;

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

      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setUiMode((m) => (m === 'design' ? 'dev' : 'design'));
        return;
      }

      if (e.shiftKey && e.key === '!') {
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
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    committedDoc,
    commitDocument,
    handleDelete,
    handleDuplicate,
    handleFitToScreen,
    handleRedo,
    handleUndo,
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
      className="h-screen w-screen overflow-hidden flex flex-col"
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
          layersOpen={layersOpen}
          onToggleLayers={() => setLayersOpen((o) => !o)}
        />

        {layersOpen && (
          <LayersPanel
            artboard={effectiveDoc.artboard}
            nodes={effectiveDoc.nodes}
            selectedIds={selectedIds}
            onSelectIds={setSelectedIds}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onBringForward={handleBringForward}
            onSendBackward={handleSendBackward}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            labels={labels}
          />
        )}

        <CanvasStage
          doc={effectiveDoc}
          viewport={viewport}
          onViewportChange={setViewport}
          onStageResize={handleStageResize}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          selectedIds={selectedIds}
          onSelectIds={setSelectedIds}
          uiMode={uiMode}
          spacePressed={spacePressed}
          onLiveUpdateNodes={handleLiveUpdateNodes}
          onCommitNodes={handleCommitNodes}
          coDesigner={coDesigner}
          crdtSynced={crdtSynced}
          labels={labels}
        />

        <InspectorPanel
          doc={effectiveDoc}
          selectedNodes={selectedNodes}
          uiMode={uiMode}
          activeTab={inspectorTab}
          onSetActiveTab={setInspectorTab}
          onUpdateNode={handleUpdateNode}
          onUpdateArtboard={handleUpdateArtboard}
          onUpdateTokens={handleUpdateTokens}
          onAlignSelection={handleAlignSelection}
          onOpenExportModal={() => setExportOpen(true)}
          labels={labels}
        />
      </main>

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
    </div>
  );
}

export default App;
