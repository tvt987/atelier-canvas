import { describe, expect, it } from 'vitest';
import {
  canvasToScreen,
  clampZoom,
  fitArtboardToViewport,
  getRulerTicks,
  screenToCanvas,
  zoomAtPoint,
} from '../viewport';
import { computeSnap } from '../snap';
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from '../history';
import {
  BRAND_TOKEN_THEMES,
  getTokenThemeById,
  resolveNodeStyle,
  tokensToW3CJson,
} from '../tokens';
import { createDocumentByTemplateId, TEMPLATE_PRESETS } from '../templates';
import {
  computeRedlineMeasurements,
  generatePureCss,
  generateReactTailwind,
} from '../codegen';
import {
  exportArtboardToStandaloneHtml,
  exportArtboardToSvg,
} from '../exporter';
import { AtelierCrdtRoom, syncTwoCrdtRooms } from '../collab';
import { createGeneratedNodesForCommand, filterCommands } from '../commands';
import {
  auditNodeContrast,
  autoFixContrastToAAA,
  computeContrastRatio,
  evaluateWcag,
} from '../wcag';
import {
  buildSvgPathData,
  normalizePathPoints,
  scalePathPoints,
} from '../bezier';
import { applyAutoLayoutToFrame } from '../autolayout';
import { ASSET_KIT_ITEMS, instantiateAssetKitItem } from '../assets';
import { createNodeFromTool, createPathNodeFromPoints } from '../nodeFactory';

describe('Viewport Coordinate & Ruler Engine', () => {
  it('round-trips screenToCanvas and canvasToScreen cleanly at arbitrary zoom', () => {
    const viewport = { x: 140, y: -60, zoom: 1.75 };
    const origin = { x: 48, y: 48 };
    const screenPt = { x: 412, y: 295 };

    const canvasPt = screenToCanvas(screenPt, origin, viewport);
    const back = canvasToScreen(canvasPt, origin, viewport);

    expect(back.x).toBeCloseTo(screenPt.x, 5);
    expect(back.y).toBeCloseTo(screenPt.y, 5);
  });

  it('preserves canvas anchor point when zooming around cursor', () => {
    const start = { x: 80, y: 40, zoom: 1 };
    const anchor = { x: 320, y: 240 };
    const before = screenToCanvas(anchor, { x: 0, y: 0 }, start);
    const zoomed = zoomAtPoint(start, 2, anchor);
    const after = screenToCanvas(anchor, { x: 0, y: 0 }, zoomed);

    expect(zoomed.zoom).toBe(2);
    expect(after.x).toBeCloseTo(before.x, 3);
    expect(after.y).toBeCloseTo(before.y, 3);
    expect(clampZoom(10)).toBe(3);
    expect(clampZoom(0.05)).toBe(0.25);
  });

  it('centers artboard gracefully inside stage viewport and generates ticks', () => {
    const vp = fitArtboardToViewport(
      { x: 0, y: 0, width: 860, height: 560 },
      { width: 1000, height: 700 },
      64,
    );
    expect(vp.zoom).toBeGreaterThanOrEqual(0.25);
    expect(vp.zoom).toBeLessThanOrEqual(1.12);
    expect(vp.x).toBeGreaterThan(0);
    expect(vp.y).toBeGreaterThan(0);

    const ticks = getRulerTicks(vp.x, vp.zoom, 1000);
    expect(ticks.length).toBeGreaterThan(10);
    expect(ticks.some((t) => t.major)).toBe(true);
  });
});

describe('Smart Snap Alignment Engine', () => {
  it('snaps within 6px threshold to artboard center and emits magenta guides', () => {
    const artboard = { x: 0, y: 0, width: 800, height: 600 };
    const result = computeSnap(
      { x: 353, y: 254, width: 100, height: 100 },
      [],
      artboard,
      6,
    );

    expect(result.x).toBe(350);
    expect(result.y).toBe(250);
    expect(result.guides.some((g) => g.orientation === 'vertical' && g.position === 400)).toBe(true);
    expect(result.guides.some((g) => g.orientation === 'horizontal' && g.position === 300)).toBe(true);
  });

  it('computes exact pixel spacing callout against aligned sibling layer', () => {
    const artboard = { x: 0, y: 0, width: 800, height: 600 };
    const sibling = { x: 40, y: 100, width: 200, height: 120 };
    const moving = { x: 264, y: 102, width: 180, height: 120 };

    const result = computeSnap(moving, [sibling], artboard, 6);
    expect(result.y).toBe(100);
    const spacingGuide = result.guides.find((g) => g.kind === 'spacing' && g.orientation === 'horizontal');
    expect(spacingGuide?.distanceLabel).toBe('24px');
  });
});

