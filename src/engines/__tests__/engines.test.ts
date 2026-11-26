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
import { exportArtboardToSvg } from '../exporter';
import { AtelierCrdtRoom, syncTwoCrdtRooms } from '../collab';
import { createGeneratedNodesForCommand, filterCommands } from '../commands';

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
    // Moving box width=100 -> center is at 353+50 = 403 (3px off artboard center 400)
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

describe('Dev Mode React/Tailwind v4 Codegen & Redlines', () => {
  it('generates clean React 19 + Tailwind v4 JSX and Pure CSS for single layer and artboard', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const cta = doc.nodes.find((n) => n.id === 'ft-cta-transfer')!;

    const singleJsx = generateReactTailwind(doc, cta);
    expect(singleJsx).toContain('export function PrimaryTransferCTA()');
    expect(singleJsx).toContain('<button');
    expect(singleJsx).toContain('Instant Transfer');
    expect(singleJsx).toContain(`w-[${cta.width}px]`);

    const fullJsx = generateReactTailwind(doc);
    expect(fullJsx).toContain('export function SpatialFinTechAppUI()');
    expect(fullJsx).toContain('<section');
    expect(fullJsx).toContain('$284,920.40');

    const css = generatePureCss(doc, cta);
    expect(css).toContain('--brand-primary:');
    expect(css).toContain(`width: ${cta.width}px;`);

    const redlines = computeRedlineMeasurements(cta, doc.artboard);
    expect(redlines.left).toBe(cta.x);
    expect(redlines.top).toBe(cta.y);
    expect(redlines.right).toBe(doc.artboard.width - (cta.x + cta.width));
    expect(redlines.bottom).toBe(doc.artboard.height - (cta.y + cta.height));
  });
});

describe('Vector SVG Exporter', () => {
  it('serializes artboard into valid standalone SVG with gradients, clipPath, and text', () => {
    const doc = createDocumentByTemplateId('fintech-spatial');
    const svg = exportArtboardToSvg(doc);

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain(`viewBox="0 0 ${doc.artboard.width} ${doc.artboard.height}"`);
    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('<clipPath id="artboard-clip">');
    expect(svg).toContain('$284,920.40');
    expect(svg).toContain('</svg>');
  });
});

describe('Yjs CRDT Multiplayer Sync & Generative Commands', () => {
  it('converges two independent Yjs CRDT rooms cleanly without conflict', () => {
    const initial = createDocumentByTemplateId('fintech-spatial');
    const roomA = new AtelierCrdtRoom(initial, 'test-room-a');
    const roomB = new AtelierCrdtRoom(undefined, 'test-room-b');

    const updated = {
      ...initial,
      artboard: { ...initial.artboard, name: 'Synced FinTech Board' },
    };
    roomA.pushLocalDocument(updated);
    syncTwoCrdtRooms(roomA, roomB);

    const stateB = roomB.readState();
    expect(stateB?.artboard.name).toBe('Synced FinTech Board');
    expect(stateB?.nodes.length).toBe(initial.nodes.length);

    roomA.destroy();
    roomB.destroy();
  });

  it('filters CMD+K queries and generates glass pricing card composition', () => {
    const matches = filterCommands('glass pricing');
    expect(matches[0]?.id).toBe('gen-glass-pricing');

    const doc = createDocumentByTemplateId('fintech-spatial');
    const created = createGeneratedNodesForCommand('gen-glass-pricing', doc);
    expect(created.length).toBe(4);
    expect(created[0].type).toBe('glass');
    expect(created[0].blur).toBeGreaterThanOrEqual(16);
  });
});
