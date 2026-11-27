import { describe, expect, it } from 'vitest';
import {
  applyDesignTokenTheme,
  buildRadiusScale,
  buildShadowElevations,
  buildSpacingGrid,
  buildTypographyScale,
  exportCssCustomProperties,
  exportW3CDesignTokensJson,
  FLAGSHIP_V4_THEMES,
  getFlagshipThemeById,
  hydrateDesignTokens,
  updateTokenSpacingUnit,
  updateTokenTypography,
} from '../designTokens';
import {
  BREAKPOINT_PRESETS,
  computeBreakpointColumnRects,
  getBreakpointPreset,
  resolveBreakpointArtboardBounds,
  snapCoordinateToGrid,
} from '../responsive';
import { computeSnap } from '../snap';
import {
  applyAutoLayoutToArtboard,
  applyAutoLayoutToFrame,
  generateAutoLayoutCss,
  generateAutoLayoutTailwind,
} from '../autolayout';
import {
  generateCleanSvg,
  generatePureCss,
  generateReactTailwind,
  generateTokensJson,
} from '../codegen';
import {
  buildEnterpriseVietQrUrl,
  ENTERPRISE_LICENSE_CONFIG,
  validateEnterpriseLicenseKey,
} from '../enterpriseLicense';
import { createDocumentByTemplateId } from '../templates';
import { createNodeFromTool } from '../nodeFactory';
import { getTokenThemeById } from '../tokens';
import { filterCommands, resolveThemeCommand } from '../commands';
import { serializeProjectFile, parseAndValidateProjectFile } from '../projectStorage';

