import type { DesignTokens } from '../types/canvas';
import { hydrateDesignTokens } from './designTokens';
import { normalizeHex6, isLightThemeSurface } from './tokenCompilerEngine';
import {
  computeContrastRatio,
  parseHexColor,
  relativeLuminance,
  type WcagAuditResult,
} from './wcag';

export type ComponentPrimitiveId = 'action-button' | 'status-badge' | 'metric-input';
export type ComponentVariantId = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ComponentSizeId = 'sm' | 'md' | 'lg';
export type ComponentStateId = 'default' | 'hover' | 'focus' | 'disabled';
export type WcagStrictness = 'AA' | 'AAA';

export const COMPONENT_PRIMITIVES: Array<{
  id: ComponentPrimitiveId;
  label: string;
  shortLabel: string;
  description: string;
  sampleLabel: string;
  sampleSecondaryText: string;
}> = [
  {
    id: 'action-button',
    label: 'Action Button',
    shortLabel: 'Action Button',
    description: 'Interactive trigger control with elevation, focus ring, and tactile state tokens',
    sampleLabel: 'Deploy Release',
    sampleSecondaryText: 'CMD',
  },
  {
    id: 'status-badge',
    label: 'Status Badge',
    shortLabel: 'Status Badge',
    description: 'Compact telemetry pill & state indicator synchronized with semantic signal tokens',
    sampleLabel: '99.98% SLA',
    sampleSecondaryText: 'LIVE',
  },
  {
    id: 'metric-input',
    label: 'Metric Input Field',
    shortLabel: 'Metric Input',
    description: 'Precision tabular-numeral data entry control with border & focus ring states',
    sampleLabel: '4,820 RPS',
    sampleSecondaryText: 'MAX',
  },
];

export const COMPONENT_VARIANTS: Array<{
  id: ComponentVariantId;
  label: string;
  tokenRole: string;
}> = [
  { id: 'primary', label: 'Primary', tokenRole: 'brandPrimary' },
  { id: 'secondary', label: 'Secondary', tokenRole: 'surfaceElevated + borderSubtle' },
  { id: 'ghost', label: 'Ghost', tokenRole: 'surfaceCanvas + textPrimary' },
  { id: 'destructive', label: 'Destructive', tokenRole: 'primitives.danger500' },
];

export const COMPONENT_SIZES: Array<{
  id: ComponentSizeId;
  label: string;
  heightPx: number;
  paddingX: number;
  fontSizePx: number;
  radiusScale: number;
}> = [
  { id: 'sm', label: 'SM', heightPx: 28, paddingX: 10, fontSizePx: 11, radiusScale: 0.5 },
  { id: 'md', label: 'MD', heightPx: 36, paddingX: 14, fontSizePx: 12.5, radiusScale: 0.75 },
  { id: 'lg', label: 'LG', heightPx: 44, paddingX: 18, fontSizePx: 14, radiusScale: 1.0 },
];

export const COMPONENT_STATES: Array<{
  id: ComponentStateId;
  label: string;
}> = [
  { id: 'default', label: 'Default' },
  { id: 'hover', label: 'Hover' },
  { id: 'focus', label: 'Focus Ring' },
  { id: 'disabled', label: 'Disabled' },
];

export interface VariantCellColorOverride {
  foregroundHex?: string;
  backgroundHex?: string;
  borderHex?: string;
}

export type VariantCellOverrideMap = Record<string, VariantCellColorOverride>;

export interface AccessibleColorFix {
  originalForegroundHex: string;
  originalBackgroundHex: string;
  recommendedForegroundHex: string;
  recommendedBackgroundHex: string;
  originalRatio: number;
  fixedRatio: number;
  fixedGrade: WcagAuditResult['grade'];
  strategy:
    | 'already-compliant'
    | 'flip-foreground-ink'
    | 'adjust-foreground'
    | 'darken-background'
    | 'lighten-background'
    | 'high-contrast-pair';
}

export interface VariantCellStyle {
  backgroundHex: string;
  foregroundHex: string;
  borderHex: string;
  focusRingHex: string | null;
  focusRingOffsetHex: string;
  radiusPx: number;
  heightPx: number;
  paddingX: number;
  fontSizePx: number;
  fontWeight: number;
  shadow: string;
  surfaceContainerHex: string;
}

export interface VariantMatrixCell {
  id: string;
  primitive: ComponentPrimitiveId;
  variant: ComponentVariantId;
  size: ComponentSizeId;
  state: ComponentStateId;
  label: string;
  style: VariantCellStyle;
  wcag: WcagAuditResult;
  exactRatio: number;
  targetRatio: number;
  passesTarget: boolean;
  autoFix: AccessibleColorFix | null;
  isOverridden: boolean;
}

export interface ComponentVariantMatrixResult {
  primitive: ComponentPrimitiveId;
  strictness: WcagStrictness;
  targetRatio: number;
  cells: VariantMatrixCell[];
  totalCells: number;
  passingCount: number;
  failingCount: number;
  aaPassCount: number;
  aaaPassCount: number;
  complianceScorePercent: number;
}

export interface FullDesignSystemVariantAudit {
  strictness: WcagStrictness;
  targetRatio: number;
  byPrimitive: Record<ComponentPrimitiveId, ComponentVariantMatrixResult>;
  totalCells: number;
  passingCount: number;
  failingCount: number;
  aaPassCount: number;
  aaaPassCount: number;
  complianceScorePercent: number;
}

