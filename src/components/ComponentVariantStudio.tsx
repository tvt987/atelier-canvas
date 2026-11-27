import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Grid2X2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import type { DesignTokens } from '../types/canvas';
import { FLAGSHIP_V4_THEMES } from '../engines/designTokens';
import { downloadTextFile } from '../engines/exporter';
import {
  COMPONENT_PRIMITIVES,
  COMPONENT_SIZES,
  COMPONENT_STATES,
  COMPONENT_VARIANTS,
  autoFixDesignSystemMatrix,
  buildAllPrimitivesVariantAudit,
  buildAutoFixOverridesForCell,
  createLowContrastStressTestTokens,
  generateReactCvaSpecCode,
  generateSwiftUiButtonStyleCode,
  type ComponentPrimitiveId,
  type ComponentSizeId,
  type VariantCellOverrideMap,
  type VariantMatrixCell,
  type WcagStrictness,
} from '../engines/componentVariantEngine';

interface ComponentVariantStudioProps {
  open: boolean;
  onClose: () => void;
  tokens: DesignTokens;
  onUpdateTokens: (nextTokens: DesignTokens) => void;
}

type SizeFilterMode = ComponentSizeId | 'all';
type SpecCodeTab = 'react-cva' | 'swiftui';
type MatrixBackdropMode = 'theme' | 'daylight' | 'obsidian';

function PrimitivePreview({ cell }: { cell: VariantMatrixCell }) {
  const { style, primitive, variant, state } = cell;

  if (primitive === 'action-button') {
    const labelText =
      variant === 'destructive'
        ? 'Revoke Key'
        : variant === 'ghost'
          ? 'Inspect Diff'
          : variant === 'secondary'
            ? 'Save Draft'
            : 'Deploy Build';

    return (
      <div
        className="inline-flex items-center justify-center gap-1.5 select-none transition-all max-w-full"
        style={{
          height: style.heightPx,
          paddingLeft: style.paddingX,
          paddingRight: style.paddingX,
          borderRadius: style.radiusPx,
          backgroundColor: style.backgroundHex,
          color: style.foregroundHex,
          border: `1px solid ${style.borderHex}`,
          fontSize: style.fontSizePx,
          fontWeight: style.fontWeight,
          boxShadow: style.shadow,
          transform: state === 'hover' ? 'translateY(-1px)' : undefined,
        }}
      >
        {variant === 'destructive' ? (
          <AlertTriangle size={Math.max(11, Math.round(style.fontSizePx))} strokeWidth={1.9} />
        ) : null}
        <span className="truncate leading-none">{labelText}</span>
        {variant !== 'destructive' ? (
          <ArrowUpRight size={Math.max(11, Math.round(style.fontSizePx))} strokeWidth={1.9} />
        ) : null}
      </div>
    );
  }

  if (primitive === 'status-badge') {
    const badgeText =
      variant === 'destructive'
        ? 'CONFLICT 409'
        : variant === 'ghost'
          ? 'STAGING'
          : variant === 'secondary'
            ? 'SYNCED v6'
            : '99.98% SLA';

    return (
      <div
        className="inline-flex items-center gap-1.5 font-mono-tech select-none max-w-full"
        style={{
          height: style.heightPx,
          paddingLeft: style.paddingX,
          paddingRight: style.paddingX,
          borderRadius: style.radiusPx,
          backgroundColor: style.backgroundHex,
          color: style.foregroundHex,
          border: `1px solid ${style.borderHex}`,
          fontSize: style.fontSizePx,
          fontWeight: 600,
          boxShadow: style.shadow,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: style.foregroundHex }}
        />
        <span className="truncate leading-none tracking-wide">{badgeText}</span>
      </div>
    );
  }

  // metric-input
  const valueText =
    variant === 'destructive'
      ? 'ERR 409'
      : variant === 'ghost'
        ? '14.2 ms'
        : variant === 'secondary'
          ? '$142,800'
          : '4,820 RPS';

  return (
    <div
      className="w-full max-w-[168px] flex items-center justify-between gap-2 font-mono-tech select-none"
      style={{
        height: style.heightPx,
        paddingLeft: style.paddingX,
        paddingRight: Math.max(8, style.paddingX - 4),
        borderRadius: style.radiusPx,
        backgroundColor: style.backgroundHex,
        color: style.foregroundHex,
        border: `1px solid ${style.borderHex}`,
        fontSize: style.fontSizePx,
        fontWeight: style.fontWeight,
        boxShadow: style.shadow,
      }}
    >
      <span className="truncate leading-none">{valueText}</span>
      <span
        className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded shrink-0"
        style={{
          border: `1px solid ${style.borderHex}`,
          color: style.foregroundHex,
        }}
      >
        {variant === 'destructive' ? 'ERR' : 'LIVE'}
      </span>
    </div>
  );
}

