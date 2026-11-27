import type { DesignTokens } from '../types/canvas';
import { hydrateDesignTokens } from './designTokens';
import { evaluateWcag, relativeLuminance, type WcagAuditResult } from './wcag';

export type CompileTargetId = 'tailwind-v4' | 'typescript' | 'swiftui' | 'compose';

export interface CompiledTokenArtifact {
  target: CompileTargetId;
  label: string;
  shortLabel: string;
  platform: string;
  filename: string;
  language: 'css' | 'typescript' | 'swift' | 'kotlin';
  mimeType: string;
  code: string;
  lineCount: number;
  byteLength: number;
  tokenCount: number;
}

export interface TokenContrastPairAudit {
  id: string;
  label: string;
  foregroundToken: string;
  backgroundToken: string;
  result: WcagAuditResult;
}

export interface TokenWcagSummary {
  pairs: TokenContrastPairAudit[];
  aaPassCount: number;
  aaaPassCount: number;
  totalPairs: number;
  passRatePercent: number;
}

export const COMPILE_TARGET_META: Array<{
  id: CompileTargetId;
  label: string;
  shortLabel: string;
  platform: string;
  language: 'css' | 'typescript' | 'swift' | 'kotlin';
  extension: string;
  mimeType: string;
}> = [
  {
    id: 'tailwind-v4',
    label: 'Tailwind v4 @theme CSS',
    shortLabel: 'Tailwind v4',
    platform: 'Web / CSS4',
    language: 'css',
    extension: 'theme.css',
    mimeType: 'text/css;charset=utf-8',
  },
  {
    id: 'typescript',
    label: 'TypeScript Strict Theme',
    shortLabel: 'TypeScript',
    platform: 'React / Web',
    language: 'typescript',
    extension: 'tokens.ts',
    mimeType: 'text/plain;charset=utf-8',
  },
  {
    id: 'swiftui',
    label: 'iOS SwiftUI Extension',
    shortLabel: 'SwiftUI',
    platform: 'iOS / macOS',
    language: 'swift',
    extension: 'Theme.swift',
    mimeType: 'text/plain;charset=utf-8',
  },
  {
    id: 'compose',
    label: 'Android Jetpack Compose',
    shortLabel: 'Compose KT',
    platform: 'Android / Kotlin',
    language: 'kotlin',
    extension: 'Theme.kt',
    mimeType: 'text/plain;charset=utf-8',
  },
];

/**
 * Normalizes 3-digit or 6-digit hex colors into uppercase 6-digit hex without '#'.
 */
export function normalizeHex6(hex: string, fallback = '6366F1'): string {
  const cleaned = hex.replace('#', '').trim().toUpperCase();
  if (/^[0-9A-F]{3}$/.test(cleaned)) {
    return (
      cleaned[0] +
      cleaned[0] +
      cleaned[1] +
      cleaned[1] +
      cleaned[2] +
      cleaned[2]
    );
  }
  if (/^[0-9A-F]{6}$/.test(cleaned)) {
    return cleaned;
  }
  return fallback;
}

function toSwiftHexLiteral(hex: string): string {
  return `0x${normalizeHex6(hex)}`;
}

function toComposeColorLiteral(hex: string): string {
  return `Color(0xFF${normalizeHex6(hex)})`;
}

function toSlug(id: string): string {
  return (
    id
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'atelier'
  );
}

function toPascalCase(id: string): string {
  return (
    id
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('') || 'Atelier'
  );
}

export function isLightThemeSurface(surfaceCanvasHex: string): boolean {
  return relativeLuminance(`#${normalizeHex6(surfaceCanvasHex)}`) > 0.42;
}

/**
 * 1. Compiles active W3C Design Tokens into Tailwind CSS v4 `@theme` + semantic CSS custom properties.
 */