export function makeVariantCellId(
  primitive: ComponentPrimitiveId,
  variant: ComponentVariantId,
  size: ComponentSizeId,
  state: ComponentStateId,
): string {
  return `${primitive}:${variant}:${size}:${state}`;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clampByte(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Porter-Duff source-over alpha blending of foreground hex over an opaque surface hex.
 */
export function blendHexOverSurface(fgHex: string, bgHex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const fg = parseHexColor(`#${normalizeHex6(fgHex)}`) ?? { r: 255, g: 255, b: 255 };
  const bg = parseHexColor(`#${normalizeHex6(bgHex)}`) ?? { r: 12, g: 14, b: 20 };
  return rgbToHex(
    fg.r * a + bg.r * (1 - a),
    fg.g * a + bg.g * (1 - a),
    fg.b * a + bg.b * (1 - a),
  );
}

/**
 * Shifts a hex color darker (delta < 0) toward #000000 or lighter (delta > 0) toward #FFFFFF.
 */
export function shiftHexLuminance(hex: string, delta: number): string {
  const target = delta >= 0 ? '#FFFFFF' : '#000000';
  return blendHexOverSurface(target, hex, Math.min(1, Math.abs(delta)));
}

/**
 * Strict WCAG 2.1 evaluation without upward rounding across the 4.5 / 7.0 thresholds.
 */
export function evaluateStrictWcag(fgHex: string, bgHex: string): WcagAuditResult {
  const normFg = `#${normalizeHex6(fgHex)}`;
  const normBg = `#${normalizeHex6(bgHex)}`;
  const exactRatio = computeContrastRatio(normFg, normBg);

  let grade: WcagAuditResult['grade'] = 'FAIL';
  if (exactRatio >= 7.0) {
    grade = 'AAA';
  } else if (exactRatio >= 4.5) {
    grade = 'AA';
  } else if (exactRatio >= 3.0) {
    grade = 'AA-Large';
  }

  return {
    ratio: exactRatio,
    ratioLabel: `${exactRatio.toFixed(2)}:1`,
    grade,
    passesAA: exactRatio >= 4.5,
    passesAAA: exactRatio >= 7.0,
    foregroundHex: normFg,
    backgroundHex: normBg,
  };
}

function binarySearchBlend(
  sourceHex: string,
  targetPoleHex: string,
  fixedHex: string,
  sourceIsForeground: boolean,
  minRatio: number,
): { hex: string; factor: number; ratio: number } | null {
  const endRatio = sourceIsForeground
    ? computeContrastRatio(targetPoleHex, fixedHex)
    : computeContrastRatio(fixedHex, targetPoleHex);
  if (endRatio < minRatio) return null;

  let lo = 0;
  let hi = 1;
  let bestHex = targetPoleHex;
  let bestFactor = 1;
  let bestRatio = endRatio;

  for (let i = 0; i < 16; i += 1) {
    const mid = (lo + hi) / 2;
    const candidate = blendHexOverSurface(targetPoleHex, sourceHex, mid);
    const ratio = sourceIsForeground
      ? computeContrastRatio(candidate, fixedHex)
      : computeContrastRatio(fixedHex, candidate);
    if (ratio >= minRatio) {
      bestHex = candidate;
      bestFactor = mid;
      bestRatio = ratio;
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return { hex: bestHex, factor: bestFactor, ratio: bestRatio };
}

/**
 * Computes a deterministic, hue-preserving WCAG 2.1 accessible color recommendation
 * guaranteed to meet or exceed `targetRatio` (4.5 for AA, 7.0 for AAA).
 */
export function computeAccessibleColorFix(
  fgHex: string,
  bgHex: string,
  targetRatio = 4.5,
  preferBackgroundAdjustment = false,
): AccessibleColorFix {
  const normFg = `#${normalizeHex6(fgHex)}`;
  const normBg = `#${normalizeHex6(bgHex)}`;
  const originalRatio = computeContrastRatio(normFg, normBg);
  const safeTarget = targetRatio + 0.05;

  if (originalRatio >= targetRatio) {
    const cur = evaluateStrictWcag(normFg, normBg);
    return {
      originalForegroundHex: normFg,
      originalBackgroundHex: normBg,
      recommendedForegroundHex: normFg,
      recommendedBackgroundHex: normBg,
      originalRatio,
      fixedRatio: originalRatio,
      fixedGrade: cur.grade,
      strategy: 'already-compliant',
    };
  }

  const fgLum = relativeLuminance(normFg);
  const bgLum = relativeLuminance(normBg);

  // 1. For solid brand/destructive fills (e.g. white text on #6366F1 or #F43F5E), try adjusting bg luminance while keeping crisp ink.
  if (preferBackgroundAdjustment) {
    const ink = fgLum >= 0.45 ? '#FFFFFF' : '#090B10';
    const bgPole = ink === '#FFFFFF' ? '#05070B' : '#FFFFFF';
    const bgSearch = binarySearchBlend(normBg, bgPole, ink, false, safeTarget);
    if (bgSearch && bgSearch.factor <= 0.68) {
      const fixedAudit = evaluateStrictWcag(ink, bgSearch.hex);
      return {
        originalForegroundHex: normFg,
        originalBackgroundHex: normBg,
        recommendedForegroundHex: ink,
        recommendedBackgroundHex: bgSearch.hex,
        originalRatio,
        fixedRatio: fixedAudit.ratio,
        fixedGrade: fixedAudit.grade,
        strategy: bgPole === '#05070B' ? 'darken-background' : 'lighten-background',
      };
    }

    // Check if flipping foreground ink on the untouched brand color already satisfies targetRatio cleanly.
    const altInk = ink === '#FFFFFF' ? '#090B10' : '#FFFFFF';
    const altRatio = computeContrastRatio(altInk, normBg);
    if (altRatio >= targetRatio) {
      const fixedAudit = evaluateStrictWcag(altInk, normBg);
      return {
        originalForegroundHex: normFg,
        originalBackgroundHex: normBg,
        recommendedForegroundHex: altInk,
        recommendedBackgroundHex: normBg,
        originalRatio,
        fixedRatio: fixedAudit.ratio,
        fixedGrade: fixedAudit.grade,
        strategy: 'flip-foreground-ink',
      };
    }
  }

  // 2. Try adjusting foreground along its hue toward white or obsidian while keeping background intact.
  const toLightFg = binarySearchBlend(normFg, '#FFFFFF', normBg, true, safeTarget);
  const toDarkFg = binarySearchBlend(normFg, '#090B10', normBg, true, safeTarget);

  const fgCandidates = [toLightFg, toDarkFg].filter(
    (c): c is NonNullable<typeof c> => c !== null,
  );
  if (fgCandidates.length > 0) {
    fgCandidates.sort((a, b) => a.factor - b.factor);
    const chosen = fgCandidates[0];
    const fixedAudit = evaluateStrictWcag(chosen.hex, normBg);
    return {
      originalForegroundHex: normFg,
      originalBackgroundHex: normBg,
      recommendedForegroundHex: chosen.hex,
      recommendedBackgroundHex: normBg,
      originalRatio,
      fixedRatio: fixedAudit.ratio,
      fixedGrade: fixedAudit.grade,
      strategy: chosen.factor >= 0.92 ? 'flip-foreground-ink' : 'adjust-foreground',
    };
  }

  // 3. Mid-tone background where neither white nor black alone meets AAA -> shift background slightly + crisp ink.
  const useLightInk = bgLum < 0.35;
  const ink = useLightInk ? '#FFFFFF' : '#090B10';
  const pole = useLightInk ? '#05070B' : '#FFFFFF';
  const bgFallback = binarySearchBlend(normBg, pole, ink, false, safeTarget);
  if (bgFallback) {
    const fixedAudit = evaluateStrictWcag(ink, bgFallback.hex);
    return {
      originalForegroundHex: normFg,
      originalBackgroundHex: normBg,
      recommendedForegroundHex: ink,
      recommendedBackgroundHex: bgFallback.hex,
      originalRatio,
      fixedRatio: fixedAudit.ratio,
      fixedGrade: fixedAudit.grade,
      strategy: useLightInk ? 'darken-background' : 'lighten-background',
    };
  }

  // 4. Hard mathematical guarantee fallback
  const finalFg = bgLum < 0.5 ? '#FFFFFF' : '#090B10';
  const finalBg = bgLum < 0.5 ? '#090B10' : '#FFFFFF';
  const finalAudit = evaluateStrictWcag(finalFg, finalBg);
  return {
    originalForegroundHex: normFg,
    originalBackgroundHex: normBg,
    recommendedForegroundHex: finalFg,
    recommendedBackgroundHex: finalBg,
    originalRatio,
    fixedRatio: finalAudit.ratio,
    fixedGrade: finalAudit.grade,
    strategy: 'high-contrast-pair',
  };
}

function resolveBaseVariantColors(
  tokens: DesignTokens,
  primitive: ComponentPrimitiveId,
  variant: ComponentVariantId,
  state: ComponentStateId,
): {
  backgroundHex: string;
  foregroundHex: string;
  borderHex: string;
  focusRingHex: string | null;
  preferBgFix: boolean;
  surfaceContainerHex: string;
} {
  const sys = hydrateDesignTokens(tokens);
  const t = sys.tokens;
  const danger = `#${normalizeHex6(sys.primitives.danger500)}`;
  const primary = `#${normalizeHex6(t.brandPrimary)}`;
  const accent = `#${normalizeHex6(t.brandAccent)}`;
  const canvas = `#${normalizeHex6(t.surfaceCanvas)}`;
  const card = `#${normalizeHex6(t.surfaceCard)}`;
  const elevated = `#${normalizeHex6(t.surfaceElevated)}`;
  const border = `#${normalizeHex6(t.borderSubtle)}`;
  const textPrimary = `#${normalizeHex6(t.textPrimary)}`;
  const textMuted = `#${normalizeHex6(t.textMuted)}`;
  const lightSurface = isLightThemeSurface(canvas);

  let bg = primary;
  let fg = '#FFFFFF';
  let bdr = primary;
  let focusRing: string | null = null;
  let preferBgFix = false;

  if (primitive === 'action-button') {
    switch (variant) {
      case 'primary':
        bg = primary;
        fg = '#FFFFFF';
        bdr = primary;
        preferBgFix = true;
        break;
      case 'secondary':
        bg = elevated;
        fg = textPrimary;
        bdr = border;
        break;
      case 'ghost':
        bg = card;
        fg = accent;
        bdr = card;
        break;
      case 'destructive':
        bg = danger;
        fg = '#FFFFFF';
        bdr = danger;
        preferBgFix = true;
        break;
    }
  } else if (primitive === 'status-badge') {
    switch (variant) {
      case 'primary':
        bg = blendHexOverSurface(primary, card, 0.24);
        fg = primary;
        bdr = blendHexOverSurface(primary, card, 0.48);
        break;
      case 'secondary':
        bg = elevated;
        fg = textMuted;
        bdr = border;
        break;
      case 'ghost':
        bg = card;
        fg = textMuted;
        bdr = border;
        break;
      case 'destructive':
        bg = blendHexOverSurface(danger, card, 0.22);
        fg = danger;
        bdr = blendHexOverSurface(danger, card, 0.5);
        break;
    }
  } else {
    // metric-input
    switch (variant) {
      case 'primary':
        bg = card;
        fg = textPrimary;
        bdr = primary;
        break;
      case 'secondary':
        bg = elevated;
        fg = textPrimary;
        bdr = border;
        break;
      case 'ghost':
        bg = canvas;
        fg = textMuted;
        bdr = blendHexOverSurface(border, canvas, 0.6);
        break;
      case 'destructive':
        bg = blendHexOverSurface(danger, card, 0.1);
        fg = danger;
        bdr = danger;
        break;
    }
  }

  // Apply interaction state transformations
  if (state === 'hover') {
    if (variant === 'primary' || variant === 'destructive') {
      bg = shiftHexLuminance(bg, lightSurface ? -0.1 : 0.14);
      bdr = shiftHexLuminance(bdr, lightSurface ? -0.12 : 0.18);
    } else if (variant === 'ghost') {
      bg = blendHexOverSurface(elevated, card, 0.72);
      bdr = border;
    } else {
      bg = shiftHexLuminance(bg, lightSurface ? -0.05 : 0.08);
      bdr = accent;
    }
  } else if (state === 'focus') {
    focusRing = variant === 'destructive' ? danger : accent;
    bdr = focusRing;
  } else if (state === 'disabled') {
    // Disabled opacity composited deterministically against container surface so exact contrast is auditable
    bg = blendHexOverSurface(bg, canvas, 0.42);
    fg = blendHexOverSurface(fg, bg, 0.44);
    bdr = blendHexOverSurface(bdr, canvas, 0.35);
    preferBgFix = false;
  }

  return {
    backgroundHex: bg,
    foregroundHex: fg,
    borderHex: bdr,
    focusRingHex: focusRing,
    preferBgFix,
    surfaceContainerHex: card,
  };
}

export function buildComponentVariantMatrix(
  tokens: DesignTokens,
  primitive: ComponentPrimitiveId,
  options?: {
    strictness?: WcagStrictness;
    overrides?: VariantCellOverrideMap;
  },
): ComponentVariantMatrixResult {
  const strictness: WcagStrictness = options?.strictness ?? 'AA';
  const targetRatio = strictness === 'AAA' ? 7.0 : 4.5;
  const overrides = options?.overrides ?? {};
  const sys = hydrateDesignTokens(tokens);
  const primitiveMeta =
    COMPONENT_PRIMITIVES.find((p) => p.id === primitive) ?? COMPONENT_PRIMITIVES[0];

  const cells: VariantMatrixCell[] = [];

  for (const variant of COMPONENT_VARIANTS) {
    for (const size of COMPONENT_SIZES) {
      for (const state of COMPONENT_STATES) {
        const id = makeVariantCellId(primitive, variant.id, size.id, state.id);
        const base = resolveBaseVariantColors(tokens, primitive, variant.id, state.id);
        const cellOverride = overrides[id];

        const backgroundHex = cellOverride?.backgroundHex
          ? `#${normalizeHex6(cellOverride.backgroundHex)}`
          : base.backgroundHex;
        const foregroundHex = cellOverride?.foregroundHex
          ? `#${normalizeHex6(cellOverride.foregroundHex)}`
          : base.foregroundHex;
        const borderHex = cellOverride?.borderHex
          ? `#${normalizeHex6(cellOverride.borderHex)}`
          : base.borderHex;

        const wcag = evaluateStrictWcag(foregroundHex, backgroundHex);
        const passesTarget = wcag.ratio >= targetRatio;
        const autoFix = passesTarget
          ? null
          : computeAccessibleColorFix(
              foregroundHex,
              backgroundHex,
              targetRatio,
              base.preferBgFix,
            );

        const baseRadius = Math.max(0, Math.round(sys.tokens.radiusBase * size.radiusScale));
        const radiusPx = primitive === 'status-badge' ? 999 : baseRadius;

        const shadow =
          state.id === 'hover' && variant.id === 'primary'
            ? sys.shadows.neon
            : state.id === 'focus' && base.focusRingHex
              ? `0 0 0 2px ${sys.tokens.surfaceCanvas}, 0 0 0 4px ${base.focusRingHex}`
              : variant.id === 'secondary' && state.id !== 'disabled'
                ? sys.shadows.subtle
                : 'none';

        cells.push({
          id,
          primitive,
          variant: variant.id,
          size: size.id,
          state: state.id,
          label: primitiveMeta.sampleLabel,
          style: {
            backgroundHex,
            foregroundHex,
            borderHex,
            focusRingHex: base.focusRingHex,
            focusRingOffsetHex: `#${normalizeHex6(sys.tokens.surfaceCanvas)}`,
            radiusPx,
            heightPx:
              primitive === 'status-badge'
                ? Math.max(22, size.heightPx - 8)
                : size.heightPx,
            paddingX:
              primitive === 'status-badge'
                ? Math.max(8, size.paddingX - 2)
                : size.paddingX,
            fontSizePx:
              primitive === 'status-badge'
                ? Math.max(10, size.fontSizePx - 1)
                : size.fontSizePx,
            fontWeight: primitive === 'metric-input' ? 500 : 600,
            shadow,
            surfaceContainerHex: base.surfaceContainerHex,
          },
          wcag,
          exactRatio: wcag.ratio,
          targetRatio,
          passesTarget,
          autoFix,
          isOverridden: Boolean(cellOverride),
        });
      }
    }
  }

  const passingCount = cells.filter((c) => c.passesTarget).length;
  const aaPassCount = cells.filter((c) => c.wcag.passesAA).length;
  const aaaPassCount = cells.filter((c) => c.wcag.passesAAA).length;
  const totalCells = cells.length;

  return {
    primitive,
    strictness,
    targetRatio,
    cells,
    totalCells,
    passingCount,
    failingCount: totalCells - passingCount,
    aaPassCount,
    aaaPassCount,
    complianceScorePercent:
      totalCells > 0 ? Math.round((passingCount / totalCells) * 1000) / 10 : 100,
  };
}

export function buildAllPrimitivesVariantAudit(
  tokens: DesignTokens,
  options?: {
    strictness?: WcagStrictness;
    overrides?: VariantCellOverrideMap;
  },
): FullDesignSystemVariantAudit {
  const strictness: WcagStrictness = options?.strictness ?? 'AA';
  const targetRatio = strictness === 'AAA' ? 7.0 : 4.5;

  const actionButton = buildComponentVariantMatrix(tokens, 'action-button', options);
  const statusBadge = buildComponentVariantMatrix(tokens, 'status-badge', options);
  const metricInput = buildComponentVariantMatrix(tokens, 'metric-input', options);

  const all = [actionButton, statusBadge, metricInput];
  const totalCells = all.reduce((sum, m) => sum + m.totalCells, 0);
  const passingCount = all.reduce((sum, m) => sum + m.passingCount, 0);
  const aaPassCount = all.reduce((sum, m) => sum + m.aaPassCount, 0);
  const aaaPassCount = all.reduce((sum, m) => sum + m.aaaPassCount, 0);

  return {
    strictness,
    targetRatio,
    byPrimitive: {
      'action-button': actionButton,
      'status-badge': statusBadge,
      'metric-input': metricInput,
    },
    totalCells,
    passingCount,
    failingCount: totalCells - passingCount,
    aaPassCount,
    aaaPassCount,
    complianceScorePercent:
      totalCells > 0 ? Math.round((passingCount / totalCells) * 1000) / 10 : 100,
  };
}

/**
 * Computes an override map that lifts a single failing cell (and optionally sibling sizes of the same
 * primitive+variant+state) to guaranteed WCAG AA/AAA compliance.
 */
export function buildAutoFixOverridesForCell(
  matrix: ComponentVariantMatrixResult,
  cellId: string,
  existingOverrides: VariantCellOverrideMap = {},
  applyAcrossAllSizes = true,
): VariantCellOverrideMap {
  const targetCell = matrix.cells.find((c) => c.id === cellId);
  if (!targetCell || !targetCell.autoFix) return existingOverrides;

  const fix = targetCell.autoFix;
  const next: VariantCellOverrideMap = { ...existingOverrides };
  const patch: VariantCellColorOverride = {
    foregroundHex: fix.recommendedForegroundHex,
    backgroundHex: fix.recommendedBackgroundHex,
    borderHex:
      targetCell.variant === 'primary' || targetCell.variant === 'destructive'
        ? fix.recommendedBackgroundHex
        : targetCell.style.borderHex,
  };

  if (applyAcrossAllSizes) {
    for (const size of COMPONENT_SIZES) {
      const siblingId = makeVariantCellId(
        targetCell.primitive,
        targetCell.variant,
        size.id,
        targetCell.state,
      );
      next[siblingId] = patch;
    }
  } else {
    next[targetCell.id] = patch;
  }

  return next;
}

/**
 * 1-Click Auto-Fix All: computes accessible token fixes AND per-cell overrides so EVERY failing
 * cell across the entire 3-primitive × 48-cell matrix reaches 100% compliance while updating
 * the core DesignTokens (`brandPrimary`, `brandAccent`, `textMuted`, `primitives.danger500`) cleanly.
 */
export function autoFixDesignSystemMatrix(
  tokens: DesignTokens,
  strictness: WcagStrictness = 'AA',
  existingOverrides: VariantCellOverrideMap = {},
): {
  nextTokens: DesignTokens;
  nextOverrides: VariantCellOverrideMap;
  fixedCellCount: number;
} {
  const targetRatio = strictness === 'AAA' ? 7.0 : 4.5;
  const sys = hydrateDesignTokens(tokens);
  const t = sys.tokens;

  // Step 1: Remediate core semantic tokens where appropriate
  const primaryFix = computeAccessibleColorFix('#FFFFFF', t.brandPrimary, targetRatio, true);
  const dangerFix = computeAccessibleColorFix(
    '#FFFFFF',
    sys.primitives.danger500,
    targetRatio,
    true,
  );
  const mutedFix = computeAccessibleColorFix(t.textMuted, t.surfaceCard, targetRatio, false);
  const accentFix = computeAccessibleColorFix(t.brandAccent, t.surfaceCard, targetRatio, false);

  const nextTokens: DesignTokens = {
    ...t,
    brandPrimary: primaryFix.recommendedBackgroundHex,
    brandAccent: accentFix.recommendedForegroundHex,
    textMuted: mutedFix.recommendedForegroundHex,
    primitives: {
      ...sys.primitives,
      brand500: primaryFix.recommendedBackgroundHex,
      accent500: accentFix.recommendedForegroundHex,
      danger500: dangerFix.recommendedBackgroundHex,
    },
  };

  // Step 2: Audit all 3 primitives with the improved tokens and fix any remaining cells (e.g. disabled/hover tints)
  const audit = buildAllPrimitivesVariantAudit(nextTokens, {
    strictness,
    overrides: existingOverrides,
  });

  const nextOverrides: VariantCellOverrideMap = { ...existingOverrides };
  let fixedCellCount = 0;

  for (const matrix of Object.values(audit.byPrimitive)) {
    for (const cell of matrix.cells) {
      if (!cell.passesTarget && cell.autoFix) {
        nextOverrides[cell.id] = {
          foregroundHex: cell.autoFix.recommendedForegroundHex,
          backgroundHex: cell.autoFix.recommendedBackgroundHex,
          borderHex:
            cell.variant === 'primary' || cell.variant === 'destructive'
              ? cell.autoFix.recommendedBackgroundHex
              : cell.style.borderHex,
        };
        fixedCellCount += 1;
      }
    }
  }

  return { nextTokens, nextOverrides, fixedCellCount };
}

/**
 * Generates a realistic low-contrast stress-test token preset so designers can audit & auto-fix failures live.
 */
export function createLowContrastStressTestTokens(baseTokens: DesignTokens): DesignTokens {
  const sys = hydrateDesignTokens(baseTokens);
  return {
    ...sys.tokens,
    name: `${sys.tokens.name} (Low-Contrast Audit)`,
    brandPrimary: '#818CF8', // Indigo-400 (~2.8:1 with white ink)
    brandAccent: '#38BDF8',
    textMuted: '#475569',
    primitives: {
      ...sys.primitives,
      brand500: '#818CF8',
      danger500: '#FB7185', // Rose-400 (~2.6:1 with white ink)
    },
  };
}

function getResolvedVariantTokenSnapshot(
  matrix: ComponentVariantMatrixResult,
  variant: ComponentVariantId,
): {
  defaultCell: VariantMatrixCell;
  hoverCell: VariantMatrixCell;
  focusCell: VariantMatrixCell;
  disabledCell: VariantMatrixCell;
} {
  const find = (state: ComponentStateId) =>
    matrix.cells.find(
      (c) => c.variant === variant && c.size === 'md' && c.state === state,
    ) ?? matrix.cells[0];
  return {
    defaultCell: find('default'),
    hoverCell: find('hover'),
    focusCell: find('focus'),
    disabledCell: find('disabled'),
  };
}

/**
 * Generates production copy-paste React 19 + Tailwind CSS v4 + CVA (`class-variance-authority`) code
 * synced with the live Design Tokens and any WCAG Auto-Fix overrides.
 */
export function generateReactCvaSpecCode(
  tokens: DesignTokens,
  primitive: ComponentPrimitiveId,
  matrix: ComponentVariantMatrixResult,
): string {
  const sys = hydrateDesignTokens(tokens);
  const t = sys.tokens;
  const p = getResolvedVariantTokenSnapshot(matrix, 'primary');
  const s = getResolvedVariantTokenSnapshot(matrix, 'secondary');
  const g = getResolvedVariantTokenSnapshot(matrix, 'ghost');
  const d = getResolvedVariantTokenSnapshot(matrix, 'destructive');

  const smRad = Math.max(0, Math.round(t.radiusBase * 0.5));
  const mdRad = Math.max(0, Math.round(t.radiusBase * 0.75));
  const lgRad = Math.max(0, t.radiusBase);

  const componentMap: Record<
    ComponentPrimitiveId,
    { name: string; cvaName: string; element: string; filename: string }
  > = {
    'action-button': {
      name: 'AtelierActionButton',
      cvaName: 'actionButtonVariants',
      element: 'button',
      filename: 'AtelierActionButton.tsx',
    },
    'status-badge': {
      name: 'AtelierStatusBadge',
      cvaName: 'statusBadgeVariants',
      element: 'span',
      filename: 'AtelierStatusBadge.tsx',
    },
    'metric-input': {
      name: 'AtelierMetricInput',
      cvaName: 'metricInputVariants',
      element: 'input',
      filename: 'AtelierMetricInput.tsx',
    },
  };

  const meta = componentMap[primitive];
  const radiusExpr = (px: number) =>
    primitive === 'status-badge' ? 'rounded-full' : `rounded-[${px}px]`;

  const elementBlock =
    primitive === 'metric-input'
      ? `export interface ${meta.name}Props
  extends Omit<ComponentProps<'input'>, 'size'>,
    VariantProps<typeof ${meta.cvaName}> {}

export function ${meta.name}({
  variant,
  size,
  className,
  ...props
}: ${meta.name}Props) {
  return (
    <input
      data-slot="metric-input"
      className={${meta.cvaName}({ variant, size, className })}
      {...props}
    />
  );
}`
      : primitive === 'status-badge'
        ? `export interface ${meta.name}Props
  extends ComponentProps<'span'>,
    VariantProps<typeof ${meta.cvaName}> {}

export function ${meta.name}({
  variant,
  size,
  className,
  children,
  ...props
}: ${meta.name}Props) {
  return (
    <span
      data-slot="status-badge"
      className={${meta.cvaName}({ variant, size, className })}
      {...props}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}`
        : `export interface ${meta.name}Props
  extends ComponentProps<'button'>,
    VariantProps<typeof ${meta.cvaName}> {}

export function ${meta.name}({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ${meta.name}Props) {
  return (
    <button
      type={type}
      data-slot="action-button"
      className={${meta.cvaName}({ variant, size, className })}
      {...props}
    />
  );
}`;

  return `// Atelier Canvas v6.0 — ${meta.filename}
// React 19 + Tailwind CSS v4 + CVA (class-variance-authority)
// Active Theme: ${t.name} · WCAG ${matrix.strictness} Score: ${matrix.complianceScorePercent}%

import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

export const ${meta.cvaName} = cva(
  [
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
    'outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[${p.focusCell.style.focusRingOffsetHex}]',
    'disabled:pointer-events-none disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-[${p.defaultCell.style.backgroundHex}] text-[${p.defaultCell.style.foregroundHex}] border border-[${p.defaultCell.style.borderHex}]',
          'hover:bg-[${p.hoverCell.style.backgroundHex}] hover:text-[${p.hoverCell.style.foregroundHex}]',
          'focus-visible:ring-[${p.focusCell.style.focusRingHex ?? t.brandAccent}]',
          'disabled:bg-[${p.disabledCell.style.backgroundHex}] disabled:text-[${p.disabledCell.style.foregroundHex}]',
        ].join(' '),
        secondary: [
          'bg-[${s.defaultCell.style.backgroundHex}] text-[${s.defaultCell.style.foregroundHex}] border border-[${s.defaultCell.style.borderHex}]',
          'hover:bg-[${s.hoverCell.style.backgroundHex}] hover:border-[${s.hoverCell.style.borderHex}]',
          'focus-visible:ring-[${s.focusCell.style.focusRingHex ?? t.brandAccent}]',
          'disabled:bg-[${s.disabledCell.style.backgroundHex}] disabled:text-[${s.disabledCell.style.foregroundHex}]',
        ].join(' '),
        ghost: [
          'bg-[${g.defaultCell.style.backgroundHex}] text-[${g.defaultCell.style.foregroundHex}] border border-[${g.defaultCell.style.borderHex}]',
          'hover:bg-[${g.hoverCell.style.backgroundHex}] hover:text-[${g.hoverCell.style.foregroundHex}]',
          'focus-visible:ring-[${g.focusCell.style.focusRingHex ?? t.brandAccent}]',
          'disabled:bg-[${g.disabledCell.style.backgroundHex}] disabled:text-[${g.disabledCell.style.foregroundHex}]',
        ].join(' '),
        destructive: [
          'bg-[${d.defaultCell.style.backgroundHex}] text-[${d.defaultCell.style.foregroundHex}] border border-[${d.defaultCell.style.borderHex}]',
          'hover:bg-[${d.hoverCell.style.backgroundHex}] hover:text-[${d.hoverCell.style.foregroundHex}]',
          'focus-visible:ring-[${d.focusCell.style.focusRingHex ?? sys.primitives.danger500}]',
          'disabled:bg-[${d.disabledCell.style.backgroundHex}] disabled:text-[${d.disabledCell.style.foregroundHex}]',
        ].join(' '),
      },
      size: {
        sm: 'h-7 px-2.5 text-[11px] ${radiusExpr(smRad)}',
        md: 'h-9 px-3.5 text-[12.5px] ${radiusExpr(mdRad)}',
        lg: 'h-11 px-4.5 text-[14px] ${radiusExpr(lgRad)}',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

${elementBlock}`;
}

/**
 * Generates production copy-paste iOS/macOS SwiftUI `ButtonStyle` code
 * synced with the live Design Tokens and any WCAG Auto-Fix overrides.
 */
export function generateSwiftUiButtonStyleCode(
  tokens: DesignTokens,
  matrix: ComponentVariantMatrixResult,
): string {
  const sys = hydrateDesignTokens(tokens);
  const t = sys.tokens;
  const p = getResolvedVariantTokenSnapshot(matrix, 'primary');
  const s = getResolvedVariantTokenSnapshot(matrix, 'secondary');
  const g = getResolvedVariantTokenSnapshot(matrix, 'ghost');
  const d = getResolvedVariantTokenSnapshot(matrix, 'destructive');

  const smRad = Math.max(0, Math.round(t.radiusBase * 0.5));
  const mdRad = Math.max(0, Math.round(t.radiusBase * 0.75));
  const lgRad = Math.max(0, t.radiusBase);

  const hexLit = (hex: string) => `0x${normalizeHex6(hex)}`;

  return `// Atelier Canvas v6.0 — AtelierButtonStyle.swift
// iOS 17+ / macOS 14+ SwiftUI ButtonStyle synced with W3C Design Tokens
// Active Theme: ${t.name} · WCAG ${matrix.strictness} Score: ${matrix.complianceScorePercent}%

import SwiftUI

public struct AtelierButtonStyle: ButtonStyle {
    public enum Variant: String, CaseIterable, Sendable {
        case primary, secondary, ghost, destructive
    }

    public enum Size: String, CaseIterable, Sendable {
        case sm, md, lg

        var height: CGFloat {
            switch self {
            case .sm: return 28
            case .md: return 36
            case .lg: return 44
            }
        }

        var horizontalPadding: CGFloat {
            switch self {
            case .sm: return 10
            case .md: return 14
            case .lg: return 18
            }
        }

        var fontSize: CGFloat {
            switch self {
            case .sm: return 11
            case .md: return 12.5
            case .lg: return 14
            }
        }

        var cornerRadius: CGFloat {
            switch self {
            case .sm: return ${smRad}.0
            case .md: return ${mdRad}.0
            case .lg: return ${lgRad}.0
            }
        }
    }

    @Environment(\\.isEnabled) private var isEnabled
    public let variant: Variant
    public let size: Size

    public init(variant: Variant = .primary, size: Size = .md) {
        self.variant = variant
        self.size = size
    }

    public func makeBody(configuration: Configuration) -> some View {
        let palette = resolvePalette(isPressed: configuration.isPressed)
        return configuration.label
            .font(.system(size: size.fontSize, weight: .semibold))
            .foregroundStyle(palette.foreground)
            .padding(.horizontal, size.horizontalPadding)
            .frame(minHeight: size.height)
            .background(
                RoundedRectangle(cornerRadius: size.cornerRadius, style: .continuous)
                    .fill(palette.background)
            )
            .overlay(
                RoundedRectangle(cornerRadius: size.cornerRadius, style: .continuous)
                    .strokeBorder(palette.border, lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.spring(response: 0.22, dampingFraction: 0.8), value: configuration.isPressed)
    }

    private func resolvePalette(isPressed: Bool) -> (background: Color, foreground: Color, border: Color) {
        switch variant {
        case .primary:
            if !isEnabled {
                return (Color(atelierHex: ${hexLit(p.disabledCell.style.backgroundHex)}), Color(atelierHex: ${hexLit(p.disabledCell.style.foregroundHex)}), Color(atelierHex: ${hexLit(p.disabledCell.style.borderHex)}))
            }
            let bg = isPressed ? Color(atelierHex: ${hexLit(p.hoverCell.style.backgroundHex)}) : Color(atelierHex: ${hexLit(p.defaultCell.style.backgroundHex)})
            return (bg, Color(atelierHex: ${hexLit(p.defaultCell.style.foregroundHex)}), Color(atelierHex: ${hexLit(p.defaultCell.style.borderHex)}))
        case .secondary:
            if !isEnabled {
                return (Color(atelierHex: ${hexLit(s.disabledCell.style.backgroundHex)}), Color(atelierHex: ${hexLit(s.disabledCell.style.foregroundHex)}), Color(atelierHex: ${hexLit(s.disabledCell.style.borderHex)}))
            }
            let bg = isPressed ? Color(atelierHex: ${hexLit(s.hoverCell.style.backgroundHex)}) : Color(atelierHex: ${hexLit(s.defaultCell.style.backgroundHex)})
            return (bg, Color(atelierHex: ${hexLit(s.defaultCell.style.foregroundHex)}), Color(atelierHex: ${hexLit(s.defaultCell.style.borderHex)}))
        case .ghost:
            if !isEnabled {
                return (Color(atelierHex: ${hexLit(g.disabledCell.style.backgroundHex)}), Color(atelierHex: ${hexLit(g.disabledCell.style.foregroundHex)}), Color(atelierHex: ${hexLit(g.disabledCell.style.borderHex)}))
            }
            let bg = isPressed ? Color(atelierHex: ${hexLit(g.hoverCell.style.backgroundHex)}) : Color(atelierHex: ${hexLit(g.defaultCell.style.backgroundHex)})
            return (bg, Color(atelierHex: ${hexLit(g.defaultCell.style.foregroundHex)}), Color(atelierHex: ${hexLit(g.defaultCell.style.borderHex)}))
        case .destructive:
            if !isEnabled {
                return (Color(atelierHex: ${hexLit(d.disabledCell.style.backgroundHex)}), Color(atelierHex: ${hexLit(d.disabledCell.style.foregroundHex)}), Color(atelierHex: ${hexLit(d.disabledCell.style.borderHex)}))
            }
            let bg = isPressed ? Color(atelierHex: ${hexLit(d.hoverCell.style.backgroundHex)}) : Color(atelierHex: ${hexLit(d.defaultCell.style.backgroundHex)})
            return (bg, Color(atelierHex: ${hexLit(d.defaultCell.style.foregroundHex)}), Color(atelierHex: ${hexLit(d.defaultCell.style.borderHex)}))
        }
    }
}

public extension View {
    func atelierButtonStyle(
        _ variant: AtelierButtonStyle.Variant = .primary,
        size: AtelierButtonStyle.Size = .md
    ) -> some View {
        buttonStyle(AtelierButtonStyle(variant: variant, size: size))
    }
}`;
}
