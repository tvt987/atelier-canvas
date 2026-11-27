import type {
  Artboard,
  CanvasNode,
  ColorTokenKey,
  DesignTokens,
  FillConfig,
  ShadowPreset,
} from '../types/canvas';
import {
  exportCssCustomProperties,
  exportW3CDesignTokensJson,
  FLAGSHIP_V4_THEMES,
} from './designTokens';

export { FLAGSHIP_V4_THEMES, exportCssCustomProperties, exportW3CDesignTokensJson };

export const LEGACY_V3_THEMES: DesignTokens[] = [
  {
    id: 'obsidian-electric',
    name: 'Obsidian Electric',
    tagline: 'Linear dark chrome with electric indigo & cyan signal',
    brandPrimary: '#6366F1',
    brandAccent: '#06B6D4',
    surfaceCanvas: '#0C0E14',
    surfaceCard: '#151924',
    surfaceElevated: '#1D2232',
    borderSubtle: '#2A3147',
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
    radiusBase: 16,
  },
  {
    id: 'swiss-vermilion',
    name: 'Swiss Editorial Vermilion',
    tagline: 'High-contrast international typographic vermilion & ivory',
    brandPrimary: '#E11D48',
    brandAccent: '#F59E0B',
    surfaceCanvas: '#111113',
    surfaceCard: '#1B1A1F',
    surfaceElevated: '#26232B',
    borderSubtle: '#3B343E',
    textPrimary: '#FAF7F2',
    textMuted: '#B8ADA4',
    radiusBase: 6,
  },
  {
    id: 'apple-frosted',
    name: 'Apple Frosted Light',
    tagline: 'Precision architectural light glass with Cupertino blue',
    brandPrimary: '#0071E3',
    brandAccent: '#0EA5E9',
    surfaceCanvas: '#F2F4F8',
    surfaceCard: '#FFFFFF',
    surfaceElevated: '#E7ECF4',
    borderSubtle: '#D0D8E6',
    textPrimary: '#0F172A',
    textMuted: '#475569',
    radiusBase: 20,
  },
  {
    id: 'tokyo-bauhaus',
    name: 'Tokyo Bauhaus',
    tagline: 'Geometric cobalt, acid lime telemetry & architectural edges',
    brandPrimary: '#2563EB',
    brandAccent: '#84CC16',
    surfaceCanvas: '#090D16',
    surfaceCard: '#111827',
    surfaceElevated: '#1B253A',
    borderSubtle: '#2C3B58',
    textPrimary: '#F1F5F9',
    textMuted: '#93A3BC',
    radiusBase: 4,
  },
];

export const BRAND_TOKEN_THEMES: DesignTokens[] = [
  ...FLAGSHIP_V4_THEMES,
  ...LEGACY_V3_THEMES.filter((t) => t.id !== 'obsidian-electric'),
];

export const ALL_TOKEN_THEMES: DesignTokens[] = [
  ...FLAGSHIP_V4_THEMES,
  ...LEGACY_V3_THEMES,
];

export const COLOR_TOKEN_META: Array<{
  key: ColorTokenKey;
  cssVar: string;
  label: string;
}> = [
  { key: 'brandPrimary', cssVar: '--brand-primary', label: 'Brand Primary' },
  { key: 'brandAccent', cssVar: '--brand-accent', label: 'Brand Accent' },
  { key: 'surfaceCanvas', cssVar: '--surface-canvas', label: 'Surface Canvas' },
  { key: 'surfaceCard', cssVar: '--surface-card', label: 'Surface Card' },
  { key: 'surfaceElevated', cssVar: '--surface-elevated', label: 'Surface Elevated' },
  { key: 'borderSubtle', cssVar: '--border-subtle', label: 'Border Subtle' },
  { key: 'textPrimary', cssVar: '--text-primary', label: 'Text Primary' },
  { key: 'textMuted', cssVar: '--text-muted', label: 'Text Muted' },
];

