import type { Bounds, CanvasNode } from '../types/canvas';

export interface MeasureSegment {
  orientation: 'horizontal' | 'vertical';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distancePx: number;
  labelX: number;
  labelY: number;
}

/**
 * Computes Figma Alt-hover inter-node measurement segments between a selected
 * source bounding box and a hovered target bounding box.
 */
export function computeInterNodeMeasurements(
  source: Bounds,
  target: Bounds,
): MeasureSegment[] {
  const segments: MeasureSegment[] = [];

  const sRight = source.x + source.width;
  const sBottom = source.y + source.height;
  const tRight = target.x + target.width;
  const tBottom = target.y + target.height;

  const sCenterX = source.x + source.width / 2;
  const sCenterY = source.y + source.height / 2;

  // Check containment (source inside target or target inside source)
  const sourceInsideTarget =
    source.x >= target.x &&
    sRight <= tRight &&
    source.y >= target.y &&
    sBottom <= tBottom;

  if (sourceInsideTarget) {
    const left = Math.round(source.x - target.x);
    const right = Math.round(tRight - sRight);
    const top = Math.round(source.y - target.y);
    const bottom = Math.round(tBottom - sBottom);

    if (left > 0) {
      segments.push({
        orientation: 'horizontal',
        x1: target.x,
        y1: sCenterY,
        x2: source.x,
        y2: sCenterY,
        distancePx: left,
        labelX: (target.x + source.x) / 2,
        labelY: sCenterY,
      });
    }
    if (right > 0) {
      segments.push({
        orientation: 'horizontal',
        x1: sRight,
        y1: sCenterY,
        x2: tRight,
        y2: sCenterY,
        distancePx: right,
        labelX: (sRight + tRight) / 2,
        labelY: sCenterY,
      });
    }
    if (top > 0) {
      segments.push({
        orientation: 'vertical',
        x1: sCenterX,
        y1: target.y,
        x2: sCenterX,
        y2: source.y,
        distancePx: top,
        labelX: sCenterX,
        labelY: (target.y + source.y) / 2,
      });
    }
    if (bottom > 0) {
      segments.push({
        orientation: 'vertical',
        x1: sCenterX,
        y1: sBottom,
        x2: sCenterX,
        y2: tBottom,
        distancePx: bottom,
        labelX: sCenterX,
        labelY: (sBottom + tBottom) / 2,
      });
    }
    return segments;
  }

  // Horizontal gap between separated objects
  if (sRight < target.x) {
    const gap = Math.round(target.x - sRight);
    segments.push({
      orientation: 'horizontal',
      x1: sRight,
      y1: sCenterY,
      x2: target.x,
      y2: sCenterY,
      distancePx: gap,
      labelX: (sRight + target.x) / 2,
      labelY: sCenterY,
    });
  } else if (tRight < source.x) {
    const gap = Math.round(source.x - tRight);
    segments.push({
      orientation: 'horizontal',
      x1: tRight,
      y1: sCenterY,
      x2: source.x,
      y2: sCenterY,
      distancePx: gap,
      labelX: (tRight + source.x) / 2,
      labelY: sCenterY,
    });
  }

  // Vertical gap between separated objects
  if (sBottom < target.y) {
    const gap = Math.round(target.y - sBottom);
    segments.push({
      orientation: 'vertical',
      x1: sCenterX,
      y1: sBottom,
      x2: sCenterX,
      y2: target.y,
      distancePx: gap,
      labelX: sCenterX,
      labelY: (sBottom + target.y) / 2,
    });
  } else if (tBottom < source.y) {
    const gap = Math.round(source.y - tBottom);
    segments.push({
      orientation: 'vertical',
      x1: sCenterX,
      y1: tBottom,
      x2: sCenterX,
      y2: source.y,
      distancePx: gap,
      labelX: sCenterX,
      labelY: (tBottom + source.y) / 2,
    });
  }

  return segments;
}

export function translateGroupNodes(
  nodes: CanvasNode[],
  selectedIds: string[],
  dx: number,
  dy: number,
): CanvasNode[] {
  const idSet = new Set(selectedIds);
  return nodes.map((node) => {
    if (!idSet.has(node.id) || node.locked) return node;
    return {
      ...node,
      x: Math.round(node.x + dx),
      y: Math.round(node.y + dy),
    };
  });
}