export function ComponentVariantStudio({
  open,
  onClose,
  tokens,
  onUpdateTokens,
}: ComponentVariantStudioProps) {
  const [activePrimitive, setActivePrimitive] =
    useState<ComponentPrimitiveId>('action-button');
  const [sizeFilter, setSizeFilter] = useState<SizeFilterMode>('md');
  const [strictness, setStrictness] = useState<WcagStrictness>('AA');
  const [contrastOverlay, setContrastOverlay] = useState(true);
  const [matrixBackdrop, setMatrixBackdrop] = useState<MatrixBackdropMode>('theme');
  const [specTab, setSpecTab] = useState<SpecCodeTab>('react-cva');
  const [overrides, setOverrides] = useState<VariantCellOverrideMap>({});
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fullAudit = useMemo(
    () =>
      open
        ? buildAllPrimitivesVariantAudit(tokens, { strictness, overrides })
        : null,
    [open, tokens, strictness, overrides],
  );

  const activeMatrix = fullAudit ? fullAudit.byPrimitive[activePrimitive] : null;

  const specCode = useMemo(() => {
    if (!activeMatrix) return '';
    return specTab === 'react-cva'
      ? generateReactCvaSpecCode(tokens, activePrimitive, activeMatrix)
      : generateSwiftUiButtonStyleCode(tokens, activeMatrix);
  }, [activeMatrix, activePrimitive, specTab, tokens]);

  if (!open || !fullAudit || !activeMatrix) return null;

  const flashNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const visibleSizes: ComponentSizeId[] =
    sizeFilter === 'all' ? ['sm', 'md', 'lg'] : [sizeFilter];

  const activeBackdropHex =
    matrixBackdrop === 'daylight'
      ? '#F4F5F7'
      : matrixBackdrop === 'obsidian'
        ? '#0A0B0E'
        : tokens.surfaceCanvas;

  const handleAutoFixCell = (cell: VariantMatrixCell) => {
    if (!cell.autoFix) return;
    const nextOverrides = buildAutoFixOverridesForCell(
      activeMatrix,
      cell.id,
      overrides,
      true,
    );
    setOverrides(nextOverrides);
    flashNotice(
      `Fixed ${cell.variant}/${cell.state} -> ${cell.autoFix.fixedRatio.toFixed(2)}:1 (${cell.autoFix.fixedGrade})`,
    );
  };

  const handleAutoFixAll = () => {
    const result = autoFixDesignSystemMatrix(tokens, strictness, overrides);
    onUpdateTokens(result.nextTokens);
    setOverrides(result.nextOverrides);
    flashNotice(
      `Auto-fixed accessible tokens & ${result.fixedCellCount} cells -> 100% WCAG ${strictness} PASS`,
    );
  };

  const handleStressTest = () => {
    setOverrides({});
    onUpdateTokens(createLowContrastStressTestTokens(tokens));
    flashNotice('Loaded Low-Contrast Stress Test — audit badges flagged failing cells');
  };

  const handleSwitchTheme = (theme: DesignTokens) => {
    setOverrides({});
    onUpdateTokens(theme);
    flashNotice(`Synced matrix to ${theme.name}`);
  };

  const handleCopySpec = async () => {
    try {
      await navigator.clipboard.writeText(specCode);
    } catch {
      // Headless clipboard fallback
    }
    setCopied(true);
    flashNotice(
      specTab === 'react-cva'
        ? 'Copied React 19 + Tailwind v4 CVA spec'
        : 'Copied SwiftUI ButtonStyle spec',
    );
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleDownloadSpec = () => {
    const filename =
      specTab === 'react-cva'
        ? activePrimitive === 'action-button'
          ? 'AtelierActionButton.tsx'
          : activePrimitive === 'status-badge'
            ? 'AtelierStatusBadge.tsx'
            : 'AtelierMetricInput.tsx'
        : 'AtelierButtonStyle.swift';
    downloadTextFile(specCode, filename, 'text/plain;charset=utf-8');
    flashNotice(`Downloaded ${filename}`);
  };

  const scoreTone =
    activeMatrix.complianceScorePercent >= 100
      ? { color: '#34D399', border: 'rgba(16,185,129,0.5)', bg: 'rgba(16,185,129,0.14)' }
      : activeMatrix.complianceScorePercent >= 70
        ? { color: '#FBBF24', border: 'rgba(245,158,11,0.48)', bg: 'rgba(245,158,11,0.14)' }
        : { color: '#FB7185', border: 'rgba(244,63,94,0.52)', bg: 'rgba(244,63,94,0.16)' };

  const specFilename =
    specTab === 'react-cva'
      ? activePrimitive === 'action-button'
        ? 'AtelierActionButton.tsx'
        : activePrimitive === 'status-badge'
          ? 'AtelierStatusBadge.tsx'
          : 'AtelierMetricInput.tsx'
      : 'AtelierButtonStyle.swift';

  return (
    <div
      data-testid="variant-studio-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
    >
      <div
        data-testid="variant-studio-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-7xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: 'var(--studio-surface)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        {/* Top Studio Header */}
        <div
          className="px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(16,185,129,0.18))',
                borderColor: 'rgba(99,102,241,0.45)',
                color: 'var(--studio-accent)',
              }}
            >
              <Grid2X2 size={15} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-sm truncate">
                  Component Variant Matrix &amp; WCAG 2.1 Contrast Audit
                </h2>
                <span
                  className="font-mono-tech text-[9.5px] font-semibold px-1.5 py-0.5 rounded border shrink-0"
                  style={{
                    color: 'var(--studio-cyan)',
                    borderColor: 'rgba(6,182,212,0.4)',
                    backgroundColor: 'rgba(6,182,212,0.1)',
                  }}
                >
                  4×3×4 = 48 CELLS · 144 SYSTEMWIDE
                </span>
              </div>
              <p
                className="text-[11px] truncate"
                style={{ color: 'var(--studio-text-secondary)' }}
              >
                Live-synced with {tokens.name} W3C tokens · real-time relative luminance audit &amp; CVA / SwiftUI spec codegen
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {notice && (
              <span
                data-testid="variant-studio-notice"
                className="font-mono-tech text-[10px] text-emerald-400 flex items-center gap-1 mr-1"
              >
                <Check size={12} />
                <span>{notice}</span>
              </span>
            )}

            {/* Compliance Score Pill */}
            <div
              data-testid="variant-compliance-score"
              data-score={activeMatrix.complianceScorePercent}
              data-failing-count={activeMatrix.failingCount}
              className="h-7 px-2.5 rounded-lg border font-mono-tech text-[10.5px] font-bold flex items-center gap-1.5"
              style={{
                backgroundColor: scoreTone.bg,
                borderColor: scoreTone.border,
                color: scoreTone.color,
              }}
            >
              {activeMatrix.failingCount === 0 ? (
                <ShieldCheck size={12} />
              ) : (
                <ShieldAlert size={12} />
              )}
              <span>
                {activeMatrix.complianceScorePercent}% WCAG {strictness} ({activeMatrix.passingCount}/
                {activeMatrix.totalCells})
              </span>
            </div>

            {/* AA / AAA Strictness Switch */}
            <div
              className="h-7 p-0.5 rounded-lg border flex items-center gap-0.5"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              {(['AA', 'AAA'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  data-testid={`strictness-${level.toLowerCase()}`}
                  onClick={() => setStrictness(level)}
                  className="h-full px-2 rounded-md font-mono-tech text-[9.5px] font-semibold cursor-pointer transition-colors"
                  style={{
                    backgroundColor:
                      strictness === level ? 'var(--studio-accent)' : 'transparent',
                    color:
                      strictness === level ? '#FFFFFF' : 'var(--studio-text-secondary)',
                  }}
                >
                  {level} {level === 'AA' ? '4.5:1' : '7.0:1'}
                </button>
              ))}
            </div>

            {/* Overlay Visibility Toggle */}
            <button
              type="button"
              data-testid="toggle-contrast-overlay"
              onClick={() => setContrastOverlay((v) => !v)}
              className="h-7 px-2 rounded-lg border font-mono-tech text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              style={{
                backgroundColor: contrastOverlay
                  ? 'var(--studio-accent-soft)'
                  : 'var(--studio-surface-2)',
                borderColor: contrastOverlay
                  ? 'var(--studio-accent)'
                  : 'var(--studio-border)',
                color: contrastOverlay
                  ? 'var(--studio-accent)'
                  : 'var(--studio-text-secondary)',
              }}
            >
              {contrastOverlay ? <Eye size={11} /> : <EyeOff size={11} />}
              <span>Audit Overlay</span>
            </button>

            {/* 1-Click Auto-Fix All Failing Tokens */}
            <button
              type="button"
              data-testid="btn-autofix-all-variants"
              onClick={handleAutoFixAll}
              disabled={fullAudit.failingCount === 0}
              className="h-7 px-2.5 rounded-lg text-[10.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default"
              style={{
                background:
                  fullAudit.failingCount === 0
                    ? 'rgba(16,185,129,0.2)'
                    : 'linear-gradient(135deg, #10B981, #059669)',
                color: fullAudit.failingCount === 0 ? '#34D399' : '#FFFFFF',
                border:
                  fullAudit.failingCount === 0
                    ? '1px solid rgba(16,185,129,0.45)'
                    : '1px solid rgba(16,185,129,0.6)',
              }}
            >
              <Wand2 size={11} />
              <span>
                {fullAudit.failingCount === 0
                  ? `100% ${strictness} Verified`
                  : `Auto-Fix All (${fullAudit.failingCount} Failing)`}
              </span>
            </button>

            <button
              type="button"
              data-testid="btn-variant-studio-close"
              onClick={onClose}
              aria-label="Close Component Variant Matrix"
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
              style={{ color: 'var(--studio-text-secondary)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Control Bar: 3 Primitives + Size Switch + Live W3C Token Sync */}
        <div
          className="px-4 sm:px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0"
          style={{
            backgroundColor: 'var(--studio-surface-2)',
            borderColor: 'var(--studio-border)',
          }}
        >
          {/* 3 Primitives Tabs */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {COMPONENT_PRIMITIVES.map((prim) => {
              const isSelected = activePrimitive === prim.id;
              const primStats = fullAudit.byPrimitive[prim.id];
              return (
                <button
                  key={prim.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`primitive-tab-${prim.id}`}
                  onClick={() => setActivePrimitive(prim.id)}
                  className="h-8 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--studio-accent)'
                      : 'var(--studio-surface)',
                    borderColor: isSelected
                      ? 'var(--studio-accent)'
                      : 'var(--studio-border)',
                    color: isSelected ? '#FFFFFF' : 'var(--studio-text-secondary)',
                  }}
                >
                  <span>{prim.label}</span>
                  <span
                    className="font-mono-tech text-[9px] px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.18)'
                        : primStats.failingCount === 0
                          ? 'rgba(16,185,129,0.14)'
                          : 'rgba(244,63,94,0.16)',
                      color: isSelected
                        ? '#FFFFFF'
                        : primStats.failingCount === 0
                          ? '#34D399'
                          : '#FB7185',
                    }}
                  >
                    {primStats.complianceScorePercent}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Size Filter + Matrix Surface Switch */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="h-8 p-0.5 rounded-lg border flex items-center gap-0.5"
              style={{
                backgroundColor: 'var(--studio-surface)',
                borderColor: 'var(--studio-border)',
              }}
            >
              {(['sm', 'md', 'lg', 'all'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  data-testid={`size-filter-${sz}`}
                  onClick={() => setSizeFilter(sz)}
                  className="h-full px-2 rounded-md font-mono-tech text-[10px] font-semibold cursor-pointer transition-colors"
                  style={{
                    backgroundColor:
                      sizeFilter === sz ? 'var(--studio-accent)' : 'transparent',
                    color:
                      sizeFilter === sz ? '#FFFFFF' : 'var(--studio-text-secondary)',
                  }}
                >
                  {sz === 'all' ? 'All 3 Sizes (48)' : sz.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Matrix Surface Inspection Toggle */}
            <div
              className="h-8 p-0.5 rounded-lg border flex items-center gap-0.5"
              style={{
                backgroundColor: 'var(--studio-surface)',
                borderColor: 'var(--studio-border)',
              }}
            >
              {(
                [
                  ['theme', 'Theme'],
                  ['daylight', 'Light #F4F5F7'],
                  ['obsidian', 'Dark'],
                ] as const
              ).map(([mode, lbl]) => (
                <button
                  key={mode}
                  type="button"
                  data-testid={`matrix-backdrop-${mode}`}
                  onClick={() => setMatrixBackdrop(mode)}
                  className="h-full px-2 rounded-md font-mono-tech text-[9.5px] font-semibold cursor-pointer transition-colors"
                  style={{
                    backgroundColor:
                      matrixBackdrop === mode ? 'var(--studio-accent-soft)' : 'transparent',
                    color:
                      matrixBackdrop === mode
                        ? 'var(--studio-accent)'
                        : 'var(--studio-text-muted)',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live W3C Design Token Sync Bar */}
        <div
          className="px-4 sm:px-5 py-2 border-b flex flex-wrap items-center justify-between gap-2 shrink-0"
          style={{
            backgroundColor: 'var(--studio-surface)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="font-mono-tech text-[9.5px] uppercase tracking-wider flex items-center gap-1"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              <Sliders size={11} />
              <span>Live W3C Tokens:</span>
            </span>

            {FLAGSHIP_V4_THEMES.map((theme) => {
              const isActive = tokens.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  data-testid={`variant-theme-${theme.id}`}
                  onClick={() => handleSwitchTheme(theme)}
                  className="h-6 px-2 rounded-md border font-mono-tech text-[9.5px] flex items-center gap-1.5 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? 'var(--studio-accent-soft)'
                      : 'var(--studio-surface-2)',
                    borderColor: isActive
                      ? 'var(--studio-accent)'
                      : 'var(--studio-border)',
                    color: isActive ? 'var(--studio-text)' : 'var(--studio-text-muted)',
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/25"
                    style={{ backgroundColor: theme.brandPrimary }}
                  />
                  <span>{theme.name}</span>
                </button>
              );
            })}

            {/* Live Accent, Surface, Border, Radius Controls */}
            <label className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border font-mono-tech text-[9.5px]" style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-surface-2)' }}>
              <span style={{ color: 'var(--studio-text-muted)' }}>Accent</span>
              <input
                type="color"
                data-testid="variant-token-accent"
                value={tokens.brandPrimary}
                onChange={(e) => {
                  setOverrides({});
                  onUpdateTokens({ ...tokens, brandPrimary: e.target.value.toUpperCase() });
                }}
                className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
              />
            </label>

            <label className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border font-mono-tech text-[9.5px]" style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-surface-2)' }}>
              <span style={{ color: 'var(--studio-text-muted)' }}>Border</span>
              <input
                type="color"
                data-testid="variant-token-border"
                value={tokens.borderSubtle}
                onChange={(e) => {
                  setOverrides({});
                  onUpdateTokens({ ...tokens, borderSubtle: e.target.value.toUpperCase() });
                }}
                className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
              />
            </label>

            <label className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border font-mono-tech text-[9.5px]" style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-surface-2)' }}>
              <span style={{ color: 'var(--studio-text-muted)' }}>Surface</span>
              <input
                type="color"
                data-testid="variant-token-surface"
                value={tokens.surfaceCard}
                onChange={(e) => {
                  setOverrides({});
                  onUpdateTokens({ ...tokens, surfaceCard: e.target.value.toUpperCase() });
                }}
                className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
              />
            </label>

            <label className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border font-mono-tech text-[9.5px]" style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-surface-2)' }}>
              <span style={{ color: 'var(--studio-text-muted)' }}>Radius</span>
              <input
                type="range"
                data-testid="variant-token-radius"
                min={0}
                max={24}
                value={tokens.radiusBase}
                onChange={(e) =>
                  onUpdateTokens({ ...tokens, radiusBase: Number(e.target.value) })
                }
                className="w-16 studio-range"
              />
              <span className="w-7 text-right">{tokens.radiusBase}px</span>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="btn-stress-test-contrast"
              onClick={handleStressTest}
              className="h-6 px-2 rounded-md border font-mono-tech text-[9.5px] font-semibold flex items-center gap-1 cursor-pointer hover:brightness-110"
              style={{
                borderColor: 'rgba(244,63,94,0.4)',
                backgroundColor: 'rgba(244,63,94,0.1)',
                color: '#FB7185',
              }}
            >
              <Sparkles size={10} />
              <span>Stress-Test Fail</span>
            </button>
            {Object.keys(overrides).length > 0 && (
              <button
                type="button"
                data-testid="btn-reset-variant-overrides"
                onClick={() => {
                  setOverrides({});
                  flashNotice('Cleared cell contrast overrides');
                }}
                className="h-6 px-2 rounded-md border font-mono-tech text-[9.5px] flex items-center gap-1 cursor-pointer"
                style={{
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text-secondary)',
                }}
              >
                <RotateCcw size={10} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Workspace: Responsive Matrix Grid + Production Code Spec */}
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 overflow-hidden">
          {/* Left 8 cols: Interactive 4 Variants × Sizes × 4 States Matrix */}
          <div className="xl:col-span-8 overflow-auto studio-scroll p-3.5 sm:p-4 border-b xl:border-b-0 xl:border-r" style={{ borderColor: 'var(--studio-border)' }}>
            {/* Column State Headers */}
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[120px_repeat(4,minmax(0,1fr))] gap-2 mb-2 px-1">
                <div
                  className="font-mono-tech text-[9.5px] uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--studio-text-muted)' }}
                >
                  Variant / Size
                </div>
                {COMPONENT_STATES.map((st) => (
                  <div
                    key={st.id}
                    className="font-mono-tech text-[9.5px] uppercase tracking-wider font-semibold text-center"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    {st.label}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {COMPONENT_VARIANTS.map((variant) =>
                  visibleSizes.map((sz) => {
                    const sizeMeta =
                      COMPONENT_SIZES.find((s) => s.id === sz) ?? COMPONENT_SIZES[1];
                    const rowCells = COMPONENT_STATES.map((st) =>
                      activeMatrix.cells.find(
                        (c) =>
                          c.variant === variant.id &&
                          c.size === sz &&
                          c.state === st.id,
                      )!,
                    );

                    return (
                      <div
                        key={`${variant.id}-${sz}`}
                        className="grid grid-cols-[120px_repeat(4,minmax(0,1fr))] gap-2 items-stretch"
                      >
                        {/* Row Label */}
                        <div
                          className="rounded-xl border px-2.5 py-2 flex flex-col justify-center"
                          style={{
                            backgroundColor: 'var(--studio-surface-2)',
                            borderColor: 'var(--studio-border)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11.5px] font-semibold">
                              {variant.label}
                            </span>
                            <span
                              className="font-mono-tech text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: 'var(--studio-accent-soft)',
                                color: 'var(--studio-accent)',
                              }}
                            >
                              {sizeMeta.label}
                            </span>
                          </div>
                          <span
                            className="font-mono-tech text-[9px] truncate mt-0.5"
                            style={{ color: 'var(--studio-text-muted)' }}
                          >
                            {sizeMeta.heightPx}px · {sizeMeta.fontSizePx}px
                          </span>
                        </div>

                        {/* 4 State Cells */}
                        {rowCells.map((cell) => {
                          const isFailing = !cell.passesTarget;
                          const badgeColors = cell.wcag.passesAAA
                            ? {
                                bg: 'rgba(16,185,129,0.18)',
                                border: 'rgba(16,185,129,0.48)',
                                text: '#34D399',
                              }
                            : cell.passesTarget
                              ? {
                                  bg: 'rgba(6,182,212,0.18)',
                                  border: 'rgba(6,182,212,0.48)',
                                  text: '#22D3EE',
                                }
                              : {
                                  bg: 'rgba(244,63,94,0.22)',
                                  border: 'rgba(244,63,94,0.65)',
                                  text: '#FB7185',
                                };

                          return (
                            <div
                              key={cell.id}
                              data-testid={`variant-cell-${cell.variant}-${cell.size}-${cell.state}`}
                              data-wcag-pass={String(cell.passesTarget)}
                              data-wcag-grade={cell.wcag.grade}
                              data-wcag-ratio={cell.wcag.ratioLabel}
                              className="rounded-xl border p-2.5 flex flex-col justify-between gap-2 relative transition-all min-h-[104px]"
                              style={{
                                backgroundColor: activeBackdropHex,
                                borderColor:
                                  contrastOverlay && isFailing
                                    ? 'rgba(244, 63, 94, 0.78)'
                                    : cell.isOverridden
                                      ? 'rgba(16, 185, 129, 0.6)'
                                      : 'var(--studio-border-strong)',
                                boxShadow:
                                  contrastOverlay && isFailing
                                    ? 'inset 0 0 0 1px rgba(244,63,94,0.3)'
                                    : undefined,
                              }}
                            >
                              {/* WCAG Contrast Audit Top Strip */}
                              {contrastOverlay && (
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    data-testid={`wcag-badge-${cell.variant}-${cell.size}-${cell.state}`}
                                    className="font-mono-tech text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none"
                                    style={{
                                      backgroundColor: badgeColors.bg,
                                      borderColor: badgeColors.border,
                                      color: badgeColors.text,
                                    }}
                                  >
                                    {cell.wcag.ratioLabel} {cell.wcag.grade}
                                  </span>
                                  {cell.isOverridden && (
                                    <span className="font-mono-tech text-[8.5px] text-emerald-400 font-semibold">
                                      FIXED
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Live Component Preview */}
                              <div className="flex-1 flex items-center justify-center py-1">
                                <PrimitivePreview cell={cell} />
                              </div>

                              {/* Bottom Hex Telemetry or 1-Click Auto-Fix CTA */}
                              {contrastOverlay && (
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className="font-mono-tech text-[8.5px] truncate opacity-75"
                                    style={{
                                      color:
                                        matrixBackdrop === 'daylight'
                                          ? '#334155'
                                          : '#94A3B8',
                                    }}
                                    title={`FG ${cell.style.foregroundHex} on BG ${cell.style.backgroundHex}`}
                                  >
                                    {cell.style.foregroundHex}/{cell.style.backgroundHex}
                                  </span>
                                  {isFailing && cell.autoFix && (
                                    <button
                                      type="button"
                                      data-testid={`btn-autofix-${cell.variant}-${cell.size}-${cell.state}`}
                                      onClick={() => handleAutoFixCell(cell)}
                                      title={`Auto-fix to ${cell.autoFix.recommendedForegroundHex} on ${cell.autoFix.recommendedBackgroundHex} (${cell.autoFix.fixedRatio.toFixed(2)}:1 ${cell.autoFix.fixedGrade})`}
                                      className="h-5 px-1.5 rounded bg-rose-500 hover:bg-emerald-500 text-white font-mono-tech text-[8.5px] font-bold flex items-center gap-0.5 shrink-0 cursor-pointer transition-colors"
                                    >
                                      <Wand2 size={9} />
                                      <span>Auto-Fix</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }),
                )}
              </div>
            </div>
          </div>

          {/* Right 4 cols: Production CVA + SwiftUI Spec Generator */}
          <div className="xl:col-span-4 flex flex-col min-h-0 overflow-hidden">
            {/* Spec Target Tabs + Copy/Download */}
            <div
              className="px-3.5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="spec-tab-react-cva"
                  onClick={() => setSpecTab('react-cva')}
                  className="h-7 px-2.5 rounded-md border font-mono-tech text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor:
                      specTab === 'react-cva'
                        ? 'var(--studio-accent)'
                        : 'var(--studio-surface)',
                    borderColor:
                      specTab === 'react-cva'
                        ? 'var(--studio-accent)'
                        : 'var(--studio-border)',
                    color:
                      specTab === 'react-cva'
                        ? '#FFFFFF'
                        : 'var(--studio-text-secondary)',
                  }}
                >
                  <Code2 size={11} />
                  <span>React 19 CVA</span>
                </button>
                <button
                  type="button"
                  data-testid="spec-tab-swiftui"
                  onClick={() => setSpecTab('swiftui')}
                  className="h-7 px-2.5 rounded-md border font-mono-tech text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor:
                      specTab === 'swiftui'
                        ? 'var(--studio-accent)'
                        : 'var(--studio-surface)',
                    borderColor:
                      specTab === 'swiftui'
                        ? 'var(--studio-accent)'
                        : 'var(--studio-border)',
                    color:
                      specTab === 'swiftui'
                        ? '#FFFFFF'
                        : 'var(--studio-text-secondary)',
                  }}
                >
                  <Smartphone size={11} />
                  <span>SwiftUI Style</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="btn-copy-variant-spec"
                  onClick={handleCopySpec}
                  className="h-7 px-2 rounded-md border font-mono-tech text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--studio-surface)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  data-testid="btn-download-variant-spec"
                  onClick={handleDownloadSpec}
                  className="h-7 px-2 rounded-md text-[10px] font-semibold text-white flex items-center gap-1 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  }}
                >
                  <Download size={11} />
                  <span>Save</span>
                </button>
              </div>
            </div>

            {/* File Metadata Strip */}
            <div
              className="px-3.5 py-1.5 border-b flex items-center justify-between font-mono-tech text-[9.5px] shrink-0"
              style={{
                backgroundColor: '#0A0D14',
                borderColor: 'rgba(255,255,255,0.08)',
                color: '#94A3B8',
              }}
            >
              <span>{specFilename}</span>
              <span>
                AA {activeMatrix.aaPassCount}/48 · AAA {activeMatrix.aaaPassCount}/48
              </span>
            </div>

            {/* Code Output */}
            <div
              className="flex-1 overflow-auto studio-scroll p-3.5"
              style={{ backgroundColor: '#090B10' }}
            >
              <pre
                data-testid="variant-spec-code"
                className="font-mono-tech text-[10.5px] leading-relaxed text-cyan-100 whitespace-pre select-text"
              >
                <code>{specCode}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComponentVariantStudio;