describe('v4.0 Design Token Variables & Theme System Engine', () => {
  it('exposes the 3 flagship themes: Obsidian Pro, Swiss Editorial Light, Cyber Emerald', () => {
    expect(FLAGSHIP_V4_THEMES.map((t) => t.name)).toEqual([
      'Obsidian Pro',
      'Swiss Editorial Light',
      'Cyber Emerald',
    ]);
    for (const theme of FLAGSHIP_V4_THEMES) {
      expect(theme.primitives).toBeDefined();
      expect(theme.typographyScale).toBeDefined();
      expect(theme.spacingGrid).toBeDefined();
      expect(theme.radii).toBeDefined();
      expect(theme.shadows).toBeDefined();
    }
  });

  it('computes 8px and 4px spacing grids accurately and clamps invalid units', () => {
    const g8 = buildSpacingGrid(8);
    expect(g8).toEqual({
      unit: 8,
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      '2xl': 48,
      '3xl': 64,
    });

    const g4 = buildSpacingGrid(4);
    expect(g4.xs).toBe(2);
    expect(g4.sm).toBe(4);
    expect(g4.md).toBe(8);
    expect(g4['3xl']).toBe(32);

    expect(buildSpacingGrid(0).unit).toBe(2);
    expect(buildSpacingGrid(99).unit).toBe(16);
  });

  it('derives border radius scale tokens from base radius', () => {
    const scale = buildRadiusScale(16);
    expect(scale).toEqual({
      none: 0,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      full: 9999,
    });
    expect(buildRadiusScale(0).none).toBe(0);
  });

  it('builds shadow elevation tokens with brand primary RGBA neon glow', () => {
    const shadows = buildShadowElevations('#10B981');
    expect(shadows.none).toBe('none');
    expect(shadows.subtle).toContain('rgba(0, 0, 0');
    expect(shadows.elevated).toContain('rgba(0, 0, 0');
    expect(shadows.floating).toContain('rgba(0, 0, 0');
    expect(shadows.neon).toContain('rgba(16, 185, 129, 0.38)');
  });

  it('builds all 7 typography scale roles cleanly', () => {
    const typo = buildTypographyScale('Cormorant Garamond', 'Inter', 'JetBrains Mono');
    expect(Object.keys(typo)).toEqual([
      'display',
      'h1',
      'h2',
      'h3',
      'body',
      'caption',
      'mono',
    ]);
    expect(typo.display.fontFamily).toBe('Cormorant Garamond');
    expect(typo.display.fontSize).toBe(48);
    expect(typo.mono.fontFamily).toBe('JetBrains Mono');
  });

  it('hydrates legacy minimal token definitions into full v4 DesignTokenSystem', () => {
    const legacy = getTokenThemeById('tokyo-bauhaus');
    const hydrated = hydrateDesignTokens(legacy);
    expect(hydrated.spacingGrid.unit).toBe(8);
    expect(hydrated.radii.md).toBe(4);
    expect(hydrated.typographyScale.body.fontSize).toBe(14);
    expect(hydrated.primitives.brand500).toBe(legacy.brandPrimary);
  });

  it('updates spacing base unit cleanly via updateTokenSpacingUnit', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const next = updateTokenSpacingUnit(obsidian, 4);
    expect(next.spacingUnit).toBe(4);
    expect(next.spacingGrid?.md).toBe(8);
    expect(next.spacingGrid?.xl).toBe(16);
  });

  it('updates individual typography scale tokens without mutating siblings', () => {
    const obsidian = getFlagshipThemeById('obsidian-pro');
    const updated = updateTokenTypography(obsidian, 'h1', {
      fontSize: 36,
      fontFamily: 'Cormorant Garamond',
    });
    expect(updated.typographyScale?.h1.fontSize).toBe(36);
    expect(updated.typographyScale?.h1.fontFamily).toBe('Cormorant Garamond');
    expect(updated.typographyScale?.body.fontSize).toBe(14);
  });

  it('dynamically re-skins all token-bound nodes and artboards across all 3 flagship themes', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const lightDoc = applyDesignTokenTheme(doc, 'swiss-editorial-light');
    expect(lightDoc.tokens.name).toBe('Swiss Editorial Light');
    expect(lightDoc.artboard.background.color).toBe('#F6F5F0');
    const lightCard = lightDoc.nodes.find((n) => n.id === 'ft-balance-card')!;
    expect(lightCard.fill.color).toBe('#FFFFFF');
    expect(lightCard.radius).toBe(6);

    const cyberDoc = applyDesignTokenTheme(lightDoc, 'cyber-emerald');
    expect(cyberDoc.tokens.name).toBe('Cyber Emerald');
    expect(cyberDoc.artboard.background.color).toBe('#06110F');
    const cyberCta = cyberDoc.nodes.find((n) => n.id === 'ft-cta-transfer')!;
    expect(cyberCta.fill.color).toBe('#10B981');
    expect(cyberCta.fill.gradient?.to).toBe('#2DD4BF');
  });

  it('preserves custom unbound node fills when switching themes', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const customNode = {
      ...createNodeFromTool('rect', 40, 40, 120, 80, doc.tokens),
      fill: { kind: 'solid' as const, color: '#FF00AA' },
      tokenBinding: undefined,
    };
    const nextDoc = applyDesignTokenTheme(
      { ...doc, nodes: [...doc.nodes, customNode] },
      'cyber-emerald',
    );
    const preserved = nextDoc.nodes.find((n) => n.id === customNode.id)!;
    expect(preserved.fill.color).toBe('#FF00AA');
  });

  it('exports full W3C Design Tokens JSON with primitives, typography, spacing, radii & shadows', () => {
    const cyber = getFlagshipThemeById('cyber-emerald');
    const json = JSON.parse(exportW3CDesignTokensJson(cyber));
    expect(json.$schema).toBe('https://design-tokens.org/schemas/v1/tokens.json');
    expect(json.atelierTheme.version.$value).toBe('4.0.0');
    expect(json.primitive.color.brand500.$value).toBe('#10B981');
    expect(json.color.brand.accent.$value).toBe('#2DD4BF');
    expect(json.typography.display.$type).toBe('typography');
    expect(json.spacing.md.$value).toBe('16px');
    expect(json.borderRadius.lg.$value).toBe('18px');
    expect(json.shadow.elevated.$type).toBe('shadow');
  });

  it('exports complete CSS Custom Properties for all design token categories', () => {
    const swiss = getFlagshipThemeById('swiss-editorial-light');
    const css = exportCssCustomProperties(swiss);
    expect(css).toContain(':root {');
    expect(css).toContain('--brand-primary: #E11D48;');
    expect(css).toContain('--surface-canvas: #F6F5F0;');
    expect(css).toContain("--font-display: 'Cormorant Garamond'");
    expect(css).toContain('--space-md: 16px;');
    expect(css).toContain('--radius-base: 6px;');
    expect(css).toContain('--shadow-floating:');
  });
});

