import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Code2,
  Command,
  Cpu,
  Download,
  FolderOpen,
  Grid2X2,
  History,
  Maximize2,
  Minus,
  Moon,
  PenTool,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Undo2,
  Users,
} from 'lucide-react';
import type {
  CanvasBackdrop,
  ChromeTheme,
  DesignSnapshot,
  Locale,
  UiMode,
} from '../types/canvas';
import { TEMPLATE_PRESETS } from '../engines/templates';
import type { StudioLabels } from '../i18n/labels';

interface TopBarProps {
  templateId: string;
  onSelectTemplate: (templateId: string) => void;
  uiMode: UiMode;
  onSetUiMode: (mode: UiMode) => void;
  onOpenPrototypePlayer: () => void;
  onOpenEnterpriseModal: () => void;
  mobileInspectorOpen: boolean;
  onToggleMobileInspector: () => void;
  snapshots: DesignSnapshot[];
  onSaveSnapshot: (label?: string) => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onExportProjectFile: () => void;
  onImportProjectFile: (file: File) => void;
  onResetWorkspace: () => void;
  savedLocally: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToScreen: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  coDesignerActive: boolean;
  onToggleCoDesigner: () => void;
  crdtRevisions: number;
  activeTabs: number;
  lastSyncLatencyMs: number | null;
  chromeTheme: ChromeTheme;
  onToggleChromeTheme: () => void;
  canvasBackdrop: CanvasBackdrop;
  onToggleCanvasBackdrop: () => void;
  locale: Locale;
  onToggleLocale: () => void;
  onOpenCommandBar: () => void;
  onOpenVariantMatrix: () => void;
  onOpenTokenCompiler: () => void;
  onOpenExportModal: () => void;
  labels: StudioLabels;
}