export function compileTokensToTailwindV4Css(tokens: DesignTokens): string {
  const sys = hydrateDesignTokens(tokens);
  const t = sys.tokens;
  const p = sys.primitives;
  const sp = sys.spacingGrid;
  const rd = sys.radii;
  const sh = sys.shadows;
  const ty = sys.typographyScale;

  return `/* ==========================================================================
 * Atelier Canvas v5.0 — Tailwind CSS v4 @theme Design Token Output
 * Theme: ${t.name} (${t.id})
 * Standard: W3C Design Tokens Community Group (DTCG)
 * ========================================================================== */
@import "tailwindcss";

@theme {
  /* Semantic Brand & Surface Colors */
  --color-brand-primary: #${normalizeHex6(t.brandPrimary)};
  --color-brand-accent: #${normalizeHex6(t.brandAccent)};
  --color-surface-canvas: #${normalizeHex6(t.surfaceCanvas)};
  --color-surface-card: #${normalizeHex6(t.surfaceCard)};
  --color-surface-elevated: #${normalizeHex6(t.surfaceElevated)};
  --color-border-subtle: #${normalizeHex6(t.borderSubtle)};
  --color-text-primary: #${normalizeHex6(t.textPrimary)};
  --color-text-muted: #${normalizeHex6(t.textMuted)};

  /* Primitive Signal Colors */
  --color-primitive-brand-500: #${normalizeHex6(p.brand500)};
  --color-primitive-brand-600: #${normalizeHex6(p.brand600)};
  --color-primitive-accent-400: #${normalizeHex6(p.accent400)};
  --color-primitive-accent-500: #${normalizeHex6(p.accent500)};
  --color-signal-success: #${normalizeHex6(p.success500)};
  --color-signal-warning: #${normalizeHex6(p.warning500)};
  --color-signal-danger: #${normalizeHex6(p.danger500)};

  /* Typography Families & Scale */
  --font-display: "${ty.display.fontFamily}", system-ui, sans-serif;
  --font-sans: "${ty.body.fontFamily}", system-ui, sans-serif;
  --font-mono: "${ty.mono.fontFamily}", ui-monospace, monospace;
  --text-display: ${ty.display.fontSize}px;
  --text-h1: ${ty.h1.fontSize}px;
  --text-h2: ${ty.h2.fontSize}px;
  --text-h3: ${ty.h3.fontSize}px;
  --text-body: ${ty.body.fontSize}px;
  --text-caption: ${ty.caption.fontSize}px;

  /* Spacing Grid (${sp.unit}px Base Unit) */
  --spacing-unit: ${sp.unit}px;
  --spacing-xs: ${sp.xs}px;
  --spacing-sm: ${sp.sm}px;
  --spacing-md: ${sp.md}px;
  --spacing-lg: ${sp.lg}px;
  --spacing-xl: ${sp.xl}px;
  --spacing-2xl: ${sp['2xl']}px;
  --spacing-3xl: ${sp['3xl']}px;

  /* Border Radius Scale */
  --radius-none: ${rd.none}px;
  --radius-sm: ${rd.sm}px;
  --radius-base: ${t.radiusBase}px;
  --radius-md: ${rd.md}px;
  --radius-lg: ${rd.lg}px;
  --radius-xl: ${rd.xl}px;
  --radius-full: ${rd.full}px;

  /* Elevation Shadows */
  --shadow-subtle: ${sh.subtle};
  --shadow-elevated: ${sh.elevated};
  --shadow-floating: ${sh.floating};
  --shadow-neon: ${sh.neon};
}`;
}

/**
 * 2. Compiles active W3C Design Tokens into Strictly-Typed TypeScript Theme Constants (`as const`).
 */
