import type { Bounds, SnapGuide } from '../types/canvas';

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
}

export function computeSnap(
  moving: Bounds,
  siblings: Bounds[],
  artboard: Bounds,
  threshold = 6,
): SnapResult {
  const targets: Bounds[] = [artboard, ...siblings];

  const movingXAnchors = [
    { key: 'left', value: moving.x, offset: 0 },
    { key: 'center', value: moving.x + moving.width / 2, offset: moving.width / 2 },
    { key: 'right', value: moving.x + moving.width, offset: moving.width },
  ];

  const movingYAnchors = [
    { key: 'top', value: moving.y, offset: 0 },
    { key: 'middle', value: moving.y + moving.height / 2, offset: moving.height / 2 },
    { key: 'bottom', value: moving.y + moving.height, offset: moving.height },
  ];

  let bestDx: number | null = null;
  let bestXDist = threshold + 0.001;
  let matchedVGuide: SnapGuide | null = null;

  let bestDy: number | null = null;
  let bestYDist = threshold + 0.001;
  let matchedHGuide: SnapGuide | null = null;

  for (const target of targets) {
    const targetXs = [target.x, target.x + target.width / 2, target.x + target.width];
    const targetYs = [target.y, target.y + target.height / 2, target.y + target.height];

    for (const anchor of movingXAnchors) {
      for (const tx of targetXs) {
        const dist = Math.abs(tx - anchor.value);
        if (dist <= threshold && dist < bestXDist) {
          bestXDist = dist;
          bestDx = tx - anchor.value;
          const start = Math.min(moving.y, target.y) - 16;
          const end = Math.max(moving.y + moving.height, target.y + target.height) + 16;
          matchedVGuide = {
            orientation: 'vertical',
            position: tx,
            start,
            end,
            kind: 'align',
          };
        }
      }
    }

    for (const anchor of movingYAnchors) {
      for (const ty of targetYs) {
        const dist = Math.abs(ty - anchor.value);
        if (dist <= threshold && dist < bestYDist) {
          bestYDist = dist;
          bestDy = ty - anchor.value;
          const start = Math.min(moving.x, target.x) - 16;
          const end = Math.max(moving.x + moving.width, target.x + target.width) + 16;
          matchedHGuide = {
            orientation: 'horizontal',
            position: ty,
            start,
            end,
            kind: 'align',
          };
        }
      }
    }
  }

  const snappedX = Math.round(moving.x + (bestDx ?? 0));
  const snappedY = Math.round(moving.y + (bestDy ?? 0));
  const guides: SnapGuide[] = [];

  if (matchedVGuide) {
    guides.push(matchedVGuide);
  }
  if (matchedHGuide) {
    guides.push(matchedHGuide);
  }

  // Compute nearest spacing callout to a sibling or artboard edge
  const snappedBounds: Bounds = {
    x: snappedX,
    y: snappedY,
    width: moving.width,
    height: moving.height,
  };

  let nearestHorizontalGap: { gap: number; start: number; end: number; y: number } | null = null;
  let nearestVerticalGap: { gap: number; start: number; end: number; x: number } | null = null;

  for (const sibling of siblings) {
    const vOverlap =
      Math.min(snappedBounds.y + snappedBounds.height, sibling.y + sibling.height) -
      Math.max(snappedBounds.y, sibling.y);
    if (vOverlap > 0) {
      const midY =
        Math.max(snappedBounds.y, sibling.y) + vOverlap / 2;
      if (snappedBounds.x >= sibling.x + sibling.width) {
        const gap = Math.round(snappedBounds.x - (sibling.x + sibling.width));
        if (gap > 0 && gap <= 180 && (!nearestHorizontalGap || gap < nearestHorizontalGap.gap)) {
          nearestHorizontalGap = {
            gap,
            start: sibling.x + sibling.width,
            end: snappedBounds.x,
            y: midY,
          };
        }
      } else if (sibling.x >= snappedBounds.x + snappedBounds.width) {
        const gap = Math.round(sibling.x - (snappedBounds.x + snappedBounds.width));
        if (gap > 0 && gap <= 180 && (!nearestHorizontalGap || gap < nearestHorizontalGap.gap)) {
          nearestHorizontalGap = {
            gap,
            start: snappedBounds.x + snappedBounds.width,
            end: sibling.x,
            y: midY,
          };
        }
      }
    }

    const hOverlap =
      Math.min(snappedBounds.x + snappedBounds.width, sibling.x + sibling.width) -
      Math.max(snappedBounds.x, sibling.x);
    if (hOverlap > 0) {
      const midX =
        Math.max(snappedBounds.x, sibling.x) + hOverlap / 2;
      if (snappedBounds.y >= sibling.y + sibling.height) {
        const gap = Math.round(snappedBounds.y - (sibling.y + sibling.height));
        if (gap > 0 && gap <= 180 && (!nearestVerticalGap || gap < nearestVerticalGap.gap)) {
          nearestVerticalGap = {
            gap,
            start: sibling.y + sibling.height,
            end: snappedBounds.y,
            x: midX,
          };
        }
      } else if (sibling.y >= snappedBounds.y + snappedBounds.height) {
        const gap = Math.round(sibling.y - (snappedBounds.y + snappedBounds.height));
        if (gap > 0 && gap <= 180 && (!nearestVerticalGap || gap < nearestVerticalGap.gap)) {
          nearestVerticalGap = {
            gap,
            start: snappedBounds.y + snappedBounds.height,
            end: sibling.y,
            x: midX,
          };
        }
      }
    }
  }

  if (nearestHorizontalGap) {
    guides.push({
      orientation: 'horizontal',
      position: nearestHorizontalGap.y,
      start: nearestHorizontalGap.start,
      end: nearestHorizontalGap.end,
      distanceLabel: `${nearestHorizontalGap.gap}px`,
      distanceAnchorX: (nearestHorizontalGap.start + nearestHorizontalGap.end) / 2,
      distanceAnchorY: nearestHorizontalGap.y,
      kind: 'spacing',
    });
  } else if (snappedBounds.x > artboard.x && snappedBounds.x - artboard.x <= 180) {
    const gap = Math.round(snappedBounds.x - artboard.x);
    guides.push({
      orientation: 'horizontal',
      position: snappedBounds.y + snappedBounds.height / 2,
      start: artboard.x,
      end: snappedBounds.x,
      distanceLabel: `${gap}px`,
      distanceAnchorX: artboard.x + gap / 2,
      distanceAnchorY: snappedBounds.y + snappedBounds.height / 2,
      kind: 'spacing',
    });
  }

  if (nearestVerticalGap) {
    guides.push({
      orientation: 'vertical',
      position: nearestVerticalGap.x,
      start: nearestVerticalGap.start,
      end: nearestVerticalGap.end,
      distanceLabel: `${nearestVerticalGap.gap}px`,
      distanceAnchorX: nearestVerticalGap.x,
      distanceAnchorY: (nearestVerticalGap.start + nearestVerticalGap.end) / 2,
      kind: 'spacing',
    });
  } else if (snappedBounds.y > artboard.y && snappedBounds.y - artboard.y <= 180) {
    const gap = Math.round(snappedBounds.y - artboard.y);
    guides.push({
      orientation: 'vertical',
      position: snappedBounds.x + snappedBounds.width / 2,
      start: artboard.y,
      end: snappedBounds.y,
      distanceLabel: `${gap}px`,
      distanceAnchorX: snappedBounds.x + snappedBounds.width / 2,
      distanceAnchorY: artboard.y + gap / 2,
      kind: 'spacing',
    });
  }

  return {
    x: snappedX,
    y: snappedY,
    guides,
  };
}
