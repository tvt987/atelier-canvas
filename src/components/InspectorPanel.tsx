import { useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  Check,
  Code2,
  Copy,
  Download,
  LayoutGrid,
  Palette,
  PenTool,
  Play,
  ShieldCheck,
  Sliders,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import type {
  Artboard,
  AutoLayoutConfig,
  BlendMode,
  CanvasNode,
  ClickAction,
  CodeFormat,
  ColorTokenKey,
  DashStyle,
  DesignTokens,
  DocumentState,
  EasingPreset,
  EntranceAnimation,
  FillKind,
  HoverEffect,
  InspectorTab,
  PrototypeConfig,
  ShadowPreset,
  UiMode,
} from '../types/canvas';
import {
  BRAND_TOKEN_THEMES,
  COLOR_TOKEN_META,
} from '../engines/tokens';
import {
  computeRedlineMeasurements,
  generatePureCss,
  generateReactTailwind,
  generateTokensJson,
} from '../engines/codegen';
import {
  auditNodeContrast,
  autoFixContrastToAAA,
} from '../engines/wcag';
import { TEMPLATE_PRESETS } from '../engines/templates';
import type { StudioLabels } from '../i18n/labels';

export type AlignDirection =
  | 'left'
  | 'centerH'
  | 'right'
  | 'top'
  | 'centerV'
  | 'bottom';

interface InspectorPanelProps {
  doc: DocumentState;
  selectedNodes: CanvasNode[];
  uiMode: UiMode;
  activeTab: InspectorTab;
  onSetActiveTab: (tab: InspectorTab) => void;
  onSelectIds: (ids: string[]) => void;
  onUpdateNode: (id: string, patch: Partial<CanvasNode>) => void;
  onApplyAutoLayout: (frameId: string, config: AutoLayoutConfig) => void;
  onUpdateArtboard: (patch: Partial<Artboard>) => void;
  onUpdateTokens: (nextTokens: DesignTokens) => void;
  onAlignSelection: (dir: AlignDirection) => void;
  onOpenExportModal: () => void;
  onOpenPrototypePlayer: () => void;
  labels: StudioLabels;
}

const FONT_OPTIONS = [
  'Space Grotesk',
  'Inter',
  'JetBrains Mono',
  'Cormorant Garamond',
];

const QUICK_SWATCHES = [
  '#6366F1',
  '#06B6D4',
  '#E11D48',
  '#F59E0B',
  '#10B981',
  '#2563EB',
  '#151924',
  '#F8FAFC',
];

const SHADOW_PRESETS: ShadowPreset[] = [
  'none',
  'subtle',
  'elevated',
  'floating',
  'neon',
];

const BLEND_MODES: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay'];

const ENTRANCE_OPTIONS: Array<{ value: EntranceAnimation; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'fade-up', label: 'Fade Up' },
  { value: 'spring-scale', label: 'Spring Scale' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'elastic-pop', label: 'Elastic Pop' },
  { value: 'float-levitate', label: 'Float Levitate (Loop)' },
  { value: 'shimmer-glow', label: 'Shimmer Glow (Loop)' },
];

const HOVER_OPTIONS: Array<{ value: HoverEffect; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'lift-glow', label: 'Lift + Glow' },
  { value: 'scale', label: 'Scale 1.03' },
  { value: 'glass-tilt', label: 'Glass 3D Tilt' },
];

const CLICK_OPTIONS: Array<{ value: ClickAction; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'toast', label: 'Show Interactive Toast' },
  { value: 'pulse-target', label: 'Pulse Target Layer' },
  { value: 'switch-template', label: 'Switch Template' },
  { value: 'toggle-theme', label: 'Morph Next Brand Theme' },
];

const DEFAULT_PROTO: PrototypeConfig = {
  entrance: 'none',
  durationMs: 520,
  delayMs: 0,
  easing: 'spring',
  hoverEffect: 'none',
  clickAction: 'none',
};

function NumberField({
  label,
  value,
  onChange,
  testId,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  testId?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label
      className="flex items-center gap-1.5 h-7 px-2 rounded-md border text-[11px]"
      style={{
        backgroundColor: 'var(--studio-surface-2)',
        borderColor: 'var(--studio-border)',
      }}
    >
      <span className="font-mono-tech text-[10px] shrink-0" style={{ color: 'var(--studio-text-muted)' }}>
        {label}
      </span>
      <input
        type="number"
        data-testid={testId}
        value={Math.round(value)}
        min={min}
        max={max}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (!Number.isNaN(parsed)) onChange(parsed);
        }}
        className="w-full bg-transparent outline-none font-mono-tech text-[11px] text-right no-spin"
        style={{ color: 'var(--studio-text)' }}
      />
    </label>
  );
}

