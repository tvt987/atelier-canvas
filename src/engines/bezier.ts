import type { PathPoint } from '../types/canvas';

export interface NormalizedPathGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  points: PathPoint[];
}

export function normalizePathPoints(
  rawPoints: PathPoint[],
  padding = 8,
): NormalizedPathGeometry {
  if (rawPoints.length === 0) {
    return { x: 0, y: 0, width: 40, height: 40, points: [] };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of rawPoints) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }

  const originX = Math.round(minX - padding);
  const originY = Math.round(minY - padding);
  const width = Math.max(24, Math.round(maxX - minX + padding * 2));
  const height = Math.max(24, Math.round(maxY - minY + padding * 2));

  const localPoints = rawPoints.map((pt) => ({
    x: Math.round((pt.x - originX) * 10) / 10,
    y: Math.round((pt.y - originY) * 10) / 10,
  }));

  return { x: originX, y: originY, width, height, points: localPoints };
}

/**
 * Generates a crisp SVG path string using Catmull-Rom to Cubic Bezier smoothing
 * when smooth=true, or crisp polygonal lines when smooth=false.
 */
export function buildSvgPathData(
  points: PathPoint[],
  smooth = true,
  closed = false,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }

  if (!smooth || points.length === 2) {
    const cmds = points.map((p, idx) =>
      `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
    );
    if (closed) cmds.push('Z');
    return cmds.join(' ');
  }

  const pts = closed ? [...points, points[0]] : points;
  const cmds: string[] = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`];

  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i === 0 ? (closed ? pts.length - 2 : 0) : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 =
      pts[i + 2 < pts.length ? i + 2 : closed ? 1 : pts.length - 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    cmds.push(
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
    );
  }

  if (closed) {
    cmds.push('Z');
  }
  return cmds.join(' ');
}

export function scalePathPoints(
  points: PathPoint[],
  prevW: number,
  prevH: number,
  nextW: number,
  nextH: number,
): PathPoint[] {
  const sx = prevW > 0 ? nextW / prevW : 1;
  const sy = prevH > 0 ? nextH / prevH : 1;
  return points.map((pt) => ({
    x: Math.round(pt.x * sx * 10) / 10,
    y: Math.round(pt.y * sy * 10) / 10,
  }));
}
