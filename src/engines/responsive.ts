import type { Artboard, Bounds, ViewportBreakpoint } from '../types/canvas';

export interface BreakpointPreset {
  id: ViewportBreakpoint;
  label: string;
  shortLabel: string;
  width: number | null;
  columns: number;
  gutter: number;
  margin: number;
  description: string;
}

export const BREAKPOINT_PRESETS: BreakpointPreset[] = [
  {
    id: 'fluid',
    label: 'Fluid Fit',
    shortLabel: 'Fluid',
    width: null,
    columns: 12,
    gutter: 24,
    margin: 36,
    description: 'Fit all artboards seamlessly to viewport',
  },
  {
    id: 'desktop',
    label: 'Desktop 1440px',
    shortLabel: '1440',
    width: 1440,
    columns: 12,
    gutter: 24,
    margin: 48,
    description: '1440px Widescreen · 12-column editorial grid',
  },
  {
    id: 'tablet',
    label: 'Tablet 768px',
    shortLabel: '768',
    width: 768,
    columns: 8,
    gutter: 20,
    margin: 32,
    description: '768px iPad / Tablet · 8-column adaptive grid',
  },
  {
    id: 'mobile',
    label: 'Mobile 390px',
    shortLabel: '390',
    width: 390,
    columns: 4,
    gutter: 16,
    margin: 20,
    description: '390px iPhone Pro · 4-column mobile stack',
  },
];

export function getBreakpointPreset(id: ViewportBreakpoint): BreakpointPreset {
  return BREAKPOINT_PRESETS.find((p) => p.id === id) ?? BREAKPOINT_PRESETS[0];
}

export interface ColumnTrackRect {
  index: number;
  x: number;
  width: number;
}

/**
 * Computes exact column overlay tracks for visual responsive grid inspection
 * inside an artboard frame or constrained breakpoint viewport.
 */
export function computeBreakpointColumnRects(
  frameWidth: number,
  preset: BreakpointPreset,
): ColumnTrackRect[] {
  const usableWidth = Math.max(
    40,
    frameWidth - preset.margin * 2 - preset.gutter * (preset.columns - 1),
  );
  const colW = usableWidth / preset.columns;
  const tracks: ColumnTrackRect[] = [];
  for (let i = 0; i < preset.columns; i++) {
    tracks.push({
      index: i,
      x: Math.round(preset.margin + i * (colW + preset.gutter)),
      width: Math.max(4, Math.round(colW)),
    });
  }
  return tracks;
}

/**
 * Computes target responsive preview width for a given artboard & active breakpoint.
 */
export function resolveBreakpointArtboardBounds(
  artboard: Artboard,
  breakpoint: ViewportBreakpoint,
): Bounds {
  const preset = getBreakpointPreset(breakpoint);
  if (preset.width === null) {
    return {
      x: artboard.x,
      y: artboard.y,
      width: artboard.width,
      height: artboard.height,
    };
  }
  return {
    x: artboard.x,
    y: artboard.y,
    width: preset.width,
    height: artboard.height,
  };
}

export function snapCoordinateToGrid(value: number, gridSize = 8): number {
  const safe = Math.max(1, Math.round(gridSize));
  return Math.round(value / safe) * safe;
}
