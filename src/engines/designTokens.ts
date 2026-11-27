import type {
  ColorPrimitivePalette,
  DesignTokens,
  DocumentState,
  RadiusScaleTokens,
  ShadowElevationTokens,
  SpacingGridTokens,
  TypographyScaleKey,
  TypographyScaleToken,
} from '../types/canvas';

function hexToRgbaSafe(hex: string, alpha: number): string {
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

export function buildSpacingGrid(unit = 8): SpacingGridTokens {
  const safeUnit = Math.max(2, Math.min(16, Math.round(unit)));
  return {
    unit: safeUnit,
    xs: Math.max(2, Math.round(safeUnit * 0.5)),
    sm: safeUnit,
    md: safeUnit * 2,
    lg: safeUnit * 3,
    xl: safeUnit * 4,
    '2xl': safeUnit * 6,
    '3xl': safeUnit * 8,
  };
}

export function buildRadiusScale(radiusBase: number): RadiusScaleTokens {
  const base = Math.max(0, Math.round(radiusBase));
  return {
    none: 0,
    sm: Math.max(2, Math.round(base * 0.5)),
    md: base,
    lg: Math.round(base * 1.5),
    xl: Math.round(base * 2),
    full: 9999,
  };
}

export function buildShadowElevations(brandPrimary: string): ShadowElevationTokens {
  return {
    none: 'none',
    subtle: '0 4px 16px rgba(0, 0, 0, 0.22)',
    elevated: '0 14px 36px rgba(0, 0, 0, 0.34)',
    floating: '0 24px 60px rgba(0, 0, 0, 0.45)',
    neon: `0 12px 32px ${hexToRgbaSafe(brandPrimary, 0.38)}`,
  };
}

export function buildTypographyScale(
  fontDisplay = 'Space Grotesk',
  fontBody = 'Inter',
  fontMono = 'JetBrains Mono',
): Record<TypographyScaleKey, TypographyScaleToken> {
  return {
    display: {
      fontFamily: fontDisplay,
      fontSize: 48,
      fontWeight: 700,
      lineHeight: 1.08,
      letterSpacing: -1.4,
    },
    h1: {
      fontFamily: fontDisplay,
      fontSize: 32,
      fontWeight: 700,
      lineHeight: 1.15,
      letterSpacing: -0.8,
    },
    h2: {
      fontFamily: fontDisplay,
      fontSize: 24,
      fontWeight: 600,
      lineHeight: 1.22,
      letterSpacing: -0.4,
    },
    h3: {
      fontFamily: fontDisplay,
      fontSize: 18,
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: -0.2,
    },
    body: {
      fontFamily: fontBody,
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    caption: {
      fontFamily: fontBody,
      fontSize: 11,
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: 0.3,
    },
    mono: {
      fontFamily: fontMono,
      fontSize: 11,
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: 0.8,
    },
  };
}

export function buildColorPrimitives(tokens: DesignTokens): ColorPrimitivePalette {
  return {
    brand500: tokens.brandPrimary,
    brand600: tokens.brandPrimary,
    accent400: tokens.brandAccent,
    accent500: tokens.brandAccent,
    neutral50: '#F8FAFC',
    neutral200: '#E2E8F0',
    neutral500: '#64748B',
    neutral800: '#1E293B',
    neutral900: '#0F172A',
    neutral950: '#090B10',
    success500: '#10B981',
    warning500: '#F59E0B',
    danger500: '#F43F5E',
  };
}

export const FLAGSHIP_V4_THEMES: DesignTokens[] = [
  {
    id: 'obsidian-pro',
    name: 'Obsidian Pro',
    tagline: 'Linear dark chrome · Electric indigo & precision cyan signal',
    brandPrimary: '#6366F1',
    brandAccent: '#06B6D4',
    surfaceCanvas: '#0C0E14',
    surfaceCard: '#151924',
    surfaceElevated: '#1D2232',
    borderSubtle: '#2A3147',
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
    radiusBase: 16,
    spacingUnit: 8,
    fontDisplay: 'Space Grotesk',
    fontBody: 'Inter',
    fontMono: 'JetBrains Mono',
    primitives: {
      brand500: '#6366F1',
      brand600: '#4F46E5',
      accent400: '#22D3EE',
      accent500: '#06B6D4',
      neutral50: '#F8FAFC',
      neutral200: '#E2E8F0',
      neutral500: '#64748B',
      neutral800: '#1E293B',
      neutral900: '#151924',
      neutral950: '#0C0E14',
      success500: '#10B981',
      warning500: '#F59E0B',
      danger500: '#F43F5E',
    },
    typographyScale: buildTypographyScale('Space Grotesk', 'Inter', 'JetBrains Mono'),
    spacingGrid: buildSpacingGrid(8),
    radii: buildRadiusScale(16),
    shadows: buildShadowElevations('#6366F1'),
  },
  {
    id: 'swiss-editorial-light',
    name: 'Swiss Editorial Light',
    tagline: 'Architectural ivory paper · Vermilion accent & crisp 6px grid',
    brandPrimary: '#E11D48',
    brandAccent: '#0F172A',
    surfaceCanvas: '#F6F5F0',
    surfaceCard: '#FFFFFF',
    surfaceElevated: '#ECEAE3',
    borderSubtle: '#D6D3C9',
    textPrimary: '#111318',
    textMuted: '#57534E',
    radiusBase: 6,
    spacingUnit: 8,
    fontDisplay: 'Cormorant Garamond',
    fontBody: 'Inter',
    fontMono: 'JetBrains Mono',
    primitives: {
      brand500: '#F43F5E',
      brand600: '#E11D48',
      accent400: '#334155',
      accent500: '#0F172A',
      neutral50: '#FFFFFF',
      neutral200: '#ECEAE3',
      neutral500: '#57534E',
      neutral800: '#292524',
      neutral900: '#1C1917',
      neutral950: '#111318',
      success500: '#059669',
      warning500: '#D97706',
      danger500: '#E11D48',
    },
    typographyScale: buildTypographyScale('Cormorant Garamond', 'Inter', 'JetBrains Mono'),
    spacingGrid: buildSpacingGrid(8),
    radii: buildRadiusScale(6),
    shadows: buildShadowElevations('#E11D48'),
  },
  {
    id: 'cyber-emerald',
    name: 'Cyber Emerald',
    tagline: 'Stealth deep jade matrix · Emerald 500 & luminous teal HUD',
    brandPrimary: '#10B981',
    brandAccent: '#2DD4BF',
    surfaceCanvas: '#06110F',
    surfaceCard: '#0B1C19',
    surfaceElevated: '#122925',
    borderSubtle: '#1E3F39',
    textPrimary: '#ECFDF5',
    textMuted: '#86B8AE',
    radiusBase: 12,
    spacingUnit: 8,
    fontDisplay: 'Space Grotesk',
    fontBody: 'Inter',
    fontMono: 'JetBrains Mono',
    primitives: {
      brand500: '#10B981',
      brand600: '#059669',
      accent400: '#5EEAD4',
      accent500: '#2DD4BF',
      neutral50: '#ECFDF5',
      neutral200: '#A7F3D0',
      neutral500: '#6EE7B7',
      neutral800: '#122925',
      neutral900: '#0B1C19',
      neutral950: '#06110F',
      success500: '#34D399',
      warning500: '#FBBF24',
      danger500: '#FB7185',
    },
    typographyScale: buildTypographyScale('Space Grotesk', 'Inter', 'JetBrains Mono'),
    spacingGrid: buildSpacingGrid(8),
    radii: buildRadiusScale(12),
    shadows: buildShadowElevations('#10B981'),
  },
];

export interface ResolvedDesignTokenSystem {
  tokens: DesignTokens;
  primitives: ColorPrimitivePalette;
  typographyScale: Record<TypographyScaleKey, TypographyScaleToken>;
  spacingGrid: SpacingGridTokens;
  radii: RadiusScaleTokens;
  shadows: ShadowElevationTokens;
}

export function hydrateDesignTokens(tokens: DesignTokens): ResolvedDesignTokenSystem {
  const spacingUnit = tokens.spacingUnit ?? tokens.spacingGrid?.unit ?? 8;
  const primitives = tokens.primitives ?? buildColorPrimitives(tokens);
  const typographyScale =
    tokens.typographyScale ??
    buildTypographyScale(
      tokens.fontDisplay ?? 'Space Grotesk',
      tokens.fontBody ?? 'Inter',
      tokens.fontMono ?? 'JetBrains Mono',
    );
  const spacingGrid = tokens.spacingGrid ?? buildSpacingGrid(spacingUnit);
  const radii = buildRadiusScale(tokens.radiusBase);
  const shadows = tokens.shadows ?? buildShadowElevations(tokens.brandPrimary);

  return {
    tokens: {
      ...tokens,
      spacingUnit,
      primitives,
      typographyScale,
      spacingGrid,
      radii,
      shadows,
    },
    primitives,
    typographyScale,
    spacingGrid,
    radii,
    shadows,
  };
}

export function getFlagshipThemeById(id: string): DesignTokens {
  return (
    FLAGSHIP_V4_THEMES.find((t) => t.id === id) ?? FLAGSHIP_V4_THEMES[0]
  );
}

export function updateTokenSpacingUnit(
  tokens: DesignTokens,
  unit: number,
): DesignTokens {
  const spacingGrid = buildSpacingGrid(unit);
  return {
    ...tokens,
    spacingUnit: spacingGrid.unit,
    spacingGrid,
  };
}

export function updateTokenTypography(
  tokens: DesignTokens,
  key: TypographyScaleKey,
  patch: Partial<TypographyScaleToken>,
): DesignTokens {
  const resolved = hydrateDesignTokens(tokens);
  const updatedScale: Record<TypographyScaleKey, TypographyScaleToken> = {
    ...resolved.typographyScale,
    [key]: {
      ...resolved.typographyScale[key],
      ...patch,
    },
  };
  return {
    ...resolved.tokens,
    typographyScale: updatedScale,
  };
}

/**
 * Re-skins an entire DocumentState cleanly when switching Design Token themes,
 * syncing bound semantic values while preserving custom overrides & token bindings.
 */
export function applyDesignTokenTheme(
  doc: DocumentState,
  themeOrId: string | DesignTokens,
): DocumentState {
  const nextTokens =
    typeof themeOrId === 'string' ? getFlagshipThemeById(themeOrId) : themeOrId;
  const hydrated = hydrateDesignTokens(nextTokens).tokens;

  const reskinArtboard = (board: DocumentState['artboard']) => {
    const b = board.tokenBinding;
    if (!b) return board;
    return {
      ...board,
      background: {
        ...board.background,
        color: b.fill ? hydrated[b.fill] : board.background.color,
        gradient: board.background.gradient
          ? {
              ...board.background.gradient,
              from: b.fillGradientFrom
                ? hydrated[b.fillGradientFrom]
                : board.background.gradient.from,
              to: b.fillGradientTo
                ? hydrated[b.fillGradientTo]
                : board.background.gradient.to,
            }
          : undefined,
      },
    };
  };

  const nextArtboard = reskinArtboard(doc.artboard);
  const nextArtboards = doc.artboards?.map(reskinArtboard);

  const nextNodes = doc.nodes.map((node) => {
    const bind = node.tokenBinding;
    if (!bind) return node;
    return {
      ...node,
      fill: {
        ...node.fill,
        color: bind.fill ? hydrated[bind.fill] : node.fill.color,
        gradient: node.fill.gradient
          ? {
              ...node.fill.gradient,
              from: bind.fillGradientFrom
                ? hydrated[bind.fillGradientFrom]
                : node.fill.gradient.from,
              to: bind.fillGradientTo
                ? hydrated[bind.fillGradientTo]
                : node.fill.gradient.to,
            }
          : undefined,
      },
      strokeColor: bind.stroke ? hydrated[bind.stroke] : node.strokeColor,
      textColor: bind.textColor ? hydrated[bind.textColor] : node.textColor,
      radius: bind.radius === 'radiusBase' ? hydrated.radiusBase : node.radius,
    };
  });

  return {
    ...doc,
    tokens: hydrated,
    artboard: nextArtboard,
    artboards: nextArtboards,
    nodes: nextNodes,
  };
}

export function exportW3CDesignTokensJson(tokens: DesignTokens): string {
  const sys = hydrateDesignTokens(tokens);
  const payload = {
    $schema: 'https://design-tokens.org/schemas/v1/tokens.json',
    atelierTheme: {
      id: { $value: sys.tokens.id, $type: 'string' },
      name: { $value: sys.tokens.name, $type: 'string' },
      version: { $value: '4.0.0', $type: 'string' },
    },
    primitive: {
      color: Object.fromEntries(
        Object.entries(sys.primitives).map(([k, v]) => [
          k,
          { $value: v, $type: 'color' },
        ]),
      ),
    },
    color: {
      brand: {
        primary: { $value: sys.tokens.brandPrimary, $type: 'color' },
        accent: { $value: sys.tokens.brandAccent, $type: 'color' },
      },
      surface: {
        canvas: { $value: sys.tokens.surfaceCanvas, $type: 'color' },
        card: { $value: sys.tokens.surfaceCard, $type: 'color' },
        elevated: { $value: sys.tokens.surfaceElevated, $type: 'color' },
      },
      border: {
        subtle: { $value: sys.tokens.borderSubtle, $type: 'color' },
      },
      text: {
        primary: { $value: sys.tokens.textPrimary, $type: 'color' },
        muted: { $value: sys.tokens.textMuted, $type: 'color' },
      },
    },
    typography: Object.fromEntries(
      Object.entries(sys.typographyScale).map(([scaleKey, spec]) => [
        scaleKey,
        {
          $type: 'typography',
          $value: {
            fontFamily: spec.fontFamily,
            fontSize: `${spec.fontSize}px`,
            fontWeight: spec.fontWeight,
            lineHeight: spec.lineHeight,
            letterSpacing: `${spec.letterSpacing}px`,
          },
        },
      ]),
    ),
    spacing: {
      unit: { $value: `${sys.spacingGrid.unit}px`, $type: 'dimension' },
      xs: { $value: `${sys.spacingGrid.xs}px`, $type: 'dimension' },
      sm: { $value: `${sys.spacingGrid.sm}px`, $type: 'dimension' },
      md: { $value: `${sys.spacingGrid.md}px`, $type: 'dimension' },
      lg: { $value: `${sys.spacingGrid.lg}px`, $type: 'dimension' },
      xl: { $value: `${sys.spacingGrid.xl}px`, $type: 'dimension' },
      '2xl': { $value: `${sys.spacingGrid['2xl']}px`, $type: 'dimension' },
      '3xl': { $value: `${sys.spacingGrid['3xl']}px`, $type: 'dimension' },
    },
    borderRadius: {
      none: { $value: `${sys.radii.none}px`, $type: 'dimension' },
      sm: { $value: `${sys.radii.sm}px`, $type: 'dimension' },
      md: { $value: `${sys.radii.md}px`, $type: 'dimension' },
      lg: { $value: `${sys.radii.lg}px`, $type: 'dimension' },
      xl: { $value: `${sys.radii.xl}px`, $type: 'dimension' },
      full: { $value: `${sys.radii.full}px`, $type: 'dimension' },
    },
    dimension: {
      radius: {
        base: { $value: `${sys.tokens.radiusBase}px`, $type: 'dimension' },
      },
    },
    shadow: {
      subtle: { $value: sys.shadows.subtle, $type: 'shadow' },
      elevated: { $value: sys.shadows.elevated, $type: 'shadow' },
      floating: { $value: sys.shadows.floating, $type: 'shadow' },
      neon: { $value: sys.shadows.neon, $type: 'shadow' },
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function exportCssCustomProperties(tokens: DesignTokens): string {
  const sys = hydrateDesignTokens(tokens);
  const t = sys.tokens;
  const sp = sys.spacingGrid;
  const rd = sys.radii;
  const sh = sys.shadows;
  const ty = sys.typographyScale;

  return `/* Atelier Canvas Pro v4.0 — Design Tokens (${t.name}) */
:root {
  /* Semantic Color Tokens */
  --brand-primary: ${t.brandPrimary};
  --brand-accent: ${t.brandAccent};
  --surface-canvas: ${t.surfaceCanvas};
  --surface-card: ${t.surfaceCard};
  --surface-elevated: ${t.surfaceElevated};
  --border-subtle: ${t.borderSubtle};
  --text-primary: ${t.textPrimary};
  --text-muted: ${t.textMuted};

  /* Color Primitives */
  --primitive-brand-500: ${sys.primitives.brand500};
  --primitive-brand-600: ${sys.primitives.brand600};
  --primitive-accent-400: ${sys.primitives.accent400};
  --primitive-accent-500: ${sys.primitives.accent500};
  --primitive-success-500: ${sys.primitives.success500};
  --primitive-warning-500: ${sys.primitives.warning500};
  --primitive-danger-500: ${sys.primitives.danger500};

  /* Typography Scale */
  --font-display: '${ty.display.fontFamily}', system-ui, sans-serif;
  --font-body: '${ty.body.fontFamily}', system-ui, sans-serif;
  --font-mono: '${ty.mono.fontFamily}', monospace;
  --type-display-size: ${ty.display.fontSize}px;
  --type-h1-size: ${ty.h1.fontSize}px;
  --type-h2-size: ${ty.h2.fontSize}px;
  --type-h3-size: ${ty.h3.fontSize}px;
  --type-body-size: ${ty.body.fontSize}px;
  --type-caption-size: ${ty.caption.fontSize}px;
  --type-mono-size: ${ty.mono.fontSize}px;

  /* Spacing Grid (${sp.unit}px Base) */
  --space-unit: ${sp.unit}px;
  --space-xs: ${sp.xs}px;
  --space-sm: ${sp.sm}px;
  --space-md: ${sp.md}px;
  --space-lg: ${sp.lg}px;
  --space-xl: ${sp.xl}px;
  --space-2xl: ${sp['2xl']}px;
  --space-3xl: ${sp['3xl']}px;

  /* Border Radius Scale */
  --radius-none: ${rd.none}px;
  --radius-sm: ${rd.sm}px;
  --radius-base: ${t.radiusBase}px;
  --radius-md: ${rd.md}px;
  --radius-lg: ${rd.lg}px;
  --radius-xl: ${rd.xl}px;
  --radius-full: ${rd.full}px;

  /* Shadow Elevations */
  --shadow-subtle: ${sh.subtle};
  --shadow-elevated: ${sh.elevated};
  --shadow-floating: ${sh.floating};
  --shadow-neon: ${sh.neon};
}`;
}