describe('v4.0 Responsive Breakpoints, Smart Guides & 8px Snap Grid Engine', () => {
  it('defines Desktop 1440px, Tablet 768px, Mobile 390px and Fluid Fit presets', () => {
    expect(BREAKPOINT_PRESETS.map((b) => b.id)).toEqual([
      'fluid',
      'desktop',
      'tablet',
      'mobile',
    ]);
    expect(getBreakpointPreset('desktop').width).toBe(1440);
    expect(getBreakpointPreset('tablet').width).toBe(768);
    expect(getBreakpointPreset('mobile').width).toBe(390);
    expect(getBreakpointPreset('fluid').width).toBeNull();
  });

  it('computes responsive column grid tracks within margins for each breakpoint', () => {
    const desktopCols = computeBreakpointColumnRects(1440, getBreakpointPreset('desktop'));
    const tabletCols = computeBreakpointColumnRects(768, getBreakpointPreset('tablet'));
    const mobileCols = computeBreakpointColumnRects(390, getBreakpointPreset('mobile'));

    expect(desktopCols.length).toBe(12);
    expect(tabletCols.length).toBe(8);
    expect(mobileCols.length).toBe(4);
    expect(desktopCols[0].x).toBe(48);
    expect(mobileCols[0].x).toBe(20);
    const lastMobile = mobileCols[mobileCols.length - 1];
    expect(lastMobile.x + lastMobile.width).toBeLessThanOrEqual(374);
  });

  it('resolves breakpoint artboard bounds cleanly for fluid vs fixed widths', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    expect(resolveBreakpointArtboardBounds(doc.artboard, 'fluid').width).toBe(
      doc.artboard.width,
    );
    expect(resolveBreakpointArtboardBounds(doc.artboard, 'tablet').width).toBe(768);
    expect(resolveBreakpointArtboardBounds(doc.artboard, 'mobile').width).toBe(390);
  });

  it('snaps coordinates to exact 8px baseline grid increments', () => {
    expect(snapCoordinateToGrid(13, 8)).toBe(16);
    expect(snapCoordinateToGrid(11, 8)).toBe(8);
    expect(snapCoordinateToGrid(24, 8)).toBe(24);
    expect(snapCoordinateToGrid(-5, 8)).toBe(-8);
  });

  it('snaps moving elements to 8px grid when gridSize is enabled and no guide matches', () => {
    const artboard = { x: 0, y: 0, width: 1000, height: 800 };
    const result = computeSnap(
      { x: 115, y: 203, width: 100, height: 60 },
      [],
      artboard,
      { threshold: 6, gridSize: 8, smartGuidesEnabled: true },
    );
    expect(result.x).toBe(112);
    expect(result.y).toBe(200);
  });

  it('suppresses alignment guides when smartGuidesEnabled is false while honoring 8px grid', () => {
    const artboard = { x: 0, y: 0, width: 800, height: 600 };
    const result = computeSnap(
      { x: 353, y: 254, width: 100, height: 100 },
      [],
      artboard,
      { threshold: 6, gridSize: 8, smartGuidesEnabled: false },
    );
    expect(result.guides.length).toBe(0);
    expect(result.x).toBe(352);
    expect(result.y).toBe(256);
  });

  it('prioritizes alignment guides within threshold even when 8px grid is active', () => {
    const artboard = { x: 0, y: 0, width: 800, height: 600 };
    const result = computeSnap(
      { x: 353, y: 254, width: 100, height: 100 },
      [],
      artboard,
      { threshold: 6, gridSize: 8, smartGuidesEnabled: true },
    );
    expect(result.x).toBe(350);
    expect(result.y).toBe(250);
    expect(result.guides.length).toBeGreaterThanOrEqual(2);
  });
});