export function getTokenThemeById(id: string): DesignTokens {
  return (
    ALL_TOKEN_THEMES.find((t) => t.id === id) ?? FLAGSHIP_V4_THEMES[0]
  );
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export interface ResolvedNodeStyle {
  fill: FillConfig;
  cssBackground: string;
  strokeColor: string;
  textColor: string;
  radius: number;
  boxShadow: string;
}

export function getShadowCss(shadow: ShadowPreset, accentHex: string): string {
  switch (shadow) {
    case 'subtle':
      return '0 4px 16px rgba(0, 0, 0, 0.22)';
    case 'elevated':
      return '0 14px 36px rgba(0, 0, 0, 0.34)';
    case 'floating':
      return '0 24px 60px rgba(0, 0, 0, 0.45)';
    case 'neon':
      return `0 12px 32px ${hexToRgba(accentHex, 0.38)}`;
    default:
      return 'none';
  }
}

export function fillToCss(fill: FillConfig, isGlass = false): string {
  if (fill.kind === 'none') {
    return 'transparent';
  }
  if (fill.kind === 'gradient' && fill.gradient) {
    const from = isGlass ? hexToRgba(fill.gradient.from, 0.72) : fill.gradient.from;
    const to = isGlass ? hexToRgba(fill.gradient.to, 0.56) : fill.gradient.to;
    return `linear-gradient(${fill.gradient.angle}deg, ${from}, ${to})`;
  }
  return isGlass ? hexToRgba(fill.color, 0.72) : fill.color;
}

export function resolveNodeStyle(
  node: CanvasNode,
  tokens: DesignTokens,
): ResolvedNodeStyle {
  const binding = node.tokenBinding;
  const resolvedFill: FillConfig = {
    kind: node.fill.kind,
    color: binding?.fill ? tokens[binding.fill] : node.fill.color,
    gradient: node.fill.gradient
      ? {
          angle: node.fill.gradient.angle,
          from: binding?.fillGradientFrom
            ? tokens[binding.fillGradientFrom]
            : node.fill.gradient.from,
          to: binding?.fillGradientTo
            ? tokens[binding.fillGradientTo]
            : node.fill.gradient.to,
        }
      : undefined,
  };

  const strokeColor = binding?.stroke ? tokens[binding.stroke] : node.strokeColor;
  const textColor = binding?.textColor
    ? tokens[binding.textColor]
    : (node.textColor ?? tokens.textPrimary);

  const radius =
    node.type === 'ellipse'
      ? Math.round(Math.max(node.width, node.height) / 2)
      : binding?.radius === 'radiusBase'
        ? tokens.radiusBase
        : node.radius;

  const isGlass = node.type === 'glass' || node.blur > 0;
  const cssBackground = fillToCss(resolvedFill, isGlass);
  const boxShadow = getShadowCss(node.shadow, tokens.brandPrimary);

  return {
    fill: resolvedFill,
    cssBackground,
    strokeColor,
    textColor,
    radius,
    boxShadow,
  };
}

export function resolveArtboardBackground(
  artboard: Artboard,
  tokens: DesignTokens,
): { fill: FillConfig; cssBackground: string } {
  const b = artboard.tokenBinding;
  const fill: FillConfig = {
    kind: artboard.background.kind,
    color: b?.fill ? tokens[b.fill] : artboard.background.color,
    gradient: artboard.background.gradient
      ? {
          angle: artboard.background.gradient.angle,
          from: b?.fillGradientFrom
            ? tokens[b.fillGradientFrom]
            : artboard.background.gradient.from,
          to: b?.fillGradientTo
            ? tokens[b.fillGradientTo]
            : artboard.background.gradient.to,
        }
      : undefined,
  };
  return {
    fill,
    cssBackground: fillToCss(fill, false),
  };
}

export function tokensToW3CJson(tokens: DesignTokens): string {
  return exportW3CDesignTokensJson(tokens);
}