export function TopBar({
  templateId,
  onSelectTemplate,
  uiMode,
  onSetUiMode,
  onOpenPrototypePlayer,
  onOpenEnterpriseModal,
  mobileInspectorOpen,
  onToggleMobileInspector,
  snapshots,
  onSaveSnapshot,
  onRestoreSnapshot,
  onExportProjectFile,
  onImportProjectFile,
  onResetWorkspace,
  savedLocally,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToScreen,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  coDesignerActive,
  onToggleCoDesigner,
  crdtRevisions,
  activeTabs,
  lastSyncLatencyMs,
  chromeTheme,
  onToggleChromeTheme,
  canvasBackdrop,
  onToggleCanvasBackdrop,
  locale,
  onToggleLocale,
  onOpenCommandBar,
  onOpenVariantMatrix,
  onOpenTokenCompiler,
  onOpenExportModal,
  labels,
}: TopBarProps) {
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [snapshotDraft, setSnapshotDraft] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef<HTMLDivElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  const activeTemplate =
    TEMPLATE_PRESETS.find((t) => t.id === templateId) ?? TEMPLATE_PRESETS[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setTemplateMenuOpen(false);
      }
      if (snapRef.current && !snapRef.current.contains(e.target as Node)) {
        setSnapshotsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header
      className="h-12 shrink-0 flex items-center justify-between gap-1 sm:gap-2 px-1.5 sm:px-2.5 border-b select-none z-40"
      style={{
        backgroundColor: 'var(--studio-surface)',
        borderColor: 'var(--studio-border)',
      }}
    >
      {/* Hidden Project File Input */}
      <input
        ref={projectFileInputRef}
        type="file"
        accept=".json,.atelier.json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportProjectFile(file);
          e.target.value = '';
        }}
      />

      {/* Left: Brand Identity + Template Selector + Undo/Redo + File/History */}
      <div data-testid="topbar-left" className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <div
          className="flex items-center gap-1.5 sm:pr-2 sm:border-r shrink-0"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center border shrink-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(6,182,212,0.16))',
              borderColor: 'rgba(99,102,241,0.45)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="#6366F1" strokeWidth="1.8" />
              <path
                d="M8 16L12 7L16 16M9.6 13H14.4"
                stroke="#06B6D4"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="hidden sm:flex items-baseline gap-1">
            <span className="font-display font-bold text-[12px] tracking-[0.07em]">
              ATELIER
            </span>
            <span
              data-testid="studio-version-badge"
              className="font-mono-tech text-[9px] font-semibold px-1.5 py-0.5 rounded border"
              style={{
                color: 'var(--studio-cyan)',
                borderColor: 'rgba(6, 182, 212, 0.4)',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
              }}
            >
              v6.0
            </span>
          </div>
        </div>

        {/* Curated Template Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            data-testid="template-switcher"
            onClick={() => setTemplateMenuOpen((v) => !v)}
            className="h-8 px-1.5 sm:px-2 rounded-md border flex items-center gap-1 sm:gap-1.5 text-[11px] font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: templateMenuOpen ? 'var(--studio-accent)' : 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: `linear-gradient(135deg, ${activeTemplate.accentSwatch[0]}, ${activeTemplate.accentSwatch[1]})`,
              }}
            />
            <span className="font-mono-tech sm:hidden text-[10px] font-semibold">
              {activeTemplate.code}
            </span>
            <span className="hidden sm:inline truncate max-w-[100px] xl:max-w-[120px] 2xl:max-w-[155px]">
              {activeTemplate.code}. {activeTemplate.name}
            </span>
            <ChevronDown size={12} strokeWidth={1.5} style={{ color: 'var(--studio-text-muted)' }} />
          </button>

          {templateMenuOpen && (
            <div
              data-testid="template-menu"
              className="absolute left-0 top-10 w-80 rounded-xl border p-1.5 shadow-2xl z-50"
              style={{
                backgroundColor: 'var(--studio-surface)',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              <div
                className="px-2.5 py-1.5 text-[10px] font-mono-tech uppercase tracking-widest"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                {labels.templates}
              </div>
              {TEMPLATE_PRESETS.map((preset) => {
                const isActive = preset.id === templateId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`template-option-${preset.id}`}
                    onClick={() => {
                      onSelectTemplate(preset.id);
                      setTemplateMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: isActive ? 'var(--studio-accent-soft)' : 'transparent',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-md shrink-0 mt-0.5 flex items-center justify-center font-mono-tech text-[10px] font-semibold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${preset.accentSwatch[0]}, ${preset.accentSwatch[1]})`,
                      }}
                    >
                      {preset.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">{preset.name}</span>
                        <span
                          className="font-mono-tech text-[10px] shrink-0"
                          style={{ color: 'var(--studio-text-muted)' }}
                        >
                          {preset.dimensionsLabel}
                        </span>
                      </div>
                      <p
                        className="text-[11px] leading-snug mt-0.5 line-clamp-1"
                        style={{ color: 'var(--studio-text-secondary)' }}
                      >
                        {preset.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="hidden md:flex items-center gap-0.5">
          <button
            type="button"
            data-testid="btn-undo"
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:bg-white/5"
            style={{ color: 'var(--studio-text-secondary)' }}
          >
            <Undo2 size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            data-testid="btn-redo"
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed hover:bg-white/5"
            style={{ color: 'var(--studio-text-secondary)' }}
          >
            <Redo2 size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* File (.atelier.json) + Local Auto-Save + Version Snapshots */}
        <div className="relative hidden lg:flex items-center gap-1.5" ref={snapRef}>
          <button
            type="button"
            data-testid="btn-snapshots"
            onClick={() => setSnapshotsOpen((v) => !v)}
            title="Project File (.atelier.json) & Design Version Snapshots"
            className="h-7 px-2 rounded-md border flex items-center gap-1.5 text-[10px] font-mono-tech whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            style={{
              backgroundColor: snapshotsOpen
                ? 'var(--studio-accent-soft)'
                : 'var(--studio-surface-2)',
              borderColor: snapshotsOpen ? 'var(--studio-accent)' : 'var(--studio-border)',
              color: snapshotsOpen ? 'var(--studio-accent)' : 'var(--studio-text-secondary)',
            }}
          >
            <History size={12} strokeWidth={1.5} />
            <span className="hidden 2xl:inline">{labels.snapshotsBtn}</span>
            <span
              className="px-1 rounded text-[9px] font-semibold"
              style={{
                backgroundColor: 'var(--studio-surface)',
                color: 'var(--studio-cyan)',
              }}
            >
              {snapshots.length}
            </span>
          </button>

          {savedLocally && (
            <span
              data-testid="local-save-indicator"
              className="hidden 2xl:inline-flex items-center gap-1 font-mono-tech text-[9px] text-emerald-400/90"
            >
              <Check size={10} />
              <span>{labels.savedLocally}</span>
            </span>
          )}

          {snapshotsOpen && (
            <div
              data-testid="snapshots-popover"
              className="absolute left-0 top-9 w-76 rounded-xl border p-2.5 shadow-2xl z-50 space-y-2.5"
              style={{
                backgroundColor: 'var(--studio-surface)',
                borderColor: 'var(--studio-border-strong)',
              }}
            >
              {/* Local Project File Operations */}
              <div className="space-y-1.5 pb-2 border-b" style={{ borderColor: 'var(--studio-border)' }}>
                <div className="flex items-center justify-between font-mono-tech text-[9px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  <span>Project File</span>
                  <span className="text-emerald-400">Auto-saved</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-testid="btn-save-atelier-file"
                    onClick={() => {
                      onExportProjectFile();
                      setSnapshotsOpen(false);
                    }}
                    className="h-7 px-2 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1.5 hover:bg-white/5 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border-strong)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    <Save size={11} style={{ color: 'var(--studio-cyan)' }} />
                    <span>Save .atelier.json</span>
                  </button>
                  <button
                    type="button"
                    data-testid="btn-open-atelier-file"
                    onClick={() => {
                      projectFileInputRef.current?.click();
                      setSnapshotsOpen(false);
                    }}
                    className="h-7 px-2 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1.5 hover:bg-white/5 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border-strong)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    <FolderOpen size={11} style={{ color: 'var(--studio-accent)' }} />
                    <span>Open File</span>
                  </button>
                </div>
                <button
                  type="button"
                  data-testid="btn-reset-workspace"
                  onClick={() => {
                    onResetWorkspace();
                    setSnapshotsOpen(false);
                  }}
                  className="w-full h-6 rounded-md border text-[10px] font-mono-tech flex items-center justify-center gap-1 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
                  style={{
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text-muted)',
                  }}
                >
                  <RefreshCw size={10} />
                  <span>Reset Workspace to Default</span>
                </button>
              </div>

              {/* Named Version Milestones */}
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  Version Milestones
                </span>
                <span className="font-mono-tech text-[9px]" style={{ color: 'var(--studio-cyan)' }}>
                  {snapshots.length} saved
                </span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSaveSnapshot(snapshotDraft.trim() || undefined);
                  setSnapshotDraft('');
                }}
                className="flex gap-1.5"
              >
                <input
                  type="text"
                  data-testid="snapshot-label-input"
                  value={snapshotDraft}
                  onChange={(e) => setSnapshotDraft(e.target.value)}
                  placeholder="Milestone name..."
                  className="flex-1 h-7 px-2 rounded-md border text-[11px] outline-none"
                  style={{
                    backgroundColor: 'var(--studio-surface-2)',
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text)',
                  }}
                />
                <button
                  type="submit"
                  data-testid="btn-save-snapshot"
                  className="h-7 px-2.5 rounded-md text-[10px] font-semibold text-white cursor-pointer"
                  style={{ backgroundColor: 'var(--studio-accent)' }}
                >
                  Save
                </button>
              </form>
              <div className="max-h-40 overflow-y-auto studio-scroll space-y-1">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="px-2 py-1.5 rounded-lg border flex items-center justify-between gap-2"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold truncate">{snap.label}</div>
                      <div className="font-mono-tech text-[9px]" style={{ color: 'var(--studio-text-muted)' }}>
                        {snap.timestamp} · {snap.doc.nodes.length} layers
                      </div>
                    </div>
                    <button
                      type="button"
                      data-testid={`restore-snapshot-${snap.id}`}
                      onClick={() => {
                        onRestoreSnapshot(snap.id);
                        setSnapshotsOpen(false);
                      }}
                      className="h-6 px-2 rounded border text-[10px] font-mono-tech flex items-center gap-1 hover:bg-white/10 cursor-pointer shrink-0"
                      style={{
                        borderColor: 'var(--studio-border-strong)',
                        color: 'var(--studio-cyan)',
                      }}
                    >
                      <RotateCcw size={10} />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: 3-Mode Switcher + Present Prototype + Zoom */}
      <div data-testid="topbar-center" className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <div
          className="h-8 p-0.5 rounded-lg border flex items-center gap-0.5"
          style={{
            backgroundColor: 'var(--studio-surface-2)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <button
            type="button"
            data-testid="mode-design"
            onClick={() => onSetUiMode('design')}
            title="Design Mode (Shift+1)"
            className="h-full px-1.5 sm:px-2 rounded-md text-[10px] font-mono-tech font-semibold tracking-wider flex items-center gap-1 transition-all cursor-pointer"
            style={{
              backgroundColor: uiMode === 'design' ? 'var(--studio-accent)' : 'transparent',
              color: uiMode === 'design' ? '#FFFFFF' : 'var(--studio-text-secondary)',
            }}
          >
            <PenTool size={11} strokeWidth={1.7} />
            <span className="hidden sm:inline">{labels.designMode}</span>
          </button>
          <button
            type="button"
            data-testid="mode-prototype"
            onClick={() => onSetUiMode('prototype')}
            title="Prototype & Multi-Screen Flows (Shift+2)"
            className="h-full px-1.5 sm:px-2 rounded-md text-[10px] font-mono-tech font-semibold tracking-wider flex items-center gap-1 transition-all cursor-pointer"
            style={{
              backgroundColor: uiMode === 'prototype' ? '#059669' : 'transparent',
              color: uiMode === 'prototype' ? '#FFFFFF' : 'var(--studio-text-secondary)',
            }}
          >
            <Sparkles size={11} strokeWidth={1.7} />
            <span className="hidden 2xl:inline">{labels.prototypeMode}</span>
            <span className="hidden sm:inline 2xl:hidden">PROTO</span>
          </button>
          <button
            type="button"
            data-testid="mode-dev"
            onClick={() => onSetUiMode('dev')}
            title="Dev Mode & Codegen (Shift+3)"
            className="h-full px-1.5 sm:px-2 rounded-md text-[10px] font-mono-tech font-semibold tracking-wider flex items-center gap-1 transition-all cursor-pointer"
            style={{
              backgroundColor: uiMode === 'dev' ? '#0891B2' : 'transparent',
              color: uiMode === 'dev' ? '#FFFFFF' : 'var(--studio-text-secondary)',
            }}
          >
            <Code2 size={11} strokeWidth={1.7} />
            <span className="hidden 2xl:inline">{labels.devMode}</span>
            <span className="hidden sm:inline 2xl:hidden">DEV</span>
          </button>
        </div>

        <button
          type="button"
          data-testid="btn-present"
          onClick={onOpenPrototypePlayer}
          title="Present Prototype — Interactive Click-Through Player"
          className="h-8 px-2 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(6,182,212,0.18))',
            borderColor: 'rgba(16,185,129,0.52)',
            color: chromeTheme === 'light' ? '#047857' : '#34D399',
          }}
        >
          <Play size={11} fill="currentColor" strokeWidth={1.6} />
          <span className="hidden 2xl:inline">{labels.presentBtn}</span>
          <span className="hidden lg:inline 2xl:hidden">Play</span>
        </button>

        <div
          className="hidden xl:flex items-center h-8 rounded-lg border px-1 gap-0.5"
          style={{
            backgroundColor: 'var(--studio-surface-2)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out"
            className="w-6 h-6 rounded flex items-center justify-center cursor-pointer hover:bg-white/5"
            style={{ color: 'var(--studio-text-secondary)' }}
          >
            <Minus size={11} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            title="Reset 100%"
            className="px-1 h-6 rounded font-mono-tech text-[10px] font-medium cursor-pointer hover:bg-white/5"
            style={{ color: 'var(--studio-text)' }}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In"
            className="w-6 h-6 rounded flex items-center justify-center cursor-pointer hover:bg-white/5"
            style={{ color: 'var(--studio-text-secondary)' }}
          >
            <Plus size={11} strokeWidth={1.5} />
          </button>
          <div className="w-px h-3.5 mx-0.5" style={{ backgroundColor: 'var(--studio-border)' }} />
          <button
            type="button"
            onClick={onFitToScreen}
            title="Fit All Artboards (Shift+0)"
            className="px-1 h-6 rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer hover:bg-white/5"
            style={{ color: 'var(--studio-text-secondary)' }}
          >
            <Maximize2 size={10} strokeWidth={1.5} />
            <span>{labels.fitScreen}</span>
          </button>
        </div>
      </div>

      {/* Right: Design System Studio Cluster, Live Collab, Dual Canvas Backdrop, Utilities & Export */}
      <div data-testid="topbar-right" className="flex items-center gap-1 shrink-0">
        {/* Live Collab Presence Pill */}
        <div
          data-testid="live-collab-badge"
          data-active-tabs={activeTabs}
          title={`BroadcastChannel(atelier_canvas_collab_v5) · ${crdtRevisions} rev${lastSyncLatencyMs !== null ? ` · ${lastSyncLatencyMs}ms sync` : ''}`}
          className="hidden xl:flex h-8 px-2 rounded-lg border items-center gap-1.5 font-mono-tech text-[10px] font-semibold whitespace-nowrap shrink-0"
          style={{
            backgroundColor:
              activeTabs >= 2
                ? 'rgba(16, 185, 129, 0.14)'
                : 'var(--studio-surface-2)',
            borderColor:
              activeTabs >= 2
                ? 'rgba(16, 185, 129, 0.5)'
                : 'var(--studio-border)',
            color:
              activeTabs >= 2
                ? chromeTheme === 'light'
                  ? '#047857'
                  : '#34D399'
                : 'var(--studio-cyan)',
          }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              activeTabs >= 2 ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
            }`}
          />
          <span className="hidden 2xl:inline">
            {labels.liveCollabLabel} · {activeTabs} {activeTabs === 1 ? 'Tab' : 'Tabs'}
          </span>
          <span className="2xl:hidden">
            {activeTabs} {activeTabs === 1 ? 'Tab' : 'Tabs'}
          </span>
        </div>

        {/* Grouped Design System Tools Pill: Variant Matrix + Token Compiler */}
        <div
          className="h-8 p-0.5 rounded-lg border flex items-center gap-0.5 shrink-0"
          style={{
            backgroundColor: 'var(--studio-surface-2)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <button
            type="button"
            data-testid="btn-open-variant-matrix"
            onClick={onOpenVariantMatrix}
            title="Component Variant Matrix & Live WCAG 2.1 Contrast Audit (CVA + SwiftUI)"
            className="h-full px-1.5 sm:px-2 rounded-md text-[10px] font-mono-tech font-semibold flex items-center gap-1 transition-all cursor-pointer hover:brightness-110"
            style={{
              background:
                'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(99,102,241,0.18))',
              color: chromeTheme === 'light' ? '#047857' : '#34D399',
            }}
          >
            <Grid2X2 size={12} strokeWidth={1.8} />
            <span className="hidden lg:inline">{labels.variantMatrixBtn}</span>
          </button>

          <button
            type="button"
            data-testid="btn-open-token-compiler"
            onClick={onOpenTokenCompiler}
            title="Multi-Platform Design Token Compiler (Tailwind v4 / TypeScript / SwiftUI / Jetpack Compose)"
            className="h-full px-1.5 sm:px-2 rounded-md text-[10px] font-mono-tech font-semibold flex items-center gap-1 transition-all cursor-pointer hover:brightness-110"
            style={{
              background:
                'linear-gradient(135deg, rgba(6,182,212,0.16), rgba(99,102,241,0.16))',
              color: 'var(--studio-cyan)',
            }}
          >
            <Cpu size={12} strokeWidth={1.8} />
            <span className="hidden xl:inline">{labels.compileTokensBtn}</span>
          </button>
        </div>

        {/* Dual Light Studio Canvas (#F4F5F7) <-> Dark Figma Canvas Backdrop Switch */}
        <button
          type="button"
          data-testid="btn-canvas-backdrop"
          data-backdrop={canvasBackdrop}
          onClick={onToggleCanvasBackdrop}
          title="Toggle Light Studio Canvas (#F4F5F7 Figma Light UI) / Dark Figma Canvas"
          className="h-8 px-2 rounded-lg border flex items-center gap-1.5 font-mono-tech text-[10px] font-semibold transition-all cursor-pointer shrink-0"
          style={{
            backgroundColor:
              canvasBackdrop === 'daylight'
                ? '#F4F5F7'
                : 'var(--studio-surface-2)',
            borderColor:
              canvasBackdrop === 'daylight'
                ? 'rgba(79, 70, 229, 0.45)'
                : 'var(--studio-border)',
            color:
              canvasBackdrop === 'daylight'
                ? '#0F172A'
                : 'var(--studio-text-secondary)',
          }}
        >
          {canvasBackdrop === 'daylight' ? (
            <Sun size={12} strokeWidth={1.8} className="text-amber-500 shrink-0" />
          ) : (
            <Moon size={12} strokeWidth={1.8} className="text-indigo-400 shrink-0" />
          )}
          <span className="hidden 2xl:inline">
            {canvasBackdrop === 'daylight'
              ? labels.daylightCanvasLabel
              : labels.obsidianCanvasLabel}
          </span>
        </button>

        {/* Studio Utility Cluster */}
        <div
          className="hidden sm:flex items-center gap-1 pl-1 border-l"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          <button
            type="button"
            data-testid="btn-enterprise-license"
            onClick={onOpenEnterpriseModal}
            title="Enterprise Super VIP Pro License · 13.900.000 VND (MBBank VietQR)"
            className="h-8 px-2 rounded-lg border flex items-center gap-1.5 text-[10px] font-mono-tech font-semibold transition-all cursor-pointer shrink-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(99,102,241,0.16))',
              borderColor: 'rgba(245,158,11,0.45)',
              color: chromeTheme === 'light' ? '#B45309' : '#FBBF24',
            }}
          >
            <ShieldCheck size={12} strokeWidth={1.8} />
            <span className="hidden 2xl:inline">{labels.enterpriseBtn}</span>
          </button>

          <button
            type="button"
            data-testid="btn-co-designer"
            onClick={onToggleCoDesigner}
            title={`Yjs CRDT (${crdtRevisions} ops) — Simulate Co-Designer`}
            className="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer"
            style={{
              backgroundColor: coDesignerActive
                ? 'rgba(6, 182, 212, 0.14)'
                : 'var(--studio-surface-2)',
              borderColor: coDesignerActive
                ? 'rgba(6, 182, 212, 0.5)'
                : 'var(--studio-border)',
              color: coDesignerActive ? 'var(--studio-cyan)' : 'var(--studio-text-secondary)',
            }}
          >
            <Users size={13} strokeWidth={1.5} />
          </button>

          <button
            type="button"
            data-testid="btn-cmdk"
            onClick={onOpenCommandBar}
            title="AI Command Palette (Ctrl+K)"
            className="h-8 px-2 rounded-lg border flex items-center gap-1 text-[10px] font-mono-tech transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text-secondary)',
            }}
          >
            <Command size={12} strokeWidth={1.5} />
            <span className="hidden md:inline">K</span>
          </button>

          <button
            type="button"
            data-testid="btn-locale"
            onClick={onToggleLocale}
            title="Switch UI Language (EN / VI)"
            className="h-8 px-2 rounded-lg border font-mono-tech text-[10px] font-semibold tracking-wider cursor-pointer"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text-secondary)',
            }}
          >
            {locale.toUpperCase()}
          </button>

          <button
            type="button"
            data-testid="btn-theme-chrome"
            onClick={onToggleChromeTheme}
            title="Toggle Full Light Studio UI (#F4F5F7) / Obsidian Dark Studio Chrome"
            className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text-secondary)',
            }}
          >
            {chromeTheme === 'dark' ? (
              <Sun size={14} strokeWidth={1.5} />
            ) : (
              <Moon size={14} strokeWidth={1.5} />
            )}
          </button>
        </div>

        <button
          type="button"
          data-testid="btn-mobile-inspector"
          onClick={onToggleMobileInspector}
          title="Toggle Inspector Panel"
          className="flex md:hidden w-8 h-8 rounded-lg border items-center justify-center cursor-pointer"
          style={{
            backgroundColor: mobileInspectorOpen
              ? 'var(--studio-accent-soft)'
              : 'var(--studio-surface-2)',
            borderColor: mobileInspectorOpen
              ? 'var(--studio-accent)'
              : 'var(--studio-border)',
            color: mobileInspectorOpen
              ? 'var(--studio-accent)'
              : 'var(--studio-text-secondary)',
          }}
        >
          <SlidersHorizontal size={13} strokeWidth={1.6} />
        </button>

        <button
          type="button"
          data-testid="btn-export-open"
          onClick={onOpenExportModal}
          className="h-8 px-2 sm:px-2.5 rounded-lg text-[11px] font-semibold text-white flex items-center gap-1.5 transition-opacity hover:opacity-95 cursor-pointer shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            boxShadow: '0 2px 12px rgba(99, 102, 241, 0.35)',
          }}
        >
          <Download size={12} strokeWidth={1.8} />
          <span className="hidden sm:inline">{labels.exportBtn}</span>
        </button>
      </div>
    </header>
  );
}