export function InspectorPanel({
  doc,
  selectedNodes,
  uiMode,
  activeTab,
  onSetActiveTab,
  onSelectIds,
  onUpdateNode,
  onApplyAutoLayout,
  onUpdateArtboard,
  onUpdateTokens,
  onAlignSelection,
  onOpenExportModal,
  onOpenPrototypePlayer,
  labels,
}: InspectorPanelProps) {
  const [codeFormat, setCodeFormat] = useState<CodeFormat>('react-tailwind');
  const [copied, setCopied] = useState(false);

  const primary = selectedNodes.length === 1 ? selectedNodes[0] : null;

  const generatedCode = useMemo(() => {
    if (codeFormat === 'css') return generatePureCss(doc, primary);
    if (codeFormat === 'tokens-json') return generateTokensJson(doc.tokens);
    return generateReactTailwind(doc, primary);
  }, [doc, primary, codeFormat]);

  const redlines = useMemo(
    () => (primary ? computeRedlineMeasurements(primary, doc.artboard) : null),
    [primary, doc.artboard],
  );

  const wcagAudit = useMemo(
    () => (primary ? auditNodeContrast(primary, doc) : null),
    [primary, doc],
  );

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
    } catch {
      // Ignore in restricted headless clipboards
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleFixContrast = () => {
    if (!primary || !wcagAudit) return;
    const fixedHex = autoFixContrastToAAA(
      wcagAudit.foregroundHex,
      wcagAudit.backgroundHex,
    );
    onUpdateNode(primary.id, {
      textColor: fixedHex,
      tokenBinding: { ...primary.tokenBinding, textColor: undefined },
    });
  };

  // PROTOTYPE MODE RIGHT RAIL
  if (uiMode === 'prototype') {
    const proto: PrototypeConfig = primary?.prototype ?? DEFAULT_PROTO;
    const updateProto = (patch: Partial<PrototypeConfig>) => {
      if (!primary) return;
      onUpdateNode(primary.id, {
        prototype: { ...proto, ...patch },
      });
    };

    const activeFlows = doc.nodes.filter(
      (n) =>
        n.prototype &&
        (n.prototype.entrance !== 'none' ||
          n.prototype.hoverEffect !== 'none' ||
          n.prototype.clickAction !== 'none'),
    );

    return (
      <aside
        data-testid="prototype-inspector"
        className="w-72 lg:w-[300px] shrink-0 border-l flex flex-col select-none z-20"
        style={{
          backgroundColor: 'var(--studio-surface)',
          borderColor: 'var(--studio-border)',
        }}
      >
        <div
          className="h-9 px-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} strokeWidth={1.6} className="text-emerald-400" />
            <span className="font-mono-tech text-[11px] font-semibold uppercase tracking-wider">
              {labels.prototypeInspector}
            </span>
          </div>
          <span className="font-mono-tech text-[10px] text-emerald-400">
            {activeFlows.length} flows
          </span>
        </div>

        <div className="flex-1 overflow-y-auto studio-scroll p-3 space-y-3.5">
          {primary ? (
            <>
              <div
                className="px-2.5 py-2 rounded-lg border flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--studio-surface-2)',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                }}
              >
                <span className="text-xs font-semibold truncate">{primary.name}</span>
                <span className="font-mono-tech text-[9px] uppercase text-emerald-400">
                  {primary.type}
                </span>
              </div>

              {/* Entrance Choreography */}
              <section className="space-y-2">
                <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  Entrance Animation
                </div>
                <select
                  data-testid="proto-entrance-select"
                  value={proto.entrance}
                  onChange={(e) =>
                    updateProto({ entrance: e.target.value as EntranceAnimation })
                  }
                  className="w-full h-8 px-2 rounded-md border text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--studio-surface-2)',
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text)',
                  }}
                >
                  {ENTRANCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-1.5">
                  <NumberField
                    label="DUR"
                    value={proto.durationMs}
                    min={100}
                    max={4000}
                    onChange={(durationMs) =>
                      updateProto({ durationMs: Math.max(100, durationMs) })
                    }
                  />
                  <NumberField
                    label="DLY"
                    value={proto.delayMs}
                    min={0}
                    max={3000}
                    onChange={(delayMs) =>
                      updateProto({ delayMs: Math.max(0, delayMs) })
                    }
                  />
                </div>
                <div
                  className="grid grid-cols-3 gap-1 p-0.5 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--studio-surface-2)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  {(
                    [
                      ['spring', 'Spring'],
                      ['expo-out', 'Expo Out'],
                      ['smooth', 'Smooth'],
                    ] as const
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => updateProto({ easing: val as EasingPreset })}
                      className="h-6 rounded font-mono-tech text-[10px] cursor-pointer"
                      style={{
                        backgroundColor:
                          proto.easing === val ? '#059669' : 'transparent',
                        color:
                          proto.easing === val
                            ? '#FFFFFF'
                            : 'var(--studio-text-secondary)',
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </section>

              {/* Hover Micro-Interaction */}
              <section className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  Hover State
                </div>
                <select
                  data-testid="proto-hover-select"
                  value={proto.hoverEffect}
                  onChange={(e) =>
                    updateProto({ hoverEffect: e.target.value as HoverEffect })
                  }
                  className="w-full h-8 px-2 rounded-md border text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--studio-surface-2)',
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text)',
                  }}
                >
                  {HOVER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </section>

              {/* Click Interaction Trigger */}
              <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  On Click Action
                </div>
                <select
                  data-testid="proto-click-select"
                  value={proto.clickAction}
                  onChange={(e) =>
                    updateProto({ clickAction: e.target.value as ClickAction })
                  }
                  className="w-full h-8 px-2 rounded-md border text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--studio-surface-2)',
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text)',
                  }}
                >
                  {CLICK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>

                {proto.clickAction === 'toast' && (
                  <input
                    type="text"
                    value={proto.clickPayload ?? ''}
                    onChange={(e) => updateProto({ clickPayload: e.target.value })}
                    placeholder="Toast notification copy..."
                    className="w-full h-8 px-2 rounded-md border text-xs outline-none"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  />
                )}

                {proto.clickAction === 'pulse-target' && (
                  <select
                    value={proto.clickPayload ?? ''}
                    onChange={(e) => updateProto({ clickPayload: e.target.value })}
                    className="w-full h-8 px-2 rounded-md border text-xs outline-none"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    <option value="" className="bg-slate-900 text-white">
                      Select target layer...
                    </option>
                    {doc.nodes
                      .filter((n) => n.id !== primary.id)
                      .map((n) => (
                        <option key={n.id} value={n.id} className="bg-slate-900 text-white">
                          {n.name}
                        </option>
                      ))}
                  </select>
                )}

                {proto.clickAction === 'switch-template' && (
                  <select
                    value={proto.clickPayload ?? 'ai-saas-hero'}
                    onChange={(e) => updateProto({ clickPayload: e.target.value })}
                    className="w-full h-8 px-2 rounded-md border text-xs outline-none"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    {TEMPLATE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id} className="bg-slate-900 text-white">
                        {preset.code}. {preset.name}
                      </option>
                    ))}
                  </select>
                )}
              </section>
            </>
          ) : (
            <div className="space-y-2.5">
              <div
                className="p-2.5 rounded-lg border text-[11px] leading-relaxed"
                style={{
                  backgroundColor: 'var(--studio-surface-2)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text-secondary)',
                }}
              >
                Click any layer on canvas to edit entrance choreography, spring hovers, and click flows — or pick an active flow below.
              </div>

              <div className="space-y-1.5">
                <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  Active Prototype Flows
                </div>
                {activeFlows.map((flowNode) => (
                  <button
                    key={flowNode.id}
                    type="button"
                    onClick={() => onSelectIds([flowNode.id])}
                    className="w-full p-2 rounded-lg border text-left hover:border-emerald-500/50 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold truncate">{flowNode.name}</span>
                      <Zap size={11} className="text-emerald-400 shrink-0" />
                    </div>
                    <div className="font-mono-tech text-[10px] mt-0.5 text-emerald-400/90 truncate">
                      {flowNode.prototype?.entrance !== 'none'
                        ? `${flowNode.prototype?.entrance} (${flowNode.prototype?.durationMs}ms)`
                        : 'Static'}{' '}
                      {flowNode.prototype?.clickAction !== 'none'
                        ? `· Click: ${flowNode.prototype?.clickAction}`
                        : ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            data-testid="btn-launch-player-rail"
            onClick={onOpenPrototypePlayer}
            className="w-full h-9 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-95"
            style={{
              background: 'linear-gradient(135deg, #10B981, #0891B2)',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.32)',
            }}
          >
            <Play size={13} fill="currentColor" />
            <span>Launch Fullscreen Prototype</span>
          </button>
        </div>
      </aside>
    );
  }

  // DEV MODE RIGHT RAIL
  if (uiMode === 'dev') {
    return (
      <aside
        data-testid="dev-inspector"
        className="w-80 shrink-0 border-l flex flex-col select-none z-20"
        style={{
          backgroundColor: 'var(--studio-surface)',
          borderColor: 'var(--studio-border)',
        }}
      >
        <div
          className="h-9 px-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          <div className="flex items-center gap-1.5">
            <Code2 size={14} strokeWidth={1.6} style={{ color: 'var(--studio-cyan)' }} />
            <span className="font-mono-tech text-[11px] font-semibold uppercase tracking-wider">
              {labels.codeInspector}
            </span>
          </div>
          <span
            className="font-mono-tech text-[10px] px-1.5 py-0.5 rounded truncate max-w-[140px]"
            style={{
              backgroundColor: 'rgba(6, 182, 212, 0.14)',
              color: 'var(--studio-cyan)',
            }}
          >
            {primary ? primary.name : doc.artboard.name}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto studio-scroll p-3 space-y-3">
          {/* Box Specs & Redline Spacing Matrix */}
          <div
            className="rounded-lg border p-2.5 space-y-2"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                {labels.redlineSpecs}
              </span>
              <span className="font-mono-tech text-[10px]" style={{ color: 'var(--studio-cyan)' }}>
                {primary
                  ? `${primary.width} × ${primary.height}px`
                  : `${doc.artboard.width} × ${doc.artboard.height}px`}
              </span>
            </div>

            {redlines ? (
              <div className="grid grid-cols-4 gap-1.5 font-mono-tech text-[10px]">
                {(
                  [
                    ['TOP', redlines.top],
                    ['RIGHT', redlines.right],
                    ['BOTTOM', redlines.bottom],
                    ['LEFT', redlines.left],
                  ] as const
                ).map(([dir, val]) => (
                  <div
                    key={dir}
                    className="rounded px-1.5 py-1 text-center border"
                    style={{
                      backgroundColor: 'var(--studio-surface)',
                      borderColor: 'var(--studio-border)',
                    }}
                  >
                    <div className="text-[8px]" style={{ color: 'var(--studio-text-muted)' }}>
                      {dir}
                    </div>
                    <div className="font-semibold text-rose-400">{val}px</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px]" style={{ color: 'var(--studio-text-secondary)' }}>
                Click or hover any element on canvas to inspect exact pixel distances to artboard edges.
              </div>
            )}
          </div>

          {/* WCAG 2.1 Contrast Readout in Dev Mode */}
          {wcagAudit && (
            <div
              data-testid="dev-wcag-badge"
              className="rounded-lg border p-2.5 flex items-center justify-between gap-2"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={14}
                  className={
                    wcagAudit.passesAAA
                      ? 'text-emerald-400'
                      : wcagAudit.passesAA
                        ? 'text-cyan-400'
                        : 'text-rose-400'
                  }
                />
                <div className="font-mono-tech text-[10px]">
                  <div className="font-semibold">
                    WCAG {wcagAudit.ratioLabel} · {wcagAudit.grade}
                  </div>
                  <div style={{ color: 'var(--studio-text-muted)' }}>
                    {wcagAudit.foregroundHex} on {wcagAudit.backgroundHex}
                  </div>
                </div>
              </div>
              {!wcagAudit.passesAAA && (
                <button
                  type="button"
                  onClick={handleFixContrast}
                  className="h-6 px-2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono-tech text-[9px] font-semibold cursor-pointer"
                >
                  Fix AAA
                </button>
              )}
            </div>
          )}

          {/* Code Format Switch */}
          <div
            className="grid grid-cols-3 p-0.5 rounded-lg border gap-0.5"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border)',
            }}
          >
            {(
              [
                ['react-tailwind', 'React + TW4'],
                ['css', 'Pure CSS'],
                ['tokens-json', 'Tokens JSON'],
              ] as const
            ).map(([fmt, lbl]) => (
              <button
                key={fmt}
                type="button"
                data-testid={`code-tab-${fmt}`}
                onClick={() => setCodeFormat(fmt)}
                className="h-7 rounded-md font-mono-tech text-[10px] font-semibold transition-colors cursor-pointer"
                style={{
                  backgroundColor: codeFormat === fmt ? '#0891B2' : 'transparent',
                  color:
                    codeFormat === fmt ? '#FFFFFF' : 'var(--studio-text-secondary)',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Code Output Surface */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{
              backgroundColor: '#0B0D12',
              borderColor: 'var(--studio-border-strong)',
            }}
          >
            <div className="h-8 px-2.5 border-b border-white/10 flex items-center justify-between">
              <span className="font-mono-tech text-[10px] text-slate-400">
                {codeFormat === 'react-tailwind'
                  ? 'Component.tsx'
                  : codeFormat === 'css'
                    ? 'styles.css'
                    : 'design-tokens.json'}
              </span>
              <button
                type="button"
                data-testid="btn-copy-code"
                onClick={handleCopyCode}
                className="h-6 px-2 rounded text-[10px] font-mono-tech font-medium flex items-center gap-1 bg-white/10 hover:bg-white/15 text-slate-200 cursor-pointer"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                <span>{copied ? labels.copied : labels.copyCode}</span>
              </button>
            </div>
            <pre
              data-testid="dev-code-output"
              className="p-3 text-[11px] leading-relaxed font-mono-tech text-cyan-100 whitespace-pre-wrap break-words max-h-[380px] overflow-y-auto studio-scroll select-text"
            >
              <code>{generatedCode}</code>
            </pre>
          </div>

          <button
            type="button"
            onClick={onOpenExportModal}
            className="w-full h-9 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            <Download size={13} strokeWidth={1.6} />
            <span>Open Export Studio (SVG / 3x PNG / HTML)</span>
          </button>
        </div>
      </aside>
    );
  }

  // DESIGN MODE RIGHT RAIL
  return (
    <aside
      data-testid="design-inspector"
      className="w-72 lg:w-[300px] shrink-0 border-l flex flex-col select-none z-20"
      style={{
        backgroundColor: 'var(--studio-surface)',
        borderColor: 'var(--studio-border)',
      }}
    >
      <div
        className="h-9 px-2 border-b grid grid-cols-2 gap-1 items-center"
        style={{ borderColor: 'var(--studio-border)' }}
      >
        <button
          type="button"
          data-testid="tab-design"
          onClick={() => onSetActiveTab('design')}
          className="h-7 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          style={{
            backgroundColor:
              activeTab === 'design' ? 'var(--studio-accent-soft)' : 'transparent',
            color:
              activeTab === 'design'
                ? 'var(--studio-accent)'
                : 'var(--studio-text-secondary)',
          }}
        >
          <Sliders size={12} strokeWidth={1.6} />
          <span>{labels.designTab}</span>
        </button>
        <button
          type="button"
          data-testid="tab-tokens"
          onClick={() => onSetActiveTab('tokens')}
          className="h-7 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          style={{
            backgroundColor:
              activeTab === 'tokens' ? 'var(--studio-accent-soft)' : 'transparent',
            color:
              activeTab === 'tokens'
                ? 'var(--studio-accent)'
                : 'var(--studio-text-secondary)',
          }}
        >
          <Palette size={12} strokeWidth={1.6} />
          <span>{labels.tokensTab}</span>
        </button>
      </div>

      {activeTab === 'tokens' ? (
        <div className="flex-1 overflow-y-auto studio-scroll p-3 space-y-4">
          <section className="space-y-2">
            <div
              className="text-[10px] font-mono-tech uppercase tracking-wider font-semibold"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              {labels.brandThemesTitle}
            </div>
            <div className="space-y-1.5">
              {BRAND_TOKEN_THEMES.map((theme) => {
                const isActive = doc.tokens.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    data-testid={`theme-morph-${theme.id}`}
                    onClick={() => onUpdateTokens(theme)}
                    className="w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer"
                    style={{
                      backgroundColor: isActive
                        ? 'var(--studio-accent-soft)'
                        : 'var(--studio-surface-2)',
                      borderColor: isActive
                        ? 'var(--studio-accent)'
                        : 'var(--studio-border)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{theme.name}</span>
                      <div className="flex items-center gap-1">
                        {[
                          theme.brandPrimary,
                          theme.brandAccent,
                          theme.surfaceCard,
                          theme.textPrimary,
                        ].map((hex, idx) => (
                          <span
                            key={idx}
                            className="w-3 h-3 rounded-full border border-white/20"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                    <p
                      className="text-[10px] mt-1 leading-snug"
                      style={{ color: 'var(--studio-text-secondary)' }}
                    >
                      {theme.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
            <div
              className="text-[10px] font-mono-tech uppercase tracking-wider font-semibold"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              {labels.semanticTokensTitle}
            </div>
            <div className="space-y-1.5">
              {COLOR_TOKEN_META.map((meta) => {
                const value = doc.tokens[meta.key];
                return (
                  <div
                    key={meta.key}
                    className="h-8 px-2 rounded-md border flex items-center justify-between gap-2"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                    }}
                  >
                    <div className="font-mono-tech text-[10px] truncate">{meta.cssVar}</div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="font-mono-tech text-[10px] uppercase"
                        style={{ color: 'var(--studio-text-muted)' }}
                      >
                        {value}
                      </span>
                      <input
                        type="color"
                        aria-label={meta.label}
                        value={value}
                        onChange={(e) =>
                          onUpdateTokens({
                            ...doc.tokens,
                            [meta.key]: e.target.value,
                          })
                        }
                        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                    </div>
                  </div>
                );
              })}

              <div
                className="p-2 rounded-md border space-y-1.5"
                style={{
                  backgroundColor: 'var(--studio-surface-2)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <div className="flex items-center justify-between font-mono-tech text-[10px]">
                  <span>--radius-base</span>
                  <span style={{ color: 'var(--studio-cyan)' }}>{doc.tokens.radiusBase}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  value={doc.tokens.radiusBase}
                  onChange={(e) =>
                    onUpdateTokens({
                      ...doc.tokens,
                      radiusBase: Number(e.target.value),
                    })
                  }
                  className="w-full studio-range"
                />
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto studio-scroll p-3 space-y-3.5">
          {/* 6-Way Align Toolbar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                {labels.alignSection}
              </span>
              {selectedNodes.length > 1 && (
                <span className="font-mono-tech text-[10px]" style={{ color: 'var(--studio-cyan)' }}>
                  {selectedNodes.length} selected
                </span>
              )}
            </div>
            <div
              className="grid grid-cols-6 gap-1 p-1 rounded-lg border"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              {(
                [
                  ['left', AlignStartVertical, 'Align Left'],
                  ['centerH', AlignCenterVertical, 'Center Horizontally'],
                  ['right', AlignEndVertical, 'Align Right'],
                  ['top', AlignStartHorizontal, 'Align Top'],
                  ['centerV', AlignCenterHorizontal, 'Center Vertically'],
                  ['bottom', AlignEndHorizontal, 'Align Bottom'],
                ] as const
              ).map(([dir, Icon, title]) => (
                <button
                  key={dir}
                  type="button"
                  disabled={selectedNodes.length === 0}
                  onClick={() => onAlignSelection(dir)}
                  title={title}
                  className="h-6 rounded flex items-center justify-center disabled:opacity-30 hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed"
                  style={{ color: 'var(--studio-text-secondary)' }}
                >
                  <Icon size={13} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>

          {primary ? (
            <>
              <div>
                <input
                  type="text"
                  data-testid="inspector-node-name"
                  value={primary.name}
                  onChange={(e) => onUpdateNode(primary.id, { name: e.target.value })}
                  className="w-full h-7 px-2 rounded-md border text-xs font-semibold outline-none"
                  style={{
                    backgroundColor: 'var(--studio-surface-2)',
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text)',
                  }}
                />
              </div>

              {/* Layout & Transform Grid */}
              <section className="space-y-1.5">
                <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  {labels.layoutSection}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <NumberField
                    label="X"
                    testId="inspector-x"
                    value={primary.x}
                    onChange={(x) => onUpdateNode(primary.id, { x })}
                  />
                  <NumberField
                    label="Y"
                    testId="inspector-y"
                    value={primary.y}
                    onChange={(y) => onUpdateNode(primary.id, { y })}
                  />
                  <NumberField
                    label="W"
                    testId="inspector-w"
                    value={primary.width}
                    min={12}
                    onChange={(width) =>
                      onUpdateNode(primary.id, { width: Math.max(12, width) })
                    }
                  />
                  <NumberField
                    label="H"
                    testId="inspector-h"
                    value={primary.height}
                    min={2}
                    onChange={(height) =>
                      onUpdateNode(primary.id, { height: Math.max(2, height) })
                    }
                  />
                  <NumberField
                    label="ROT"
                    value={primary.rotation}
                    onChange={(rotation) => onUpdateNode(primary.id, { rotation })}
                  />
                  <NumberField
                    label="RAD"
                    testId="inspector-radius"
                    value={primary.radius}
                    min={0}
                    onChange={(radius) =>
                      onUpdateNode(primary.id, {
                        radius: Math.max(0, radius),
                        tokenBinding: {
                          ...primary.tokenBinding,
                          radius: undefined,
                        },
                      })
                    }
                  />
                </div>
              </section>

              {/* AUTO-LAYOUT FLEX ENGINE PANEL (Frame nodes) */}
              {primary.type === 'frame' && (
                <section
                  data-testid="autolayout-panel"
                  className="space-y-2 pt-2 border-t"
                  style={{ borderColor: 'var(--studio-border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tech text-[10px] uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--studio-cyan)' }}>
                      <LayoutGrid size={11} />
                      <span>{labels.autoLayoutSection}</span>
                    </span>
                    <button
                      type="button"
                      data-testid="btn-toggle-autolayout"
                      onClick={() => {
                        const cur = primary.autoLayout ?? {
                          enabled: false,
                          direction: 'row' as const,
                          gap: 16,
                          padding: 20,
                          align: 'center' as const,
                        };
                        onApplyAutoLayout(primary.id, {
                          ...cur,
                          enabled: !cur.enabled,
                        });
                      }}
                      className="h-5 px-2 rounded font-mono-tech text-[9px] font-semibold cursor-pointer"
                      style={{
                        backgroundColor: primary.autoLayout?.enabled
                          ? '#059669'
                          : 'var(--studio-surface-2)',
                        color: primary.autoLayout?.enabled
                          ? '#FFFFFF'
                          : 'var(--studio-text-muted)',
                      }}
                    >
                      {primary.autoLayout?.enabled ? 'ACTIVE' : 'ENABLE'}
                    </button>
                  </div>

                  {primary.autoLayout?.enabled && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['row', 'column'] as const).map((dir) => (
                          <button
                            key={dir}
                            type="button"
                            onClick={() =>
                              onApplyAutoLayout(primary.id, {
                                ...primary.autoLayout!,
                                direction: dir,
                              })
                            }
                            className="h-6 rounded border font-mono-tech text-[10px] uppercase cursor-pointer"
                            style={{
                              backgroundColor:
                                primary.autoLayout?.direction === dir
                                  ? 'var(--studio-accent)'
                                  : 'var(--studio-surface-2)',
                              borderColor: 'var(--studio-border)',
                              color:
                                primary.autoLayout?.direction === dir
                                  ? '#FFFFFF'
                                  : 'var(--studio-text-secondary)',
                            }}
                          >
                            {dir}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <NumberField
                          label="GAP"
                          value={primary.autoLayout.gap}
                          min={0}
                          max={80}
                          onChange={(gap) =>
                            onApplyAutoLayout(primary.id, {
                              ...primary.autoLayout!,
                              gap: Math.max(0, gap),
                            })
                          }
                        />
                        <NumberField
                          label="PAD"
                          value={primary.autoLayout.padding}
                          min={0}
                          max={80}
                          onChange={(padding) =>
                            onApplyAutoLayout(primary.id, {
                              ...primary.autoLayout!,
                              padding: Math.max(0, padding),
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* VECTOR BEZIER PATH PANEL (Path nodes) */}
              {primary.type === 'path' && primary.pathData && (
                <section
                  data-testid="path-panel"
                  className="space-y-2 pt-2 border-t"
                  style={{ borderColor: 'var(--studio-border)' }}
                >
                  <div className="font-mono-tech text-[10px] uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--studio-cyan)' }}>
                    <PenTool size={11} />
                    <span>{labels.vectorPathSection}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['solid', 'dashed', 'dotted'] as DashStyle[]).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() =>
                          onUpdateNode(primary.id, {
                            pathData: { ...primary.pathData!, dashStyle: style },
                          })
                        }
                        className="h-6 rounded border font-mono-tech text-[9px] uppercase cursor-pointer"
                        style={{
                          backgroundColor:
                            (primary.pathData?.dashStyle ?? 'solid') === style
                              ? 'var(--studio-accent)'
                              : 'var(--studio-surface-2)',
                          borderColor: 'var(--studio-border)',
                          color:
                            (primary.pathData?.dashStyle ?? 'solid') === style
                              ? '#FFFFFF'
                              : 'var(--studio-text-secondary)',
                        }}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        ['smooth', 'Smooth'],
                        ['endArrow', 'Arrow'],
                        ['glow', 'Glow'],
                      ] as const
                    ).map(([key, lbl]) => {
                      const active = Boolean(primary.pathData?.[key]);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            onUpdateNode(primary.id, {
                              pathData: { ...primary.pathData!, [key]: !active },
                            })
                          }
                          className="h-6 rounded border font-mono-tech text-[9px] cursor-pointer"
                          style={{
                            backgroundColor: active
                              ? 'rgba(6, 182, 212, 0.18)'
                              : 'var(--studio-surface-2)',
                            borderColor: active
                              ? 'rgba(6, 182, 212, 0.5)'
                              : 'var(--studio-border)',
                            color: active
                              ? 'var(--studio-cyan)'
                              : 'var(--studio-text-muted)',
                          }}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* LIVE WCAG 2.1 CONTRAST AUDITOR (Text & Button nodes) */}
              {wcagAudit && (
                <section
                  data-testid="wcag-auditor"
                  className="p-2.5 rounded-lg border space-y-2"
                  style={{
                    backgroundColor: 'var(--studio-surface-2)',
                    borderColor: wcagAudit.passesAAA
                      ? 'rgba(16, 185, 129, 0.35)'
                      : wcagAudit.passesAA
                        ? 'rgba(6, 182, 212, 0.35)'
                        : 'rgba(244, 63, 94, 0.45)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tech text-[9px] uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--studio-text-muted)' }}>
                      <ShieldCheck size={11} />
                      <span>{labels.wcagSection}</span>
                    </span>
                    <span
                      data-testid="wcag-grade"
                      className="font-mono-tech text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: wcagAudit.passesAAA
                          ? 'rgba(16, 185, 129, 0.2)'
                          : wcagAudit.passesAA
                            ? 'rgba(6, 182, 212, 0.2)'
                            : 'rgba(244, 63, 94, 0.2)',
                        color: wcagAudit.passesAAA
                          ? '#34D399'
                          : wcagAudit.passesAA
                            ? '#22D3EE'
                            : '#FB7185',
                      }}
                    >
                      {wcagAudit.ratioLabel} {wcagAudit.grade}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-mono-tech text-[10px]" style={{ color: 'var(--studio-text-secondary)' }}>
                      <span
                        className="w-3.5 h-3.5 rounded border border-white/25"
                        style={{ backgroundColor: wcagAudit.foregroundHex }}
                      />
                      <span>on</span>
                      <span
                        className="w-3.5 h-3.5 rounded border border-white/25"
                        style={{ backgroundColor: wcagAudit.backgroundHex }}
                      />
                    </div>
                    {!wcagAudit.passesAAA && (
                      <button
                        type="button"
                        data-testid="btn-wcag-autofix"
                        onClick={handleFixContrast}
                        className="h-6 px-2 rounded-md bg-emerald-500/20 border border-emerald-500/45 text-emerald-300 font-mono-tech text-[10px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-emerald-500/30"
                      >
                        <Wand2 size={10} />
                        <span>Auto-Fix AAA</span>
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* Appearance & Glass Blur */}
              <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  {labels.appearanceSection}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between font-mono-tech text-[10px]">
                    <span style={{ color: 'var(--studio-text-secondary)' }}>Opacity</span>
                    <span>{Math.round(primary.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={Math.round(primary.opacity * 100)}
                    onChange={(e) =>
                      onUpdateNode(primary.id, {
                        opacity: Number(e.target.value) / 100,
                      })
                    }
                    className="w-full studio-range"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between font-mono-tech text-[10px]">
                    <span style={{ color: 'var(--studio-text-secondary)' }}>Glass Blur</span>
                    <span style={{ color: 'var(--studio-cyan)' }}>{primary.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={32}
                    value={primary.blur}
                    onChange={(e) =>
                      onUpdateNode(primary.id, { blur: Number(e.target.value) })
                    }
                    className="w-full studio-range"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={primary.shadow}
                    onChange={(e) =>
                      onUpdateNode(primary.id, {
                        shadow: e.target.value as ShadowPreset,
                      })
                    }
                    className="h-7 px-2 rounded-md border text-[11px] outline-none"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    {SHADOW_PRESETS.map((s) => (
                      <option key={s} value={s} className="bg-slate-900 text-white">
                        Shadow: {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={primary.blendMode}
                    onChange={(e) =>
                      onUpdateNode(primary.id, {
                        blendMode: e.target.value as BlendMode,
                      })
                    }
                    className="h-7 px-2 rounded-md border text-[11px] outline-none"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    {BLEND_MODES.map((m) => (
                      <option key={m} value={m} className="bg-slate-900 text-white">
                        Blend: {m}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* Fill Controls */}
              {primary.type !== 'text' && primary.type !== 'path' && (
                <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                      {labels.fillSection}
                    </span>
                    <div
                      className="flex rounded-md border p-0.5 gap-0.5"
                      style={{
                        backgroundColor: 'var(--studio-surface-2)',
                        borderColor: 'var(--studio-border)',
                      }}
                    >
                      {(['solid', 'gradient', 'none'] as FillKind[]).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() =>
                            onUpdateNode(primary.id, {
                              fill: {
                                kind,
                                color: primary.fill.color || doc.tokens.brandPrimary,
                                gradient: primary.fill.gradient ?? {
                                  angle: 135,
                                  from: doc.tokens.brandPrimary,
                                  to: doc.tokens.brandAccent,
                                },
                              },
                            })
                          }
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono-tech uppercase cursor-pointer"
                          style={{
                            backgroundColor:
                              primary.fill.kind === kind
                                ? 'var(--studio-accent)'
                                : 'transparent',
                            color:
                              primary.fill.kind === kind
                                ? '#FFFFFF'
                                : 'var(--studio-text-muted)',
                          }}
                        >
                          {kind}
                        </button>
                      ))}
                    </div>
                  </div>

                  {primary.fill.kind === 'solid' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        data-testid="inspector-fill-color"
                        value={primary.fill.color.startsWith('#') ? primary.fill.color : '#6366F1'}
                        onChange={(e) =>
                          onUpdateNode(primary.id, {
                            fill: { ...primary.fill, color: e.target.value },
                            tokenBinding: { ...primary.tokenBinding, fill: undefined },
                          })
                        }
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primary.fill.color}
                        onChange={(e) =>
                          onUpdateNode(primary.id, {
                            fill: { ...primary.fill, color: e.target.value },
                            tokenBinding: { ...primary.tokenBinding, fill: undefined },
                          })
                        }
                        className="flex-1 h-7 px-2 rounded-md border font-mono-tech text-[11px] uppercase outline-none"
                        style={{
                          backgroundColor: 'var(--studio-surface-2)',
                          borderColor: 'var(--studio-border)',
                          color: 'var(--studio-text)',
                        }}
                      />
                    </div>
                  )}

                  {primary.fill.kind === 'gradient' && primary.fill.gradient && (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <label
                          className="flex items-center gap-1.5 h-7 px-1.5 rounded-md border"
                          style={{
                            backgroundColor: 'var(--studio-surface-2)',
                            borderColor: 'var(--studio-border)',
                          }}
                        >
                          <input
                            type="color"
                            value={primary.fill.gradient.from}
                            onChange={(e) =>
                              onUpdateNode(primary.id, {
                                fill: {
                                  ...primary.fill,
                                  gradient: {
                                    ...primary.fill.gradient!,
                                    from: e.target.value,
                                  },
                                },
                                tokenBinding: {
                                  ...primary.tokenBinding,
                                  fillGradientFrom: undefined,
                                },
                              })
                            }
                            className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                          />
                          <span className="font-mono-tech text-[10px] truncate">
                            {primary.fill.gradient.from}
                          </span>
                        </label>
                        <label
                          className="flex items-center gap-1.5 h-7 px-1.5 rounded-md border"
                          style={{
                            backgroundColor: 'var(--studio-surface-2)',
                            borderColor: 'var(--studio-border)',
                          }}
                        >
                          <input
                            type="color"
                            value={primary.fill.gradient.to}
                            onChange={(e) =>
                              onUpdateNode(primary.id, {
                                fill: {
                                  ...primary.fill,
                                  gradient: {
                                    ...primary.fill.gradient!,
                                    to: e.target.value,
                                  },
                                },
                                tokenBinding: {
                                  ...primary.tokenBinding,
                                  fillGradientTo: undefined,
                                },
                              })
                            }
                            className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                          />
                          <span className="font-mono-tech text-[10px] truncate">
                            {primary.fill.gradient.to}
                          </span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tech text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                          Angle {primary.fill.gradient.angle}°
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={primary.fill.gradient.angle}
                          onChange={(e) =>
                            onUpdateNode(primary.id, {
                              fill: {
                                ...primary.fill,
                                gradient: {
                                  ...primary.fill.gradient!,
                                  angle: Number(e.target.value),
                                },
                              },
                            })
                          }
                          className="flex-1 studio-range"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-0.5">
                    {QUICK_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() =>
                          onUpdateNode(primary.id, {
                            fill: { ...primary.fill, kind: 'solid', color: hex },
                            tokenBinding: { ...primary.tokenBinding, fill: undefined },
                          })
                        }
                        className="w-5 h-5 rounded-md border border-white/15 cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>

                  <select
                    value={primary.tokenBinding?.fill ?? ''}
                    onChange={(e) => {
                      const val = e.target.value as ColorTokenKey | '';
                      onUpdateNode(primary.id, {
                        tokenBinding: {
                          ...primary.tokenBinding,
                          fill: val || undefined,
                        },
                      });
                    }}
                    className="w-full h-7 px-2 rounded-md border font-mono-tech text-[10px] outline-none"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-cyan)',
                    }}
                  >
                    <option value="" className="bg-slate-900 text-white">
                      Token Bind: Custom Override
                    </option>
                    {COLOR_TOKEN_META.map((m) => (
                      <option key={m.key} value={m.key} className="bg-slate-900 text-white">
                        Bind Fill → {m.cssVar}
                      </option>
                    ))}
                  </select>
                </section>
              )}

              {/* Stroke Controls */}
              {primary.type !== 'text' && (
                <section className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                  <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                    {labels.strokeSection}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <NumberField
                      label="W"
                      value={primary.strokeWidth}
                      min={0}
                      max={16}
                      onChange={(strokeWidth) =>
                        onUpdateNode(primary.id, { strokeWidth: Math.max(0, strokeWidth) })
                      }
                    />
                    <label
                      className="flex items-center gap-1.5 h-7 px-1.5 rounded-md border"
                      style={{
                        backgroundColor: 'var(--studio-surface-2)',
                        borderColor: 'var(--studio-border)',
                      }}
                    >
                      <input
                        type="color"
                        value={primary.strokeColor.startsWith('#') ? primary.strokeColor : '#06B6D4'}
                        onChange={(e) =>
                          onUpdateNode(primary.id, {
                            strokeColor: e.target.value,
                            tokenBinding: { ...primary.tokenBinding, stroke: undefined },
                          })
                        }
                        className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                      />
                      <span className="font-mono-tech text-[10px] truncate">
                        {primary.strokeColor}
                      </span>
                    </label>
                  </div>
                </section>
              )}

              {/* Typography Controls */}
              {(primary.type === 'text' || primary.type === 'button') && (
                <section className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                  <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                    {labels.typographySection}
                  </div>
                  <textarea
                    rows={2}
                    data-testid="inspector-text-content"
                    value={primary.text ?? ''}
                    onChange={(e) => onUpdateNode(primary.id, { text: e.target.value })}
                    className="w-full p-2 rounded-md border text-xs outline-none resize-none"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  />
                  <select
                    value={primary.fontFamily ?? 'Inter'}
                    onChange={(e) => onUpdateNode(primary.id, { fontFamily: e.target.value })}
                    className="w-full h-7 px-2 rounded-md border text-[11px] outline-none"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font} className="bg-slate-900 text-white">
                        {font}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-1.5">
                    <NumberField
                      label="SZ"
                      value={primary.fontSize ?? 16}
                      min={8}
                      max={120}
                      onChange={(fontSize) =>
                        onUpdateNode(primary.id, { fontSize: Math.max(8, fontSize) })
                      }
                    />
                    <NumberField
                      label="WT"
                      value={primary.fontWeight ?? 600}
                      min={400}
                      max={700}
                      onChange={(fontWeight) =>
                        onUpdateNode(primary.id, {
                          fontWeight: Math.min(700, Math.max(400, fontWeight)),
                        })
                      }
                    />
                    <NumberField
                      label="TRK"
                      value={primary.letterSpacing ?? 0}
                      onChange={(letterSpacing) =>
                        onUpdateNode(primary.id, { letterSpacing })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <div
                      className="flex rounded-md border p-0.5 gap-0.5"
                      style={{
                        backgroundColor: 'var(--studio-surface-2)',
                        borderColor: 'var(--studio-border)',
                      }}
                    >
                      {(
                        [
                          ['left', AlignLeft],
                          ['center', AlignCenter],
                          ['right', AlignRight],
                        ] as const
                      ).map(([align, Icon]) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => onUpdateNode(primary.id, { textAlign: align })}
                          className="w-7 h-6 rounded flex items-center justify-center cursor-pointer"
                          style={{
                            backgroundColor:
                              (primary.textAlign ?? 'left') === align
                                ? 'var(--studio-accent)'
                                : 'transparent',
                            color:
                              (primary.textAlign ?? 'left') === align
                                ? '#FFFFFF'
                                : 'var(--studio-text-secondary)',
                          }}
                        >
                          <Icon size={12} strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                    <label
                      className="flex items-center gap-1.5 h-7 px-2 rounded-md border flex-1"
                      style={{
                        backgroundColor: 'var(--studio-surface-2)',
                        borderColor: 'var(--studio-border)',
                      }}
                    >
                      <input
                        type="color"
                        value={primary.textColor?.startsWith('#') ? primary.textColor : '#F8FAFC'}
                        onChange={(e) =>
                          onUpdateNode(primary.id, {
                            textColor: e.target.value,
                            tokenBinding: { ...primary.tokenBinding, textColor: undefined },
                          })
                        }
                        className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                      />
                      <span className="font-mono-tech text-[10px] truncate">
                        {primary.textColor ?? doc.tokens.textPrimary}
                      </span>
                    </label>
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div
                className="p-2.5 rounded-lg border text-[11px] leading-relaxed"
                style={{
                  backgroundColor: 'var(--studio-surface-2)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text-secondary)',
                }}
              >
                {selectedNodes.length > 1
                  ? `${selectedNodes.length} layers selected. Use the alignment toolbar above or drag on canvas to move together.`
                  : labels.noSelectionHint}
              </div>

              <section className="space-y-2">
                <div className="font-mono-tech text-[10px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  {labels.artboardLabel}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <NumberField
                    label="W"
                    value={doc.artboard.width}
                    min={320}
                    onChange={(width) =>
                      onUpdateArtboard({ width: Math.max(320, width) })
                    }
                  />
                  <NumberField
                    label="H"
                    value={doc.artboard.height}
                    min={320}
                    onChange={(height) =>
                      onUpdateArtboard({ height: Math.max(320, height) })
                    }
                  />
                  <NumberField
                    label="RAD"
                    value={doc.artboard.radius}
                    min={0}
                    onChange={(radius) =>
                      onUpdateArtboard({ radius: Math.max(0, radius) })
                    }
                  />
                  <label
                    className="flex items-center gap-1.5 h-7 px-2 rounded-md border"
                    style={{
                      backgroundColor: 'var(--studio-surface-2)',
                      borderColor: 'var(--studio-border)',
                    }}
                  >
                    <input
                      type="color"
                      value={doc.artboard.background.color}
                      onChange={(e) =>
                        onUpdateArtboard({
                          background: { kind: 'solid', color: e.target.value },
                          tokenBinding: undefined,
                        })
                      }
                      className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                    />
                    <span className="font-mono-tech text-[10px] truncate">
                      {doc.artboard.background.color}
                    </span>
                  </label>
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