describe('Undo / Redo History Engine', () => {
  it('tracks immutable snapshots and supports undo/redo with branch reset', () => {
    let h = createHistory('v1', 50);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);

    h = pushHistory(h, 'v2');
    h = pushHistory(h, 'v3');
    expect(h.present).toBe('v3');
    expect(canUndo(h)).toBe(true);

    h = undoHistory(h);
    expect(h.present).toBe('v2');
    expect(canRedo(h)).toBe(true);

    h = redoHistory(h);
    expect(h.present).toBe('v3');

    h = undoHistory(h);
    h = pushHistory(h, 'v2-branch');
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe('v2-branch');
  });
});

describe('Design Token Engine & Brand Morphs', () => {
  it('resolves token-bound styles dynamically when switching brand theme', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const card = doc.nodes.find((n) => n.id === 'ft-balance-card')!;

    const obsidianStyle = resolveNodeStyle(card, getTokenThemeById('obsidian-electric'));
    const swissStyle = resolveNodeStyle(card, getTokenThemeById('swiss-vermilion'));
    const frostedStyle = resolveNodeStyle(card, getTokenThemeById('apple-frosted'));

    expect(obsidianStyle.radius).toBe(16);
    expect(swissStyle.radius).toBe(6);
    expect(frostedStyle.radius).toBe(20);
    expect(obsidianStyle.fill.color).not.toBe(frostedStyle.fill.color);

    const w3c = JSON.parse(tokensToW3CJson(BRAND_TOKEN_THEMES[1]));
    expect(w3c.color.brand.primary.$value).toBe('#E11D48');
    expect(w3c.dimension.radius.base.$value).toBe('6px');
  });

  it('provides all 4 curated templates with rich non-empty artboards', () => {
    expect(TEMPLATE_PRESETS.length).toBe(4);
    for (const preset of TEMPLATE_PRESETS) {
      const doc = preset.createDocument();
      expect(doc.nodes.length).toBeGreaterThanOrEqual(10);
      expect(doc.artboard.width).toBeGreaterThanOrEqual(600);
    }
  });
});

describe('WCAG 2.1 Contrast Luminance & AAA Auto-Fix Engine', () => {
  it('calculates exact WCAG 2.1 contrast ratios and grades cleanly', () => {
    expect(computeContrastRatio('#FFFFFF', '#000000')).toBe(21);
    expect(evaluateWcag('#FFFFFF', '#0C0E14').grade).toBe('AAA');
    expect(evaluateWcag('#334155', '#1E293B').passesAA).toBe(false);
    expect(evaluateWcag('#334155', '#1E293B').grade).toBe('FAIL');
  });

  it('auto-fixes failing contrast to >= 7.0:1 AAA on both dark and light surfaces', () => {
    const fixedOnDark = autoFixContrastToAAA('#2E3440', '#0F172A');
    expect(computeContrastRatio(fixedOnDark, '#0F172A')).toBeGreaterThanOrEqual(7);

    const fixedOnLight = autoFixContrastToAAA('#CBD5E1', '#F8FAFC');
    expect(computeContrastRatio(fixedOnLight, '#F8FAFC')).toBeGreaterThanOrEqual(7);

    const doc = createDocumentByTemplateId('fintech-spatial');
    const balanceVal = doc.nodes.find((n) => n.id === 'ft-balance-value')!;
    const audit = auditNodeContrast(balanceVal, doc);
    expect(audit?.passesAAA).toBe(true);
  });
});

describe('Vector Bezier Pen & SVG Path Engine', () => {
  it('builds smooth cubic Bezier SVG path strings and serializes into SVG export', () => {
    const raw = [
      { x: 100, y: 200 },
      { x: 180, y: 140 },
      { x: 260, y: 220 },
      { x: 340, y: 120 },
    ];
    const norm = normalizePathPoints(raw, 10);
    expect(norm.x).toBe(90);
    expect(norm.y).toBe(110);
    expect(norm.points.length).toBe(4);

    const smoothD = buildSvgPathData(norm.points, true, false);
    expect(smoothD).toContain('M ');
    expect(smoothD).toContain(' C ');

    const scaled = scalePathPoints(norm.points, norm.width, norm.height, norm.width * 2, norm.height * 2);
    expect(scaled[0].x).toBeCloseTo(norm.points[0].x * 2, 1);

    const doc = createDocumentByTemplateId('fintech-spatial');
    const pathNode = createPathNodeFromPoints(raw, doc.tokens);
    const svg = exportArtboardToSvg({ ...doc, nodes: [...doc.nodes, pathNode] });
    expect(svg).toContain('<path d="M ');
    expect(svg).toContain('marker-end="url(#atelier-arrow)"');
  });
});

