import { describe, expect, it } from 'vitest';
import {
  auditDesignTokenContrast,
  COMPILE_TARGET_META,
  compileAllDesignTokenTargets,
  compileDesignTokensForTarget,
  compileTokensToJetpackCompose,
  compileTokensToSwiftUI,
  compileTokensToTailwindV4Css,
  compileTokensToTypeScript,
  isLightThemeSurface,
  normalizeHex6,
} from '../tokenCompilerEngine';
import { getFlagshipThemeById } from '../designTokens';

describe('v5.0 Multi-Platform Design Token Compiler Engine', () => {
  it('normalizes 3-digit, 6-digit, lowercase, and invalid hex color strings safely', () => {
    expect(normalizeHex6('#f0a')).toBe('FF00AA');
    expect(normalizeHex6('#6366f1')).toBe('6366F1');
    expect(normalizeHex6('10b981')).toBe('10B981');
    expect(normalizeHex6('invalid-color', '000000')).toBe('000000');
  });

  it('detects dark vs light theme surfaces accurately via relative luminance', () => {
    expect(isLightThemeSurface('#0C0E14')).toBe(false);
    expect(isLightThemeSurface('#06110F')).toBe(false);
    expect(isLightThemeSurface('#F6F5F0')).toBe(true);
    expect(isLightThemeSurface('#FFFFFF')).toBe(true);
  });

  it('compiles Obsidian Pro tokens into valid Tailwind CSS v4 @theme directives', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const css = compileTokensToTailwindV4Css(obsidian);

    expect(css).toContain('@import "tailwindcss";');
    expect(css).toContain('@theme {');
    expect(css).toContain('--color-brand-primary: #6366F1;');
    expect(css).toContain('--color-brand-accent: #06B6D4;');
    expect(css).toContain('--color-surface-canvas: #0C0E14;');
    expect(css).toContain('--font-display: "Space Grotesk"');
    expect(css).toContain('--spacing-md: 16px;');
    expect(css).toContain('--radius-base: 16px;');
    expect(css).toContain('--shadow-neon:');
  });

  it('compiles active tokens into strictly-typed TypeScript `as const` theme constants', () => {
    const cyber = getFlagshipThemeById('cyber-emerald');
    const ts = compileTokensToTypeScript(cyber);

    expect(ts).toContain('export const CyberEmeraldTokens = {');
    expect(ts).toContain("colorScheme: 'dark'");
    expect(ts).toContain("brandPrimary: '#10B981'");
    expect(ts).toContain("brandAccent: '#2DD4BF'");
    expect(ts).toContain('} as const;');
    expect(ts).toContain('export type AtelierDesignTokens = typeof CyberEmeraldTokens;');
    expect(ts).toContain("export type AtelierColorToken = keyof AtelierDesignTokens['color'];");
    expect(ts).toContain("export type AtelierSpacingToken = keyof AtelierDesignTokens['spacing'];");
  });

  it('compiles active tokens into iOS SwiftUI Color & CGFloat extensions', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const swift = compileTokensToSwiftUI(obsidian);

    expect(swift).toContain('import SwiftUI');
    expect(swift).toContain('public extension Color {');
    expect(swift).toContain('init(atelierHex hex: UInt, alpha: Double = 1.0)');
    expect(swift).toContain('static let atelierBrandPrimary    = Color(atelierHex: 0x6366F1)');
    expect(swift).toContain('static let atelierSurfaceCanvas   = Color(atelierHex: 0x0C0E14)');
    expect(swift).toContain('public extension CGFloat {');
    expect(swift).toContain('static let atelierSpaceMD: CGFloat   = 16.0');
    expect(swift).toContain('static let atelierRadiusBase: CGFloat = 16.0');
    expect(swift).toContain('public enum AtelierTypography {');
  });

  it('compiles dark themes into Android Jetpack Compose darkColorScheme in Theme.kt', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const kt = compileTokensToJetpackCompose(obsidian);

    expect(kt).toContain('package com.ateliercanvas.designsystem.theme');
    expect(kt).toContain('import androidx.compose.material3.darkColorScheme');
    expect(kt).toContain('val BrandPrimary: Color    = Color(0xFF6366F1)');
    expect(kt).toContain('val Md: Dp   = 16.dp');
    expect(kt).toContain('val Display: TextUnit = 48.sp');
    expect(kt).toContain('val AtelierColorScheme = darkColorScheme(');
    expect(kt).toContain('@Composable');
    expect(kt).toContain('fun AtelierTheme(');
  });

  it('compiles Swiss Editorial Light into Jetpack Compose lightColorScheme and TS light metadata', () => {
    const swiss = getFlagshipThemeById('swiss-editorial-light');
    const kt = compileTokensToJetpackCompose(swiss);
    const ts = compileTokensToTypeScript(swiss);

    expect(kt).toContain('import androidx.compose.material3.lightColorScheme');
    expect(kt).toContain('val AtelierColorScheme = lightColorScheme(');
    expect(kt).toContain('val BrandPrimary: Color    = Color(0xFFE11D48)');
    expect(kt).toContain('val Base: Dp = 6.dp');
    expect(ts).toContain("colorScheme: 'light'");
    expect(ts).toContain("fontFamily: 'Cormorant Garamond'");
  });

  it('recompiles all 4 targets live when token spacing and border radius mutate', () => {
    const custom = {
      ...getFlagshipThemeById('obsidian-pro'),
      brandPrimary: '#2563EB',
      radiusBase: 22,
      spacingUnit: 4,
      spacingGrid: undefined,
    };

    const all = compileAllDesignTokenTargets(custom);
    expect(all['tailwind-v4'].code).toContain('--color-brand-primary: #2563EB;');
    expect(all['tailwind-v4'].code).toContain('--radius-base: 22px;');
    expect(all['tailwind-v4'].code).toContain('--spacing-md: 8px;');
    expect(all.swiftui.code).toContain('0x2563EB');
    expect(all.swiftui.code).toContain('atelierRadiusBase: CGFloat = 22.0');
    expect(all.compose.code).toContain('Color(0xFF2563EB)');
    expect(all.compose.code).toContain('val Base: Dp = 22.dp');
  });

  it('returns complete artifact metadata (filename, language, mimeType, bytes, lineCount) for all 4 targets', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    expect(COMPILE_TARGET_META.map((m) => m.id)).toEqual([
      'tailwind-v4',
      'typescript',
      'swiftui',
      'compose',
    ]);

    const all = compileAllDesignTokenTargets(obsidian);
    expect(all['tailwind-v4'].filename).toBe('obsidian-pro.theme.css');
    expect(all.typescript.filename).toBe('obsidian-pro.tokens.ts');
    expect(all.swiftui.filename).toBe('ObsidianProTheme.swift');
    expect(all.compose.filename).toBe('Theme.kt');

    for (const artifact of Object.values(all)) {
      expect(artifact.lineCount).toBeGreaterThan(30);
      expect(artifact.byteLength).toBeGreaterThan(500);
      expect(artifact.tokenCount).toBeGreaterThanOrEqual(30);
    }
  });

  it('compiles single target artifacts deterministically via compileDesignTokensForTarget', () => {
    const cyber = getFlagshipThemeById('cyber-emerald');
    const swiftArtifact = compileDesignTokensForTarget(cyber, 'swiftui');
    expect(swiftArtifact.language).toBe('swift');
    expect(swiftArtifact.filename).toBe('CyberEmeraldTheme.swift');
    expect(swiftArtifact.code).toContain('0x10B981');
  });

  it('audits WCAG 2.1 contrast pairs across Obsidian Pro and Swiss Editorial Light accurately', () => {
    const obsidianAudit = auditDesignTokenContrast(getFlagshipThemeById('obsidian-pro'));
    expect(obsidianAudit.totalPairs).toBe(5);
    expect(obsidianAudit.aaPassCount).toBeGreaterThanOrEqual(4);
    const primaryOnCanvas = obsidianAudit.pairs.find((p) => p.id === 'text-on-canvas')!;
    expect(primaryOnCanvas.result.passesAAA).toBe(true);
    expect(primaryOnCanvas.result.ratio).toBeGreaterThan(15);

    const swissAudit = auditDesignTokenContrast(getFlagshipThemeById('swiss-editorial-light'));
    const swissPrimary = swissAudit.pairs.find((p) => p.id === 'text-on-canvas')!;
    expect(swissPrimary.result.passesAAA).toBe(true);
    expect(swissAudit.passRatePercent).toBeGreaterThanOrEqual(80);
  });

  it('flags failing low-contrast custom token overrides cleanly in WCAG audit', () => {
    const badTokens = {
      ...getFlagshipThemeById('obsidian-pro'),
      textPrimary: '#1E293B',
      surfaceCanvas: '#0F172A',
    };
    const audit = auditDesignTokenContrast(badTokens);
    const pair = audit.pairs.find((p) => p.id === 'text-on-canvas')!;
    expect(pair.result.passesAA).toBe(false);
    expect(pair.result.grade).toBe('FAIL');
  });
});
