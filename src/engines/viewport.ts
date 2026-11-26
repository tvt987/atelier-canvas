import type { Artboard, Point, Viewport } from '../types/canvas';

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 100) / 100));
}

export function screenToCanvas(
  screenPt: Point,
  containerOrigin: Point,
  viewport: Viewport,
): Point {
  return {
    x: (screenPt.x - containerOrigin.x - viewport.x) / viewport.zoom,
    y: (screenPt.y - containerOrigin.y - viewport.y) / viewport.zoom,
  };
}

export function canvasToScreen(
  canvasPt: Point,
  containerOrigin: Point,
  viewport: Viewport,
): Point {
  return {
    x: containerOrigin.x + viewport.x + canvasPt.x * viewport.zoom,
    y: containerOrigin.y + viewport.y + canvasPt.y * viewport.zoom,
  };
}

export function zoomAtPoint(
  viewport: Viewport,
  nextZoomRaw: number,
  anchorLocal: Point,
): Viewport {
  const nextZoom = clampZoom(nextZoomRaw);
  const canvasX = (anchorLocal.x - viewport.x) / viewport.zoom;
  const canvasY = (anchorLocal.y - viewport.y) / viewport.zoom;

  return {
    zoom: nextZoom,
    x: Math.round((anchorLocal.x - canvasX * nextZoom) * 100) / 100,
    y: Math.round((anchorLocal.y - canvasY * nextZoom) * 100) / 100,
  };
}

export function fitArtboardToViewport(
  artboard: Pick<Artboard, 'x' | 'y' | 'width' | 'height'>,
  stageSize: { width: number; height: number },
  padding = 72,
): Viewport {
  const availW = Math.max(200, stageSize.width - padding * 2);
  const availH = Math.max(200, stageSize.height - padding * 2);
  const rawZoom = Math.min(availW / artboard.width, availH / artboard.height, 1.12);
  const zoom = clampZoom(rawZoom);

  const scaledW = artboard.width * zoom;
  const scaledH = artboard.height * zoom;
  const x = Math.round((stageSize.width - scaledW) / 2 - artboard.x * zoom);
  const y = Math.round((stageSize.height - scaledH) / 2 - artboard.y * zoom);

  return { x, y, zoom };
}

export function fitArtboardsToViewport(
  artboards: Array<Pick<Artboard, 'x' | 'y' | 'width' | 'height'>>,
  stageSize: { width: number; height: number },
  padding = 56,
): Viewport {
  if (artboards.length === 0) {
    return { x: 48, y: 48, zoom: 0.9 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ab of artboards) {
    minX = Math.min(minX, ab.x);
    minY = Math.min(minY, ab.y);
    maxX = Math.max(maxX, ab.x + ab.width);
    maxY = Math.max(maxY, ab.y + ab.height);
  }
  return fitArtboardToViewport(
    { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    stageSize,
    padding,
  );
}

export interface RulerTick {
  screenPos: number;
  canvasValue: number;
  major: boolean;
}

export function getRulerTicks(
  viewportOffset: number,
  zoom: number,
  pixelLength: number,
): RulerTick[] {
  const targetStepPx = 80;
  const rawCanvasStep = targetStepPx / zoom;
  const candidates = [10, 20, 25, 50, 100, 200, 250, 500];
  let majorStep = candidates[candidates.length - 1];
  for (const step of candidates) {
    if (step >= rawCanvasStep) {
      majorStep = step;
      break;
    }
  }
  const minorStep = majorStep / 5;

  const startCanvas = Math.floor(-viewportOffset / zoom / minorStep) * minorStep;
  const endCanvas = Math.ceil((pixelLength - viewportOffset) / zoom / minorStep) * minorStep;

  const ticks: RulerTick[] = [];
  for (let val = startCanvas; val <= endCanvas; val += minorStep) {
    const rounded = Math.round(val);
    const screenPos = rounded * zoom + viewportOffset;
    if (screenPos < -2 || screenPos > pixelLength + 2) continue;
    ticks.push({
      screenPos,
      canvasValue: rounded,
      major: rounded % majorStep === 0,
    });
  }
  return ticks;
}