describe('Auto-Layout Flex Container Reflow Engine', () => {
  it('arranges contained child nodes cleanly in row and column directions with exact gap and padding', () => {
    const tokens = getTokenThemeById('obsidian-electric');
    const frame = createNodeFromTool('frame', 50, 50, 320, 140, tokens);
    const c1 = createNodeFromTool('rect', 80, 90, 80, 40, tokens);
    const c2 = createNodeFromTool('rect', 210, 70, 90, 60, tokens);

    const rowNodes = applyAutoLayoutToFrame(frame.id, [frame, c1, c2], {
      enabled: true,
      direction: 'row',
      gap: 16,
      padding: 20,
      align: 'center',
    });

    const r1 = rowNodes.find((n) => n.id === c1.id)!;
    const r2 = rowNodes.find((n) => n.id === c2.id)!;
    expect(r1.x).toBe(70);
    expect(r2.x).toBe(70 + 80 + 16);

    const colNodes = applyAutoLayoutToFrame(frame.id, rowNodes, {
      enabled: true,
      direction: 'column',
      gap: 12,
      padding: 16,
      align: 'start',
    });
    const fCol = colNodes.find((n) => n.id === frame.id)!;
    const k1 = colNodes.find((n) => n.id === c1.id)!;
    const k2 = colNodes.find((n) => n.id === c2.id)!;
    expect(k1.x).toBe(66);
    expect(k2.x).toBe(66);
    expect(Math.abs(k2.y - k1.y)).toBeGreaterThanOrEqual(40 + 12);
    expect(fCol.height).toBeGreaterThanOrEqual(40 + 60 + 12 + 32);
  });
});

describe('Dev Mode Framer Motion Codegen, Redlines & Standalone HTML Export', () => {
  it('emits Framer Motion motion.button props and CSS keyframes for animated nodes', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const cta = doc.nodes.find((n) => n.id === 'ft-cta-transfer')!;

    const singleJsx = generateReactTailwind(doc, cta);
    expect(singleJsx).toContain("import { motion } from 'framer-motion';");
    expect(singleJsx).toContain('export function PrimaryTransferCTA()');
    expect(singleJsx).toContain('<motion.button');
    expect(singleJsx).toContain('whileHover=');
    expect(singleJsx).toContain('Instant Transfer');

    const css = generatePureCss(doc, cta);
    expect(css).toContain('--brand-primary:');
    expect(css).toContain('@keyframes atelier-spring-scale');
    expect(css).toContain(':hover');

    const redlines = computeRedlineMeasurements(cta, doc.artboard);
    expect(redlines.left).toBe(cta.x);
    expect(redlines.top).toBe(cta.y);
  });

  it('exports valid standalone interactive animated HTML bundle', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const html = exportArtboardToStandaloneHtml(doc);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('@keyframes at-fade-up');
    expect(html).toContain('$284,920.40');
    expect(html).toContain('data-toast=');
    expect(html).toContain('</html>');
  });
});

describe('Pro UI Assets Kit, Yjs CRDT Sync & Generative Commands', () => {
  it('instantiates all 10 Pro UI Component Kit assets cleanly bound to live tokens', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    expect(ASSET_KIT_ITEMS.length).toBe(10);

    for (const item of ASSET_KIT_ITEMS) {
      const nodes = instantiateAssetKitItem(item.id, doc);
      expect(nodes.length).toBeGreaterThanOrEqual(1);
    }

    const kpi = instantiateAssetKitItem('kpi-sparkline', doc);
    expect(kpi.some((n) => n.type === 'path' && n.pathData && n.pathData.points.length >= 4)).toBe(true);
  });

  it('converges two independent Yjs CRDT rooms cleanly without conflict', () => {
    const initial = createDocumentByTemplateId('fintech-spatial');
    const roomA = new AtelierCrdtRoom(initial, 'test-room-a');
    const roomB = new AtelierCrdtRoom(undefined, 'test-room-b');

    const updated = {
      ...initial,
      artboard: { ...initial.artboard, name: 'Synced FinTech Board v2' },
    };
    roomA.pushLocalDocument(updated);
    syncTwoCrdtRooms(roomA, roomB);

    const stateB = roomB.readState();
    expect(stateB?.artboard.name).toBe('Synced FinTech Board v2');
    expect(stateB?.nodes.length).toBe(initial.nodes.length);

    roomA.destroy();
    roomB.destroy();
  });

  it('filters CMD+K queries and generates glass pricing card composition', () => {
    const matches = filterCommands('glass pricing');
    expect(matches[0]?.id).toBe('gen-glass-pricing');

    const doc = createDocumentByTemplateId('fintech-spatial');
    const created = createGeneratedNodesForCommand('gen-glass-pricing', doc);
    expect(created.length).toBe(5);
    expect(created[0].type).toBe('glass');
    expect(created[0].blur).toBeGreaterThanOrEqual(16);
  });
});