describe('v4.0 CSS Flexbox & CSS Grid Auto-Layout Engine', () => {
  it('supports Flexbox justify-content center, end, and space-between', () => {
    const tokens = getFlagshipThemeById('obsidian-pro');
    const frame = createNodeFromTool('frame', 0, 0, 400, 120, tokens);
    const a = createNodeFromTool('rect', 20, 20, 60, 40, tokens);
    const b = createNodeFromTool('rect', 120, 20, 60, 40, tokens);

    const centered = applyAutoLayoutToFrame(frame.id, [frame, a, b], {
      enabled: true,
      layoutMode: 'flex',
      direction: 'row',
      gap: 20,
      padding: 20,
      align: 'center',
      justify: 'center',
    });
    const ca = centered.find((n) => n.id === a.id)!;
    const cb = centered.find((n) => n.id === b.id)!;
    // Inner width = 360, children + gap = 140, free = 220 -> offset 110 -> x = 20 + 110 = 130
    expect(ca.x).toBe(130);
    expect(cb.x).toBe(210);

    const between = applyAutoLayoutToFrame(frame.id, [frame, a, b], {
      enabled: true,
      layoutMode: 'flex',
      direction: 'row',
      gap: 20,
      padding: 20,
      align: 'center',
      justify: 'between',
    });
    const ba = between.find((n) => n.id === a.id)!;
    const bb = between.find((n) => n.id === b.id)!;
    expect(ba.x).toBe(20);
    expect(bb.x).toBe(400 - 20 - 60);
  });

  it('supports Flexbox align-items stretch along cross axis', () => {
    const tokens = getFlagshipThemeById('obsidian-pro');
    const frame = createNodeFromTool('frame', 0, 0, 320, 140, tokens);
    const child = createNodeFromTool('rect', 40, 40, 80, 40, tokens);

    const stretched = applyAutoLayoutToFrame(frame.id, [frame, child], {
      enabled: true,
      layoutMode: 'flex',
      direction: 'row',
      gap: 12,
      padding: 20,
      align: 'stretch',
      justify: 'start',
    });
    const nextChild = stretched.find((n) => n.id === child.id)!;
    expect(nextChild.height).toBe(100);
    expect(nextChild.y).toBe(20);
  });

  it('reflows children into multi-column CSS Grid layout cleanly', () => {
    const tokens = getFlagshipThemeById('obsidian-pro');
    const frame = createNodeFromTool('frame', 0, 0, 400, 300, tokens);
    const c1 = createNodeFromTool('rect', 20, 20, 100, 60, tokens);
    const c2 = createNodeFromTool('rect', 140, 20, 100, 60, tokens);
    const c3 = createNodeFromTool('rect', 20, 110, 100, 60, tokens);
    const c4 = createNodeFromTool('rect', 140, 110, 100, 60, tokens);

    const gridded = applyAutoLayoutToFrame(frame.id, [frame, c1, c2, c3, c4], {
      enabled: true,
      layoutMode: 'grid',
      direction: 'row',
      columns: 2,
      gap: 16,
      padding: 20,
      align: 'start',
    });
    const r1 = gridded.find((n) => n.id === c1.id)!;
    const r2 = gridded.find((n) => n.id === c2.id)!;
    const r3 = gridded.find((n) => n.id === c3.id)!;
    const r4 = gridded.find((n) => n.id === c4.id)!;

    expect(r1.x).toBe(20);
    expect(r1.y).toBe(20);
    expect(r2.y).toBe(20);
    expect(r2.x).toBeGreaterThan(r1.x);
    expect(r3.x).toBe(20);
    expect(r3.y).toBe(20 + 60 + 16);
    expect(r4.y).toBe(r3.y);
  });

  it('applies Artboard Auto-Layout to structural cards while preserving inner children', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const { artboard, nodes } = applyAutoLayoutToArtboard(
      doc.artboard,
      doc.nodes,
      {
        enabled: true,
        layoutMode: 'grid',
        direction: 'row',
        columns: 2,
        gap: 24,
        padding: 32,
        align: 'start',
      },
      doc.artboard.id,
    );
    expect(artboard.autoLayout?.enabled).toBe(true);
    expect(artboard.autoLayout?.layoutMode).toBe('grid');
    expect(nodes.length).toBe(doc.nodes.length);
  });

  it('generates production Flexbox and CSS Grid CSS & Tailwind v4 classes', () => {
    const flexCss = generateAutoLayoutCss({
      enabled: true,
      layoutMode: 'flex',
      direction: 'row',
      gap: 16,
      padding: 24,
      align: 'center',
      justify: 'between',
    });
    expect(flexCss).toContain('display: flex;');
    expect(flexCss).toContain('justify-content: space-between;');
    expect(flexCss).toContain('gap: 16px;');

    const gridCss = generateAutoLayoutCss({
      enabled: true,
      layoutMode: 'grid',
      direction: 'row',
      columns: 3,
      gap: 20,
      padding: 16,
      align: 'stretch',
    });
    expect(gridCss).toContain('display: grid;');
    expect(gridCss).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');

    const gridTw = generateAutoLayoutTailwind({
      enabled: true,
      layoutMode: 'grid',
      direction: 'row',
      columns: 3,
      gap: 20,
      padding: 16,
      align: 'center',
    });
    expect(gridTw).toBe('grid grid-cols-3 gap-[20px] p-[16px] items-center');
  });
});

