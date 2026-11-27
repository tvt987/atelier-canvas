import { describe, expect, it } from 'vitest';
import {
  COMPONENT_PRIMITIVES,
  COMPONENT_SIZES,
  COMPONENT_STATES,
  COMPONENT_VARIANTS,
  autoFixDesignSystemMatrix,
  blendHexOverSurface,
  buildAllPrimitivesVariantAudit,
  buildAutoFixOverridesForCell,
  buildComponentVariantMatrix,
  computeAccessibleColorFix,
  createLowContrastStressTestTokens,
  evaluateStrictWcag,
  generateReactCvaSpecCode,
  generateSwiftUiButtonStyleCode,
  makeVariantCellId,
  rgbToHex,
  shiftHexLuminance,
} from '../componentVariantEngine';
import { getFlagshipThemeById } from '../designTokens';
import { filterCommands } from '../commands';
import { computeContrastRatio } from '../wcag';

describe('v6.0 Component Variant Matrix & WCAG 2.1 Contrast Audit Engine', () => {
  it('defines exactly 3 primitives, 4 variants, 3 sizes, and 4 states', () => {
    expect(COMPONENT_PRIMITIVES.map((p) => p.id)).toEqual([
      'action-button',
      'status-badge',
      'metric-input',
    ]);
    expect(COMPONENT_VARIANTS.map((v) => v.id)).toEqual([
      'primary',
      'secondary',
      'ghost',
      'destructive',
    ]);
    expect(COMPONENT_SIZES.map((s) => s.id)).toEqual(['sm', 'md', 'lg']);
    expect(COMPONENT_STATES.map((s) => s.id)).toEqual([
      'default',
      'hover',
      'focus',
      'disabled',
    ]);
  });

  it('builds a full 4x3x4 = 48-cell matrix for Action Button', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const matrix = buildComponentVariantMatrix(obsidian, 'action-button');

    expect(matrix.totalCells).toBe(48);
    expect(matrix.cells).toHaveLength(48);
    expect(matrix.passingCount + matrix.failingCount).toBe(48);
    expect(matrix.complianceScorePercent).toBeGreaterThanOrEqual(0);
    expect(matrix.complianceScorePercent).toBeLessThanOrEqual(100);
  });

  it('builds a full 4x3x4 = 48-cell matrix for Status Badge with pill border radius', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const matrix = buildComponentVariantMatrix(obsidian, 'status-badge');

    expect(matrix.totalCells).toBe(48);
    for (const cell of matrix.cells) {
      expect(cell.style.radiusPx).toBe(999);
    }
  });

  it('builds a full 4x3x4 = 48-cell matrix for Metric Input Field', () => {
    const swiss = getFlagshipThemeById('swiss-editorial-light');
    const matrix = buildComponentVariantMatrix(swiss, 'metric-input');

    expect(matrix.totalCells).toBe(48);
    const primaryDefaultMd = matrix.cells.find(
      (c) => c.id === makeVariantCellId('metric-input', 'primary', 'md', 'default'),
    )!;
    expect(primaryDefaultMd.style.borderHex).toBe('#E11D48');
    expect(primaryDefaultMd.style.backgroundHex).toBe('#FFFFFF');
    expect(primaryDefaultMd.wcag.passesAAA).toBe(true);
  });

  it('aggregates all 3 primitives into a 144-cell design-system audit summary', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const full = buildAllPrimitivesVariantAudit(obsidian, { strictness: 'AA' });

    expect(full.totalCells).toBe(144);
    expect(full.targetRatio).toBe(4.5);
    expect(full.byPrimitive['action-button'].totalCells).toBe(48);
    expect(full.byPrimitive['status-badge'].totalCells).toBe(48);
    expect(full.byPrimitive['metric-input'].totalCells).toBe(48);
    expect(full.passingCount + full.failingCount).toBe(144);
  });

  it('converts RGB channels safely with clamping via rgbToHex', () => {
    expect(rgbToHex(99, 102, 241)).toBe('#6366F1');
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
    expect(rgbToHex(300, -10, 128)).toBe('#FF0080');
  });

  it('composites alpha overlays accurately with Porter-Duff source-over blending', () => {
    expect(blendHexOverSurface('#FFFFFF', '#000000', 0.5)).toBe('#808080');
    expect(blendHexOverSurface('#6366F1', '#0C0E14', 1)).toBe('#6366F1');
    expect(blendHexOverSurface('#6366F1', '#0C0E14', 0)).toBe('#0C0E14');
  });

  it('shifts color luminance deterministically lighter and darker', () => {
    const lighter = shiftHexLuminance('#6366F1', 0.25);
    const darker = shiftHexLuminance('#6366F1', -0.25);
    expect(computeContrastRatio('#000000', lighter)).toBeGreaterThan(
      computeContrastRatio('#000000', '#6366F1'),
    );
    expect(computeContrastRatio('#FFFFFF', darker)).toBeGreaterThan(
      computeContrastRatio('#FFFFFF', '#6366F1'),
    );
  });

  it('evaluates strict WCAG 2.1 contrast without falsely rounding 4.47:1 up to AA PASS', () => {
    // #FFFFFF on #6366F1 is ~4.47:1 which is strictly below WCAG 2.1 AA 4.5:1
    const indigoCheck = evaluateStrictWcag('#FFFFFF', '#6366F1');
    expect(indigoCheck.ratio).toBeLessThan(4.5);
    expect(indigoCheck.passesAA).toBe(false);
    expect(indigoCheck.grade).toBe('AA-Large');

    const bwCheck = evaluateStrictWcag('#FFFFFF', '#000000');
    expect(bwCheck.ratio).toBe(21);
    expect(bwCheck.passesAA).toBe(true);
    expect(bwCheck.passesAAA).toBe(true);
    expect(bwCheck.grade).toBe('AAA');
  });

  it('flags real-world failing contrast pairs in Obsidian Pro & Cyber Emerald out of the box', () => {
    const obsidian = buildComponentVariantMatrix(
      getFlagshipThemeById('obsidian-pro'),
      'action-button',
    );
    expect(obsidian.failingCount).toBeGreaterThan(0);

    const destructiveCell = obsidian.cells.find(
      (c) => c.variant === 'destructive' && c.size === 'md' && c.state === 'default',
    )!;
    expect(destructiveCell.passesTarget).toBe(false);
    expect(destructiveCell.autoFix).not.toBeNull();
    expect(destructiveCell.autoFix!.fixedRatio).toBeGreaterThanOrEqual(4.5);

    const cyber = buildComponentVariantMatrix(
      getFlagshipThemeById('cyber-emerald'),
      'action-button',
    );
    const cyberPrimary = cyber.cells.find(
      (c) => c.variant === 'primary' && c.size === 'md' && c.state === 'default',
    )!;
    expect(cyberPrimary.passesTarget).toBe(false);
    expect(cyberPrimary.autoFix!.fixedRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('computeAccessibleColorFix returns already-compliant without mutating passing pairs', () => {
    const fix = computeAccessibleColorFix('#F8FAFC', '#0C0E14', 4.5);
    expect(fix.strategy).toBe('already-compliant');
    expect(fix.recommendedForegroundHex).toBe('#F8FAFC');
    expect(fix.recommendedBackgroundHex).toBe('#0C0E14');
    expect(fix.fixedRatio).toBeGreaterThan(15);
  });

  it('computeAccessibleColorFix lifts failing mid-tone brand fills to AA >= 4.5:1', () => {
    const indigoFix = computeAccessibleColorFix('#FFFFFF', '#6366F1', 4.5, true);
    expect(indigoFix.fixedRatio).toBeGreaterThanOrEqual(4.5);
    expect(
      computeContrastRatio(
        indigoFix.recommendedForegroundHex,
        indigoFix.recommendedBackgroundHex,
      ),
    ).toBeGreaterThanOrEqual(4.5);

    const roseFix = computeAccessibleColorFix('#FFFFFF', '#F43F5E', 4.5, true);
    expect(roseFix.fixedRatio).toBeGreaterThanOrEqual(4.5);
    expect(roseFix.fixedGrade === 'AA' || roseFix.fixedGrade === 'AAA').toBe(true);
  });

  it('computeAccessibleColorFix lifts failing low-contrast pairs to AAA >= 7.0:1', () => {
    const fix = computeAccessibleColorFix('#64748B', '#151924', 7.0, false);
    expect(fix.fixedRatio).toBeGreaterThanOrEqual(7.0);
    expect(fix.fixedGrade).toBe('AAA');
    expect(
      computeContrastRatio(fix.recommendedForegroundHex, fix.recommendedBackgroundHex),
    ).toBeGreaterThanOrEqual(7.0);
  });

  it('1-click single-cell Auto-Fix lifts a failing cell and sibling sizes to AA PASS', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const before = buildComponentVariantMatrix(obsidian, 'action-button');
    const failingCell = before.cells.find((c) => !c.passesTarget)!;
    expect(failingCell).toBeDefined();

    const overrides = buildAutoFixOverridesForCell(before, failingCell.id, {}, true);
    const after = buildComponentVariantMatrix(obsidian, 'action-button', { overrides });
    const fixedCell = after.cells.find((c) => c.id === failingCell.id)!;

    expect(fixedCell.passesTarget).toBe(true);
    expect(fixedCell.wcag.passesAA).toBe(true);
    expect(fixedCell.isOverridden).toBe(true);
    expect(after.passingCount).toBeGreaterThan(before.passingCount);
  });

  it('1-click Auto-Fix All lifts Obsidian Pro from failing cells to 100% WCAG AA across all 144 cells', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const before = buildAllPrimitivesVariantAudit(obsidian, { strictness: 'AA' });
    expect(before.failingCount).toBeGreaterThan(0);

    const { nextTokens, nextOverrides } = autoFixDesignSystemMatrix(obsidian, 'AA');
    const after = buildAllPrimitivesVariantAudit(nextTokens, {
      strictness: 'AA',
      overrides: nextOverrides,
    });

    expect(after.failingCount).toBe(0);
    expect(after.complianceScorePercent).toBe(100);
    expect(after.aaPassCount).toBe(144);
  });

  it('1-click Auto-Fix All lifts Swiss Editorial Light & Cyber Emerald to 100% WCAG AA across all 144 cells', () => {
    for (const themeId of ['swiss-editorial-light', 'cyber-emerald']) {
      const theme = getFlagshipThemeById(themeId);
      const { nextTokens, nextOverrides } = autoFixDesignSystemMatrix(theme, 'AA');
      const after = buildAllPrimitivesVariantAudit(nextTokens, {
        strictness: 'AA',
        overrides: nextOverrides,
      });

      expect(after.failingCount).toBe(0);
      expect(after.complianceScorePercent).toBe(100);
    }
  });

  it('1-click Auto-Fix All achieves 100% strict WCAG AAA (>= 7.0:1) across all 144 cells', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const { nextTokens, nextOverrides } = autoFixDesignSystemMatrix(obsidian, 'AAA');
    const after = buildAllPrimitivesVariantAudit(nextTokens, {
      strictness: 'AAA',
      overrides: nextOverrides,
    });

    expect(after.failingCount).toBe(0);
    expect(after.aaaPassCount).toBe(144);
    expect(after.complianceScorePercent).toBe(100);
  });

  it('synchronizes dynamically when Design Tokens (Accent, Radius, Border, Surface) mutate', () => {
    const base = getFlagshipThemeById('obsidian-pro');
    const mutated = {
      ...base,
      brandPrimary: '#2563EB',
      brandAccent: '#22D3EE',
      borderSubtle: '#3B4A6B',
      surfaceCard: '#111827',
      radiusBase: 20,
    };

    const matrix = buildComponentVariantMatrix(mutated, 'action-button');
    const primaryLg = matrix.cells.find(
      (c) => c.variant === 'primary' && c.size === 'lg' && c.state === 'default',
    )!;
    const secondaryMd = matrix.cells.find(
      (c) => c.variant === 'secondary' && c.size === 'md' && c.state === 'default',
    )!;
    const primaryFocus = matrix.cells.find(
      (c) => c.variant === 'primary' && c.size === 'md' && c.state === 'focus',
    )!;

    expect(primaryLg.style.backgroundHex).toBe('#2563EB');
    expect(primaryLg.style.radiusPx).toBe(20);
    expect(secondaryMd.style.borderHex).toBe('#3B4A6B');
    expect(primaryFocus.style.focusRingHex).toBe('#22D3EE');
  });

  it('scales component dimensions monotonically across SM -> MD -> LG', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const matrix = buildComponentVariantMatrix(obsidian, 'action-button');

    const sm = matrix.cells.find(
      (c) => c.variant === 'primary' && c.size === 'sm' && c.state === 'default',
    )!;
    const md = matrix.cells.find(
      (c) => c.variant === 'primary' && c.size === 'md' && c.state === 'default',
    )!;
    const lg = matrix.cells.find(
      (c) => c.variant === 'primary' && c.size === 'lg' && c.state === 'default',
    )!;

    expect(sm.style.heightPx).toBeLessThan(md.style.heightPx);
    expect(md.style.heightPx).toBeLessThan(lg.style.heightPx);
    expect(sm.style.fontSizePx).toBeLessThan(md.style.fontSizePx);
    expect(md.style.fontSizePx).toBeLessThan(lg.style.fontSizePx);
    expect(sm.style.radiusPx).toBeLessThan(md.style.radiusPx);
    expect(md.style.radiusPx).toBeLessThan(lg.style.radiusPx);
  });

  it('applies distinct focus ring shadows on focus state and danger ring on destructive focus', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const matrix = buildComponentVariantMatrix(obsidian, 'action-button');

    const primaryFocus = matrix.cells.find(
      (c) => c.variant === 'primary' && c.size === 'md' && c.state === 'focus',
    )!;
    const destructiveFocus = matrix.cells.find(
      (c) => c.variant === 'destructive' && c.size === 'md' && c.state === 'focus',
    )!;

    expect(primaryFocus.style.focusRingHex).toBe('#06B6D4');
    expect(primaryFocus.style.shadow).toContain('#06B6D4');
    expect(destructiveFocus.style.focusRingHex).toBe('#F43F5E');
    expect(destructiveFocus.style.shadow).toContain('#F43F5E');
  });

  it('generates production React 19 + Tailwind v4 CVA code for Action Button', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const matrix = buildComponentVariantMatrix(obsidian, 'action-button');
    const code = generateReactCvaSpecCode(obsidian, 'action-button', matrix);

    expect(code).toContain("import { cva, type VariantProps } from 'class-variance-authority';");
    expect(code).toContain('export const actionButtonVariants = cva(');
    expect(code).toContain('primary:');
    expect(code).toContain('secondary:');
    expect(code).toContain('ghost:');
    expect(code).toContain('destructive:');
    expect(code).toContain('sm:');
    expect(code).toContain('md:');
    expect(code).toContain('lg:');
    expect(code).toContain('export function AtelierActionButton(');
    expect(code).toContain('#6366F1');
  });

  it('generates production React 19 + Tailwind v4 CVA code for Status Badge and Metric Input', () => {
    const swiss = getFlagshipThemeById('swiss-editorial-light');
    const badgeMatrix = buildComponentVariantMatrix(swiss, 'status-badge');
    const badgeCode = generateReactCvaSpecCode(swiss, 'status-badge', badgeMatrix);
    expect(badgeCode).toContain('export const statusBadgeVariants = cva(');
    expect(badgeCode).toContain('rounded-full');
    expect(badgeCode).toContain('export function AtelierStatusBadge(');

    const inputMatrix = buildComponentVariantMatrix(swiss, 'metric-input');
    const inputCode = generateReactCvaSpecCode(swiss, 'metric-input', inputMatrix);
    expect(inputCode).toContain('export const metricInputVariants = cva(');
    expect(inputCode).toContain("Omit<ComponentProps<'input'>, 'size'>");
    expect(inputCode).toContain('export function AtelierMetricInput(');
  });

  it('generates production SwiftUI ButtonStyle code synced with live tokens & auto-fixed hexes', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const { nextTokens, nextOverrides } = autoFixDesignSystemMatrix(obsidian, 'AA');
    const fixedMatrix = buildComponentVariantMatrix(nextTokens, 'action-button', {
      strictness: 'AA',
      overrides: nextOverrides,
    });
    const swift = generateSwiftUiButtonStyleCode(nextTokens, fixedMatrix);

    expect(swift).toContain('import SwiftUI');
    expect(swift).toContain('public struct AtelierButtonStyle: ButtonStyle');
    expect(swift).toContain('case primary, secondary, ghost, destructive');
    expect(swift).toContain('case sm, md, lg');
    expect(swift).toContain('WCAG AA Score: 100%');
    expect(swift).toContain('func atelierButtonStyle(');
  });

  it('Low-Contrast Stress-Test preset injects detectable WCAG failures repaired cleanly by Auto-Fix', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const stress = createLowContrastStressTestTokens(obsidian);
    const before = buildAllPrimitivesVariantAudit(stress, { strictness: 'AA' });
    expect(before.failingCount).toBeGreaterThanOrEqual(20);
    expect(before.complianceScorePercent).toBeLessThan(85);

    const { nextTokens, nextOverrides } = autoFixDesignSystemMatrix(stress, 'AA');
    const after = buildAllPrimitivesVariantAudit(nextTokens, {
      strictness: 'AA',
      overrides: nextOverrides,
    });
    expect(after.failingCount).toBe(0);
    expect(after.complianceScorePercent).toBe(100);
  });

  it('exposes Variant Matrix and Daylight/Obsidian Canvas Backdrop actions in Command Palette', () => {
    const variantHits = filterCommands('variant matrix');
    expect(variantHits.some((c) => c.id === 'open-variant-matrix')).toBe(true);

    const backdropHits = filterCommands('daylight canvas');
    expect(backdropHits.some((c) => c.id === 'toggle-canvas-backdrop')).toBe(true);
  });

  it('updates generated CVA spec hexes immediately after single-cell Auto-Fix override', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const before = buildComponentVariantMatrix(obsidian, 'action-button');
    const primaryDefault = before.cells.find(
      (c) => c.variant === 'primary' && c.size === 'md' && c.state === 'default',
    )!;
    const overrides = buildAutoFixOverridesForCell(before, primaryDefault.id, {}, true);
    const after = buildComponentVariantMatrix(obsidian, 'action-button', { overrides });
    const fixedHex = after.cells.find((c) => c.id === primaryDefault.id)!.style.backgroundHex;

    const codeAfter = generateReactCvaSpecCode(obsidian, 'action-button', after);
    expect(codeAfter).toContain(fixedHex);
  });
});