export function compileTokensToTypeScript(tokens: DesignTokens): string {
  const sys = hydrateDesignTokens(tokens);
  const t = sys.tokens;
  const p = sys.primitives;
  const sp = sys.spacingGrid;
  const rd = sys.radii;
  const sh = sys.shadows;
  const ty = sys.typographyScale;
  const constPrefix = toPascalCase(t.id);

  return `// Atelier Canvas v5.0 — Strictly-Typed Design Token Constants
// Theme: ${t.name} (${t.id})

export const ${constPrefix}Tokens = {
  meta: {
    id: '${t.id}',
    name: '${t.name}',
    colorScheme: '${isLightThemeSurface(t.surfaceCanvas) ? 'light' : 'dark'}',
    version: '5.0.0',
  },
  color: {
    brandPrimary: '#${normalizeHex6(t.brandPrimary)}',
    brandAccent: '#${normalizeHex6(t.brandAccent)}',
    surfaceCanvas: '#${normalizeHex6(t.surfaceCanvas)}',
    surfaceCard: '#${normalizeHex6(t.surfaceCard)}',
    surfaceElevated: '#${normalizeHex6(t.surfaceElevated)}',
    borderSubtle: '#${normalizeHex6(t.borderSubtle)}',
    textPrimary: '#${normalizeHex6(t.textPrimary)}',
    textMuted: '#${normalizeHex6(t.textMuted)}',
    success: '#${normalizeHex6(p.success500)}',
    warning: '#${normalizeHex6(p.warning500)}',
    danger: '#${normalizeHex6(p.danger500)}',
  },
  typography: {
    display: { fontFamily: '${ty.display.fontFamily}', fontSize: ${ty.display.fontSize}, fontWeight: ${ty.display.fontWeight}, lineHeight: ${ty.display.lineHeight} },
    h1: { fontFamily: '${ty.h1.fontFamily}', fontSize: ${ty.h1.fontSize}, fontWeight: ${ty.h1.fontWeight}, lineHeight: ${ty.h1.lineHeight} },
    h2: { fontFamily: '${ty.h2.fontFamily}', fontSize: ${ty.h2.fontSize}, fontWeight: ${ty.h2.fontWeight}, lineHeight: ${ty.h2.lineHeight} },
    h3: { fontFamily: '${ty.h3.fontFamily}', fontSize: ${ty.h3.fontSize}, fontWeight: ${ty.h3.fontWeight}, lineHeight: ${ty.h3.lineHeight} },
    body: { fontFamily: '${ty.body.fontFamily}', fontSize: ${ty.body.fontSize}, fontWeight: ${ty.body.fontWeight}, lineHeight: ${ty.body.lineHeight} },
    caption: { fontFamily: '${ty.caption.fontFamily}', fontSize: ${ty.caption.fontSize}, fontWeight: ${ty.caption.fontWeight}, lineHeight: ${ty.caption.lineHeight} },
    mono: { fontFamily: '${ty.mono.fontFamily}', fontSize: ${ty.mono.fontSize}, fontWeight: ${ty.mono.fontWeight}, lineHeight: ${ty.mono.lineHeight} },
  },
  spacing: {
    unit: ${sp.unit},
    xs: ${sp.xs},
    sm: ${sp.sm},
    md: ${sp.md},
    lg: ${sp.lg},
    xl: ${sp.xl},
    '2xl': ${sp['2xl']},
    '3xl': ${sp['3xl']},
  },
  radius: {
    none: ${rd.none},
    sm: ${rd.sm},
    base: ${t.radiusBase},
    md: ${rd.md},
    lg: ${rd.lg},
    xl: ${rd.xl},
    full: ${rd.full},
  },
  shadow: {
    subtle: '${sh.subtle}',
    elevated: '${sh.elevated}',
    floating: '${sh.floating}',
    neon: '${sh.neon}',
  },
} as const;

export type AtelierDesignTokens = typeof ${constPrefix}Tokens;
export type AtelierColorToken = keyof AtelierDesignTokens['color'];
export type AtelierSpacingToken = keyof AtelierDesignTokens['spacing'];
export type AtelierRadiusToken = keyof AtelierDesignTokens['radius'];
export type AtelierTypographyRole = keyof AtelierDesignTokens['typography'];`;
}

