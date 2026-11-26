import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Code2,
  Command,
  Download,
  Maximize2,
  Minus,
  Moon,
  PenTool,
  Plus,
  Redo2,
  Sun,
  Undo2,
  Users,
} from 'lucide-react';
import type { ChromeTheme, Locale, UiMode } from '../types/canvas';
import { TEMPLATE_PRESETS } from '../engines/templates';
import type { StudioLabels } from '../i18n/labels';

interface TopBarProps {
  templateId: string;
  onSelectTemplate: (templateId: string) => void;
  uiMode: UiMode;
  onSetUiMode: (mode: UiMode) => void;
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
  chromeTheme: ChromeTheme;
  onToggleChromeTheme: () => void;
  locale: Locale;
  onToggleLocale: () => void;
  onOpenCommandBar: () => void;
  onOpenExportModal: () => void;
  labels: StudioLabels;
}

export function TopBar({
  templateId,
  onSelectTemplate,
  uiMode,
  onSetUiMode,
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
  chromeTheme,
  onToggleChromeTheme,
  locale,
  onToggleLocale,
  onOpenCommandBar,
  onOpenExportModal,
  labels,
}: TopBarProps) {
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeTemplate =
    TEMPLATE_PRESETS.find((t) => t.id === templateId) ?? TEMPLATE_PRESETS[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setTemplateMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header
      className="h-12 shrink-0 flex items-center justify-between gap-2 px-3 border-b select-none z-40"
      style={{
        backgroundColor: 'var(--studio-surface)',
        borderColor: 'var(--studio-border)',
      }}
    >
      {/* Left: Brand Identity + Template Selector + History */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 pr-2 border-r" style={{ borderColor: 'var(--studio-border)' }}>
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center border shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(6,182,212,0.16))',
              borderColor: 'rgba(99,102,241,0.45)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="#6366F1" strokeWidth="1.8" />
              <path d="M8 16L12 7L16 16M9.6 13H14.4" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="hidden sm:flex items-baseline gap-1.5">
            <span className="font-display font-bold text-[13px] tracking-[0.06em]">
              ATELIER
            </span>
            <span
              className="font-mono-tech text-[10px] font-medium px-1.5 py-0.5 rounded border"
              style={{
                color: 'var(--studio-cyan)',
                borderColor: 'var(--studio-border-strong)',
                backgroundColor: 'var(--studio-surface-2)',
              }}
            >
              CANVAS
            </span>
          </div>
        </div>

        {/* Curated Template Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            data-testid="template-switcher"
            onClick={() => setTemplateMenuOpen((v) => !v)}
            className="h-8 px-2.5 rounded-md border flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: templateMenuOpen ? 'var(--studio-accent)' : 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: `linear-gradient(135deg, ${activeTemplate.accentSwatch[0]}, ${activeTemplate.accentSwatch[1]})`,
              }}
            />
            <span className="truncate max-w-[140px] lg:max-w-[190px]">
              {activeTemplate.code}. {activeTemplate.name}
            </span>
            <ChevronDown size={13} strokeWidth={1.5} style={{ color: 'var(--studio-text-muted)' }} />
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
        <div className="hidden md:flex items-center gap-0.5 pl-1">
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
      </div>

      {/* Center: DESIGN / DEV MODE Toggle + Zoom Pill */}
      <div className="flex items-center gap-2">
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
            className="h-full px-2.5 rounded-md text-[11px] font-mono-tech font-semibold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            style={{
              backgroundColor: uiMode === 'design' ? 'var(--studio-accent)' : 'transparent',
              color: uiMode === 'design' ? '#FFFFFF' : 'var(--studio-text-secondary)',
            }}
          >
            <PenTool size={12} strokeWidth={1.7} />
            <span>{labels.designMode}</span>
          </button>
          <button
            type="button"
            data-testid="mode-dev"
            onClick={() => onSetUiMode('dev')}
            className="h-full px-2.5 rounded-md text-[11px] font-mono-tech font-semibold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            style={{
              backgroundColor: uiMode === 'dev' ? '#0891B2' : 'transparent',
              color: uiMode === 'dev' ? '#FFFFFF' : 'var(--studio-text-secondary)',
            }}
          >
            <Code2 size={12} strokeWidth={1.7} />
            <span>{labels.devMode}</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div
          className="hidden lg:flex items-center h-8 rounded-lg border px-1 gap-0.5"
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
            <Minus size={12} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            title="Reset 100%"
            className="px-1.5 h-6 rounded font-mono-tech text-[11px] font-medium cursor-pointer hover:bg-white/5"
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
            <Plus size={12} strokeWidth={1.5} />
          </button>
          <div className="w-px h-4 mx-0.5" style={{ backgroundColor: 'var(--studio-border)' }} />
          <button
            type="button"
            onClick={onFitToScreen}
            title="Fit to Screen (Shift+1)"
            className="px-1.5 h-6 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer hover:bg-white/5"
            style={{ color: 'var(--studio-text-secondary)' }}
          >
            <Maximize2 size={11} strokeWidth={1.5} />
            <span>{labels.fitScreen}</span>
          </button>
        </div>
      </div>

      {/* Right: Multiplayer Presence, CMD+K, Locale, Theme, Export */}
      <div className="flex items-center gap-1.5">
        {/* Presence Avatars + Simulate Co-Designer */}
        <button
          type="button"
          data-testid="btn-co-designer"
          onClick={onToggleCoDesigner}
          title={`Yjs CRDT Room (${crdtRevisions} ops) — Click to toggle live Co-Designer`}
          className="hidden xl:flex items-center gap-2 h-8 px-2 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer"
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
          <div className="flex items-center -space-x-1.5">
            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-mono-tech text-[9px] font-bold flex items-center justify-center ring-1 ring-[#0A0B0E]">
              TV
            </span>
            {coDesignerActive && (
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-mono-tech text-[9px] font-bold flex items-center justify-center ring-1 ring-[#0A0B0E]">
                LN
              </span>
            )}
          </div>
          <Users size={12} strokeWidth={1.5} />
          <span>{coDesignerActive ? labels.coDesignerLive : labels.simulateCoDesigner}</span>
        </button>

        {/* CMD+K Trigger */}
        <button
          type="button"
          data-testid="btn-cmdk"
          onClick={onOpenCommandBar}
          title="AI Command Palette (Ctrl+K)"
          className="h-8 px-2 rounded-lg border flex items-center gap-1.5 text-[11px] font-mono-tech transition-colors cursor-pointer"
          style={{
            backgroundColor: 'var(--studio-surface-2)',
            borderColor: 'var(--studio-border)',
            color: 'var(--studio-text-secondary)',
          }}
        >
          <Command size={12} strokeWidth={1.5} />
          <span className="hidden sm:inline">K</span>
        </button>

        {/* EN / VI Locale Toggle */}
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

        {/* Light / Dark View Transitions Toggle */}
        <button
          type="button"
          data-testid="btn-theme-chrome"
          onClick={onToggleChromeTheme}
          title="Toggle Obsidian / Light Studio Chrome"
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

        {/* Export Studio Button */}
        <button
          type="button"
          data-testid="btn-export-open"
          onClick={onOpenExportModal}
          className="h-8 px-3 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition-opacity hover:opacity-95 cursor-pointer shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            boxShadow: '0 2px 12px rgba(99, 102, 241, 0.35)',
          }}
        >
          <Download size={13} strokeWidth={1.8} />
          <span>{labels.exportBtn}</span>
        </button>
      </div>
    </header>
  );
}
