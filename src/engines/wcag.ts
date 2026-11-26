import type { CanvasNode, DocumentState } from '../types/canvas';
import { resolveArtboardBackground, resolveNodeStyle } from './tokens';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface WcagAuditResult {
  ratio: number;
  ratioLabel: string;
  grade: 'AAA' | 'AA' | 'AA-Large' | 'FAIL';
  passesAA: boolean;
  passesAAA: boolean;
  foregroundHex: string;
  backgroundHex: string;
}

export function parseHexColor(hex: string): RgbColor | null {
  const cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  return null;
}

function linearizeChannel(channel255: number): number {
  const s = channel255 / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return 0;
  return (
    0.2126 * linearizeChannel(rgb.r) +
    0.7152 * linearizeChannel(rgb.g) +
    0.0722 * linearizeChannel(rgb.b)
  );
}

export function computeContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function evaluateWcag(fgHex: string, bgHex: string): WcagAuditResult {
  const rawRatio = computeContrastRatio(fgHex, bgHex);
  const ratio = Math.round(rawRatio * 10) / 10;
  let grade: WcagAuditResult['grade'] = 'FAIL';
  if (ratio >= 7) {
    grade = 'AAA';
  } else if (ratio >= 4.5) {
    grade = 'AA';
  } else if (ratio >= 3) {
    grade = 'AA-Large';
  }

  return {
    ratio,
    ratioLabel: `${ratio.toFixed(1)}:1`,
    grade,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
    foregroundHex: fgHex,
    backgroundHex: bgHex,
  };
}

export function autoFixContrastToAAA(fgHex: string, bgHex: string): string {
  const current = computeContrastRatio(fgHex, bgHex);
  if (current >= 7) return fgHex;

  const candidates = [
    '#FFFFFF',
    '#F8FAFC',
    '#F1F5F9',
    '#05070B',
    '#0B0F19',
    '#0F172A',
  ];

  let bestHex = '#FFFFFF';
  let bestRatio = 0;

  for (const hex of candidates) {
    const r = computeContrastRatio(hex, bgHex);
    if (r >= 7) {
      // Prefer slightly softer high-contrast ink over harsh extremes when both hit AAA
      if (r > bestRatio) {
        bestRatio = r;
        bestHex = hex;
      }
    } else if (r > bestRatio) {
      bestRatio = r;
      bestHex = hex;
    }
  }

  return bestHex;
}

function getRepresentativeFillHex(
  fill: { kind: string; color: string; gradient?: { from: string; to: string } },
  fallback: string,
): string {
  if (fill.kind === 'gradient' && fill.gradient) {
    return fill.gradient.from.startsWith('#') ? fill.gradient.from : fallback;
  }
  if (fill.kind === 'solid' && fill.color.startsWith('#')) {
    return fill.color;
  }
  return fallback;
}

export function resolveEffectiveBackgroundHex(
  node: CanvasNode,
  doc: DocumentState,
): string {
  const artboardBg = resolveArtboardBackground(doc.artboard, doc.tokens);
  const artboardHex = getRepresentativeFillHex(
    artboardBg.fill,
    doc.tokens.surfaceCanvas,
  );

  if (node.type === 'button') {
    const resolved = resolveNodeStyle(node, doc.tokens);
    return getRepresentativeFillHex(resolved.fill, artboardHex);
  }

  // For text layers, find topmost visible surface layer located below this layer in z-order
  const nodeIndex = doc.nodes.findIndex((n) => n.id === node.id);
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;

  for (let i = nodeIndex - 1; i >= 0; i -= 1) {
    const candidate = doc.nodes[i];
    if (!candidate.visible || candidate.type === 'text' || candidate.type === 'line' || candidate.type === 'path') {
      continue;
    }
    const containsCenter =
      cx >= candidate.x &&
      cx <= candidate.x + candidate.width &&
      cy >= candidate.y &&
      cy <= candidate.y + candidate.height;
    if (!containsCenter) continue;

    const resolved = resolveNodeStyle(candidate, doc.tokens);
    if (resolved.fill.kind === 'none') continue;
    return getRepresentativeFillHex(resolved.fill, artboardHex);
  }

  return artboardHex;
}

export function auditNodeContrast(
  node: CanvasNode,
  doc: DocumentState,
): WcagAuditResult | null {
  if (node.type !== 'text' && node.type !== 'button') return null;
  const style = resolveNodeStyle(node, doc.tokens);
  const fgHex = style.textColor.startsWith('#')
    ? style.textColor
    : doc.tokens.textPrimary;
  const bgHex = resolveEffectiveBackgroundHex(node, doc);
  return evaluateWcag(fgHex, bgHex);
}