/**
 * 3. Compiles active W3C Design Tokens into iOS SwiftUI `Color` & `CGFloat` extensions.
 */
export function compileTokensToSwiftUI(tokens: DesignTokens): string {
  const sys = hydrateDesignTokens(tokens);
  const t = sys.tokens;
  const p = sys.primitives;
  const sp = sys.spacingGrid;
  const rd = sys.radii;
  const ty = sys.typographyScale;

  return `// Atelier Canvas v5.0 — iOS SwiftUI Design System Extensions
// Theme: ${t.name} (${t.id})

import SwiftUI

public extension Color {
    init(atelierHex hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }

    // Semantic Brand & Surface Colors
    static let atelierBrandPrimary    = Color(atelierHex: ${toSwiftHexLiteral(t.brandPrimary)})
    static let atelierBrandAccent     = Color(atelierHex: ${toSwiftHexLiteral(t.brandAccent)})
    static let atelierSurfaceCanvas   = Color(atelierHex: ${toSwiftHexLiteral(t.surfaceCanvas)})
    static let atelierSurfaceCard     = Color(atelierHex: ${toSwiftHexLiteral(t.surfaceCard)})
    static let atelierSurfaceElevated = Color(atelierHex: ${toSwiftHexLiteral(t.surfaceElevated)})
    static let atelierBorderSubtle    = Color(atelierHex: ${toSwiftHexLiteral(t.borderSubtle)})
    static let atelierTextPrimary     = Color(atelierHex: ${toSwiftHexLiteral(t.textPrimary)})
    static let atelierTextMuted       = Color(atelierHex: ${toSwiftHexLiteral(t.textMuted)})

    // Signal Primitives
    static let atelierSuccess         = Color(atelierHex: ${toSwiftHexLiteral(p.success500)})
    static let atelierWarning         = Color(atelierHex: ${toSwiftHexLiteral(p.warning500)})
    static let atelierDanger          = Color(atelierHex: ${toSwiftHexLiteral(p.danger500)})
}

public extension CGFloat {
    // Spacing Grid (${sp.unit}pt Base Unit)
    static let atelierSpaceUnit: CGFloat = ${sp.unit}.0
    static let atelierSpaceXS: CGFloat   = ${sp.xs}.0
    static let atelierSpaceSM: CGFloat   = ${sp.sm}.0
    static let atelierSpaceMD: CGFloat   = ${sp.md}.0
    static let atelierSpaceLG: CGFloat   = ${sp.lg}.0
    static let atelierSpaceXL: CGFloat   = ${sp.xl}.0
    static let atelierSpace2XL: CGFloat  = ${sp['2xl']}.0
    static let atelierSpace3XL: CGFloat  = ${sp['3xl']}.0

    // Border Radius Scale
    static let atelierRadiusNone: CGFloat = ${rd.none}.0
    static let atelierRadiusSM: CGFloat   = ${rd.sm}.0
    static let atelierRadiusBase: CGFloat = ${t.radiusBase}.0
    static let atelierRadiusMD: CGFloat   = ${rd.md}.0
    static let atelierRadiusLG: CGFloat   = ${rd.lg}.0
    static let atelierRadiusXL: CGFloat   = ${rd.xl}.0
}

public enum AtelierTypography {
    public static let display = Font.custom("${ty.display.fontFamily}", size: ${ty.display.fontSize}).weight(.bold)
    public static let h1      = Font.custom("${ty.h1.fontFamily}", size: ${ty.h1.fontSize}).weight(.bold)
    public static let h2      = Font.custom("${ty.h2.fontFamily}", size: ${ty.h2.fontSize}).weight(.semibold)
    public static let body    = Font.custom("${ty.body.fontFamily}", size: ${ty.body.fontSize}).weight(.regular)
    public static let caption = Font.custom("${ty.caption.fontFamily}", size: ${ty.caption.fontSize}).weight(.medium)
    public static let mono    = Font.custom("${ty.mono.fontFamily}", size: ${ty.mono.fontSize}).weight(.semibold)
}`;
}