describe('v4.0 Production Codegen, Clean SVG, Prototype Hotspots & Commands', () => {
  it('emits v4 React+Tailwind codegen with Auto-Layout Flex/Grid classes on frames', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const frame = {
      ...createNodeFromTool('frame', 40, 40, 320, 120, doc.tokens),
      autoLayout: {
        enabled: true,
        layoutMode: 'grid' as const,
        direction: 'row' as const,
        columns: 2,
        gap: 16,
        padding: 20,
        align: 'center' as const,
      },
    };
    const jsx = generateReactTailwind(doc, frame);
    expect(jsx).toContain('Atelier Canvas Pro v4.0');
    expect(jsx).toContain('grid grid-cols-2 gap-[16px] p-[20px] items-center');
  });

  it('emits full CSS Custom Properties & Auto-Layout rules in generatePureCss', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const css = generatePureCss(doc);
    expect(css).toContain('--brand-primary:');
    expect(css).toContain('--space-md: 16px;');
    expect(css).toContain('--shadow-elevated:');
    expect(css).toContain('.atelier-artboard');
  });

  it('generates clean standalone SVG for both whole artboard and individual node', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const fullSvg = generateCleanSvg(doc);
    expect(fullSvg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(fullSvg).toContain('</svg>');

    const cta = doc.nodes.find((n) => n.id === 'ft-cta-transfer')!;
    const nodeSvg = generateCleanSvg(doc, cta);
    expect(nodeSvg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(nodeSvg).toContain('Instant Transfer');
  });

  it('generates W3C tokens JSON with full v4 schema via generateTokensJson', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const parsed = JSON.parse(generateTokensJson(doc.tokens));
    expect(parsed.typography.h1.$value.fontSize).toBe('32px');
    expect(parsed.spacing.lg.$value).toBe('24px');
  });

  it('wires both Smart Animate navigation and Modal Overlay hotspots in default template', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const transfer = doc.nodes.find((n) => n.id === 'ft-cta-transfer')!;
    const controls = doc.nodes.find((n) => n.id === 'ft-strip-btn')!;
    expect(transfer.prototype?.transition).toBe('smart-animate');
    expect(controls.prototype?.clickAction).toBe('modal_overlay');
    expect(controls.prototype?.targetArtboardId).toBe('artboard-checkout');
  });

  it('resolves v4 flagship themes, Enterprise License command & v4.0 project serialization', () => {
    expect(resolveThemeCommand('theme-cyber-emerald')?.name).toBe('Cyber Emerald');
    expect(resolveThemeCommand('theme-swiss-editorial-light')?.name).toBe(
      'Swiss Editorial Light',
    );
    expect(filterCommands('vietqr')[0]?.id).toBe('enterprise-license');

    const doc = createDocumentByTemplateId('fintech-spatial');
    const json = serializeProjectFile(doc);
    expect(json).toContain('"version": "4.0"');
    const restored = parseAndValidateProjectFile(json);
    expect(restored.ok).toBe(true);
  });
});

describe('v4.0 Enterprise Studio License & MBBank VietQR Engine', () => {
  it('configures exact MBBank 970422, account 0325456574, TRUONG VAN TINH & 13.900.000 VND', () => {
    expect(ENTERPRISE_LICENSE_CONFIG.bankBin).toBe('970422');
    expect(ENTERPRISE_LICENSE_CONFIG.bankName).toBe('MBBank');
    expect(ENTERPRISE_LICENSE_CONFIG.accountNumber).toBe('0325456574');
    expect(ENTERPRISE_LICENSE_CONFIG.accountHolder).toBe('TRUONG VAN TINH');
    expect(ENTERPRISE_LICENSE_CONFIG.priceVnd).toBe(13_900_000);
    expect(ENTERPRISE_LICENSE_CONFIG.priceDisplay).toBe('13.900.000 VND');
  });

  it('builds exact MBBank VietQR compact2 image URL with pre-filled amount and memo', () => {
    const url = buildEnterpriseVietQrUrl();
    expect(url.startsWith('https://img.vietqr.io/image/970422-0325456574-compact2.png?')).toBe(
      true,
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get('amount')).toBe('13900000');
    expect(parsed.searchParams.get('accountName')).toBe('TRUONG VAN TINH');
    expect(parsed.searchParams.get('addInfo')).toBe('ATELIER CANVAS V4 PRO');
  });

  it('supports custom VietQR template and transfer memo overrides', () => {
    const customUrl = buildEnterpriseVietQrUrl({
      template: 'qr_only',
      addInfo: 'TVT STUDIO TEAM SEAT',
      amount: 27_800_000,
    });
    expect(customUrl).toContain('970422-0325456574-qr_only.png');
    expect(customUrl).toContain('amount=27800000');
    expect(customUrl).toContain('TVT+STUDIO+TEAM+SEAT');
  });

  it('validates Enterprise License Key syntax strictly and normalizes case', () => {
    expect(validateEnterpriseLicenseKey('tvt-acv4-2026-pro1')).toEqual({
      valid: true,
      normalized: 'TVT-ACV4-2026-PRO1',
    });
    expect(validateEnterpriseLicenseKey('').valid).toBe(false);
    expect(validateEnterpriseLicenseKey('INVALID-KEY').valid).toBe(false);
  });
});