/**
 * 4. Compiles active W3C Design Tokens into Android Jetpack Compose Material 3 `Theme.kt`.
 */
export function compileTokensToJetpackCompose(tokens: DesignTokens): string {
  const sys = hydrateDesignTokens(tokens);
  const t = sys.tokens;
  const p = sys.primitives;
  const sp = sys.spacingGrid;
  const rd = sys.radii;
  const ty = sys.typographyScale;
  const isLight = isLightThemeSurface(t.surfaceCanvas);
  const schemeFn = isLight ? 'lightColorScheme' : 'darkColorScheme';

  return `// Atelier Canvas v5.0 — Android Jetpack Compose Theme.kt
// Theme: ${t.name} (${t.id})

package com.ateliercanvas.designsystem.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.${schemeFn}
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object AtelierColors {
    val BrandPrimary: Color    = ${toComposeColorLiteral(t.brandPrimary)}
    val BrandAccent: Color     = ${toComposeColorLiteral(t.brandAccent)}
    val SurfaceCanvas: Color   = ${toComposeColorLiteral(t.surfaceCanvas)}
    val SurfaceCard: Color     = ${toComposeColorLiteral(t.surfaceCard)}
    val SurfaceElevated: Color = ${toComposeColorLiteral(t.surfaceElevated)}
    val BorderSubtle: Color    = ${toComposeColorLiteral(t.borderSubtle)}
    val TextPrimary: Color     = ${toComposeColorLiteral(t.textPrimary)}
    val TextMuted: Color       = ${toComposeColorLiteral(t.textMuted)}
    val Success: Color         = ${toComposeColorLiteral(p.success500)}
    val Warning: Color         = ${toComposeColorLiteral(p.warning500)}
    val Danger: Color          = ${toComposeColorLiteral(p.danger500)}
}

object AtelierSpacing {
    val Unit: Dp = ${sp.unit}.dp
    val Xs: Dp   = ${sp.xs}.dp
    val Sm: Dp   = ${sp.sm}.dp
    val Md: Dp   = ${sp.md}.dp
    val Lg: Dp   = ${sp.lg}.dp
    val Xl: Dp   = ${sp.xl}.dp
    val Xxl: Dp  = ${sp['2xl']}.dp
    val Xxxl: Dp = ${sp['3xl']}.dp
}

object AtelierRadii {
    val None: Dp = ${rd.none}.dp
    val Sm: Dp   = ${rd.sm}.dp
    val Base: Dp = ${t.radiusBase}.dp
    val Md: Dp   = ${rd.md}.dp
    val Lg: Dp   = ${rd.lg}.dp
    val Xl: Dp   = ${rd.xl}.dp
}

object AtelierTypeSizes {
    val Display: TextUnit = ${ty.display.fontSize}.sp
    val H1: TextUnit      = ${ty.h1.fontSize}.sp
    val H2: TextUnit      = ${ty.h2.fontSize}.sp
    val Body: TextUnit    = ${ty.body.fontSize}.sp
    val Caption: TextUnit = ${ty.caption.fontSize}.sp
    val Mono: TextUnit    = ${ty.mono.fontSize}.sp
}

val AtelierColorScheme = ${schemeFn}(
    primary = AtelierColors.BrandPrimary,
    secondary = AtelierColors.BrandAccent,
    background = AtelierColors.SurfaceCanvas,
    surface = AtelierColors.SurfaceCard,
    surfaceVariant = AtelierColors.SurfaceElevated,
    outline = AtelierColors.BorderSubtle,
    onBackground = AtelierColors.TextPrimary,
    onSurface = AtelierColors.TextPrimary,
    onSurfaceVariant = AtelierColors.TextMuted,
    error = AtelierColors.Danger,
)

@Composable
fun AtelierTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AtelierColorScheme,
        content = content,
    )
}`;
}

export function compileDesignTokensForTarget(
  tokens: DesignTokens,
  target: CompileTargetId,
): CompiledTokenArtifact {
  const meta = COMPILE_TARGET_META.find((m) => m.id === target) ?? COMPILE_TARGET_META[0];
  const slug = toSlug(tokens.id);
  const pascal = toPascalCase(tokens.id);

  let code: string;
  let filename: string;
  switch (target) {
    case 'tailwind-v4':
      code = compileTokensToTailwindV4Css(tokens);
      filename = `${slug}.theme.css`;
      break;
    case 'typescript':
      code = compileTokensToTypeScript(tokens);
      filename = `${slug}.tokens.ts`;
      break;
    case 'swiftui':
      code = compileTokensToSwiftUI(tokens);
      filename = `${pascal}Theme.swift`;
      break;
    case 'compose':
      code = compileTokensToJetpackCompose(tokens);
      filename = 'Theme.kt';
      break;
  }

  return {
    target,
    label: meta.label,
    shortLabel: meta.shortLabel,
    platform: meta.platform,
    filename,
    language: meta.language,
    mimeType: meta.mimeType,
    code,
    lineCount: code.split('\n').length,
    byteLength: new TextEncoder().encode(code).byteLength,
    tokenCount: 38,
  };
}

export function compileAllDesignTokenTargets(
  tokens: DesignTokens,
): Record<CompileTargetId, CompiledTokenArtifact> {
  return {
    'tailwind-v4': compileDesignTokensForTarget(tokens, 'tailwind-v4'),
    typescript: compileDesignTokensForTarget(tokens, 'typescript'),
    swiftui: compileDesignTokensForTarget(tokens, 'swiftui'),
    compose: compileDesignTokensForTarget(tokens, 'compose'),
  };
}

/**
 * Evaluates WCAG 2.1 contrast ratios across the active token theme's key UI foreground/background pairs.
 */
export function auditDesignTokenContrast(tokens: DesignTokens): TokenWcagSummary {
  const t = hydrateDesignTokens(tokens).tokens;
  const pairs: TokenContrastPairAudit[] = [
    {
      id: 'text-on-canvas',
      label: 'Primary Text / Canvas',
      foregroundToken: 'textPrimary',
      backgroundToken: 'surfaceCanvas',
      result: evaluateWcag(t.textPrimary, t.surfaceCanvas),
    },
    {
      id: 'text-on-card',
      label: 'Primary Text / Card',
      foregroundToken: 'textPrimary',
      backgroundToken: 'surfaceCard',
      result: evaluateWcag(t.textPrimary, t.surfaceCard),
    },
    {
      id: 'muted-on-card',
      label: 'Muted Text / Card',
      foregroundToken: 'textMuted',
      backgroundToken: 'surfaceCard',
      result: evaluateWcag(t.textMuted, t.surfaceCard),
    },
    {
      id: 'white-on-brand',
      label: 'White Ink / Brand Primary',
      foregroundToken: '#FFFFFF',
      backgroundToken: 'brandPrimary',
      result: evaluateWcag('#FFFFFF', t.brandPrimary),
    },
    {
      id: 'brand-on-canvas',
      label: 'Brand Accent / Canvas',
      foregroundToken: 'brandAccent',
      backgroundToken: 'surfaceCanvas',
      result: evaluateWcag(t.brandAccent, t.surfaceCanvas),
    },
  ];

  const aaPassCount = pairs.filter((p) => p.result.passesAA).length;
  const aaaPassCount = pairs.filter((p) => p.result.passesAAA).length;
  return {
    pairs,
    aaPassCount,
    aaaPassCount,
    totalPairs: pairs.length,
    passRatePercent: Math.round((aaPassCount / pairs.length) * 100),
  };
}
