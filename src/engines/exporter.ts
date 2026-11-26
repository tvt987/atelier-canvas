import type { CanvasNode, DocumentState, FillConfig } from '../types/canvas';
import {
  hexToRgba,
  resolveArtboardBackground,
  resolveNodeStyle,
} from './tokens';
import { buildSvgPathData } from './bezier';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function gradientCoordsFromAngle(angleDeg: number): {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
} {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const x1 = 50 - Math.cos(rad) * 50;
  const y1 = 50 - Math.sin(rad) * 50;
  const x2 = 50 + Math.cos(rad) * 50;
  const y2 = 50 + Math.sin(rad) * 50;
  return {
    x1: `${x1.toFixed(1)}%`,
    y1: `${y1.toFixed(1)}%`,
    x2: `${x2.toFixed(1)}%`,
    y2: `${y2.toFixed(1)}%`,
  };
}

function registerGradientDef(
  defs: string[],
  id: string,
  fill: FillConfig,
  isGlass: boolean,
): string {
  if (fill.kind === 'none') return 'none';
  if (fill.kind === 'gradient' && fill.gradient) {
    const coords = gradientCoordsFromAngle(fill.gradient.angle);
    const fromOpacity = isGlass ? '0.74' : '1';
    const toOpacity = isGlass ? '0.58' : '1';
    defs.push(
      `    <linearGradient id="${id}" x1="${coords.x1}" y1="${coords.y1}" x2="${coords.x2}" y2="${coords.y2}">`,
      `      <stop offset="0%" stop-color="${escapeXml(fill.gradient.from)}" stop-opacity="${fromOpacity}" />`,
      `      <stop offset="100%" stop-color="${escapeXml(fill.gradient.to)}" stop-opacity="${toOpacity}" />`,
      `    </linearGradient>`,
    );
    return `url(#${id})`;
  }
  return isGlass ? hexToRgba(fill.color, 0.72) : fill.color;
}

function wrapTextLines(
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  const avgCharW = fontSize * 0.56;
  const maxChars = Math.max(8, Math.floor(maxWidth / Math.max(4, avgCharW)));
  const rawParagraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of rawParagraphs) {
    const words = para.split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function renderNodeSvg(
  node: CanvasNode,
  doc: DocumentState,
  defs: string[],
): string {
  const style = resolveNodeStyle(node, doc.tokens);
  const isGlass = node.type === 'glass' || node.blur > 0;
  const gradId = `grad-${node.id.replace(/[^a-zA-Z0-9-_]/g, '')}`;
  const fillPaint = registerGradientDef(defs, gradId, style.fill, isGlass);

  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const transformAttr =
    node.rotation !== 0
      ? ` transform="rotate(${node.rotation} ${cx.toFixed(1)} ${cy.toFixed(1)})"`
      : '';
  const opacityAttr =
    node.opacity < 1 ? ` opacity="${node.opacity.toFixed(2)}"` : '';
  const filterAttr =
    node.shadow !== 'none' ? ` filter="url(#shadow-${node.shadow})"` : '';
  const strokeAttr =
    node.strokeWidth > 0
      ? ` stroke="${escapeXml(style.strokeColor)}" stroke-width="${node.strokeWidth}"`
      : '';

  if (node.type === 'path' && node.pathData) {
    const worldPts = node.pathData.points.map((pt) => ({
      x: node.x + pt.x,
      y: node.y + pt.y,
    }));
    const d = buildSvgPathData(
      worldPts,
      node.pathData.smooth !== false,
      Boolean(node.pathData.closed),
    );
    const dashAttr =
      node.pathData.dashStyle === 'dashed'
        ? ' stroke-dasharray="8 6"'
        : node.pathData.dashStyle === 'dotted'
          ? ' stroke-dasharray="2 6"'
          : '';
    const arrowAttr = node.pathData.endArrow ? ' marker-end="url(#atelier-arrow)"' : '';
    const glowFilter = node.pathData.glow ? ' filter="url(#shadow-neon)"' : filterAttr;
    const strokePaint =
      style.fill.kind === 'gradient'
        ? fillPaint
        : escapeXml(style.strokeColor || doc.tokens.brandAccent);
    return `    <path d="${d}" fill="none" stroke="${strokePaint}" stroke-width="${Math.max(1.5, node.strokeWidth || 2.5)}" stroke-linecap="round" stroke-linejoin="round"${dashAttr}${arrowAttr}${opacityAttr}${glowFilter}${transformAttr} />`;
  }

  if (node.type === 'ellipse') {
    return `    <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(node.width / 2).toFixed(1)}" ry="${(node.height / 2).toFixed(1)}" fill="${fillPaint}"${strokeAttr}${opacityAttr}${filterAttr}${transformAttr} />`;
  }

  if (node.type === 'line') {
    const x2 = node.x + node.width;
    const y2 = node.y + node.height;
    if (node.height <= 4 || node.width <= 4) {
      return `    <rect x="${node.x.toFixed(1)}" y="${node.y.toFixed(1)}" width="${Math.max(1, node.width).toFixed(1)}" height="${Math.max(1, node.height).toFixed(1)}" rx="${style.radius}" fill="${fillPaint}"${opacityAttr}${transformAttr} />`;
    }
    return `    <line x1="${node.x.toFixed(1)}" y1="${node.y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${fillPaint}" stroke-width="${Math.max(2, node.strokeWidth || 2)}" stroke-linecap="round"${opacityAttr}${transformAttr} />`;
  }

  if (node.type === 'text') {
    const fontSize = node.fontSize ?? 16;
    const lineHeightPx = Math.round(fontSize * (node.lineHeight ?? 1.25));
    const lines = wrapTextLines(node.text ?? '', node.width, fontSize);
    const anchor =
      node.textAlign === 'center'
        ? 'middle'
        : node.textAlign === 'right'
          ? 'end'
          : 'start';
    const textX =
      node.textAlign === 'center'
        ? node.x + node.width / 2
        : node.textAlign === 'right'
          ? node.x + node.width
          : node.x;
    const startY = node.y + fontSize;
    const tspans = lines
      .map(
        (line, idx) =>
          `<tspan x="${textX.toFixed(1)}" dy="${idx === 0 ? 0 : lineHeightPx}">${escapeXml(line)}</tspan>`,
      )
      .join('');

    return `    <text x="${textX.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="${anchor}" fill="${escapeXml(style.textColor)}" font-family="${escapeXml(node.fontFamily ?? 'Inter')}, sans-serif" font-size="${fontSize}" font-weight="${node.fontWeight ?? 500}" letter-spacing="${node.letterSpacing ?? 0}"${opacityAttr}${transformAttr}>${tspans}</text>`;
  }

  if (node.type === 'button') {
    const rx = Math.min(style.radius, node.height / 2);
    const fontSize = node.fontSize ?? 14;
    const textY = cy + fontSize * 0.35;
    return [
      `    <g${opacityAttr}${transformAttr}>`,
      `      <rect x="${node.x.toFixed(1)}" y="${node.y.toFixed(1)}" width="${node.width.toFixed(1)}" height="${node.height.toFixed(1)}" rx="${rx}" fill="${fillPaint}"${strokeAttr}${filterAttr} />`,
      `      <text x="${cx.toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="middle" fill="${escapeXml(style.textColor)}" font-family="${escapeXml(node.fontFamily ?? 'Inter')}, sans-serif" font-size="${fontSize}" font-weight="${node.fontWeight ?? 600}" letter-spacing="${node.letterSpacing ?? 0}">${escapeXml(node.text ?? 'Button')}</text>`,
      `    </g>`,
    ].join('\n');
  }

  const rx = Math.min(style.radius, Math.min(node.width, node.height) / 2);
  return `    <rect x="${node.x.toFixed(1)}" y="${node.y.toFixed(1)}" width="${node.width.toFixed(1)}" height="${node.height.toFixed(1)}" rx="${rx}" fill="${fillPaint}"${strokeAttr}${opacityAttr}${filterAttr}${transformAttr} />`;
}

export function exportArtboardToSvg(doc: DocumentState): string {
  const { artboard, tokens } = doc;
  const bg = resolveArtboardBackground(artboard, tokens);
  const defs: string[] = [
    `    <clipPath id="artboard-clip">`,
    `      <rect x="0" y="0" width="${artboard.width}" height="${artboard.height}" rx="${artboard.radius}" />`,
    `    </clipPath>`,
    `    <marker id="atelier-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">`,
    `      <path d="M 1 1 L 9 5 L 1 9 z" fill="${escapeXml(tokens.brandAccent)}" />`,
    `    </marker>`,
    `    <filter id="shadow-subtle" x="-20%" y="-20%" width="140%" height="140%">`,
    `      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.22" />`,
    `    </filter>`,
    `    <filter id="shadow-elevated" x="-25%" y="-25%" width="150%" height="150%">`,
    `      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.34" />`,
    `    </filter>`,
    `    <filter id="shadow-floating" x="-30%" y="-30%" width="160%" height="160%">`,
    `      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#000000" flood-opacity="0.45" />`,
    `    </filter>`,
    `    <filter id="shadow-neon" x="-30%" y="-30%" width="160%" height="160%">`,
    `      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="${escapeXml(tokens.brandPrimary)}" flood-opacity="0.38" />`,
    `    </filter>`,
  ];

  const bgFill = registerGradientDef(defs, 'grad-artboard-bg', bg.fill, false);

  const visibleNodes = doc.nodes.filter((n) => n.visible);
  const nodeMarkup = visibleNodes
    .map((node) => renderNodeSvg(node, doc, defs))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${artboard.width}" height="${artboard.height}" viewBox="0 0 ${artboard.width} ${artboard.height}">
  <defs>
${defs.join('\n')}
  </defs>
  <g clip-path="url(#artboard-clip)">
    <rect x="0" y="0" width="${artboard.width}" height="${artboard.height}" rx="${artboard.radius}" fill="${bgFill}" />
${nodeMarkup}
  </g>
</svg>
`;
}

export function exportNodeToSvg(node: CanvasNode, doc: DocumentState): string {
  const shiftedNode: CanvasNode = {
    ...node,
    x: 12,
    y: 12,
  };
  const miniDoc: DocumentState = {
    ...doc,
    artboard: {
      ...doc.artboard,
      x: 0,
      y: 0,
      width: Math.round(node.width + 24),
      height: Math.round(node.height + 24),
      radius: 0,
      background: { kind: 'none', color: 'transparent' },
      tokenBinding: undefined,
    },
    nodes: [shiftedNode],
  };
  return exportArtboardToSvg(miniDoc);
}

export function exportArtboardToStandaloneHtml(doc: DocumentState): string {
  const bg = resolveArtboardBackground(doc.artboard, doc.tokens);
  const visibleNodes = doc.nodes.filter((n) => n.visible);

  const nodesHtml = visibleNodes
    .map((node) => {
      const style = resolveNodeStyle(node, doc.tokens);
      const proto = node.prototype;
      const hoverClass =
        proto && proto.hoverEffect !== 'none'
          ? ` hover-${proto.hoverEffect}`
          : '';
      const easing =
        proto?.easing === 'spring'
          ? 'cubic-bezier(0.34,1.56,0.64,1)'
          : proto?.easing === 'expo-out'
            ? 'cubic-bezier(0.16,1,0.3,1)'
            : 'ease-in-out';
      const animStyle =
        proto && proto.entrance !== 'none'
          ? `animation:at-${proto.entrance} ${proto.durationMs}ms ${easing} ${proto.delayMs}ms ${proto.entrance === 'float-levitate' || proto.entrance === 'shimmer-glow' ? 'infinite' : 'both'};`
          : '';
      const toastAttr =
        proto?.clickAction === 'toast'
          ? ` data-toast="${escapeXml(proto.clickPayload || `${node.name} triggered`)}"`
          : '';

      if (node.type === 'path' && node.pathData) {
        const d = buildSvgPathData(
          node.pathData.points,
          node.pathData.smooth !== false,
          Boolean(node.pathData.closed),
        );
        const dash =
          node.pathData.dashStyle === 'dashed'
            ? ' stroke-dasharray="8 6"'
            : node.pathData.dashStyle === 'dotted'
              ? ' stroke-dasharray="2 6"'
              : '';
        return `    <svg class="node${hoverClass}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;overflow:visible;${animStyle}" viewBox="0 0 ${node.width} ${node.height}" fill="none"><path d="${d}" stroke="${escapeXml(style.strokeColor)}" stroke-width="${Math.max(1.5, node.strokeWidth || 2.5)}" stroke-linecap="round" stroke-linejoin="round"${dash}/></svg>`;
      }

      const inlineCss = [
        `left:${node.x}px`,
        `top:${node.y}px`,
        `width:${node.width}px`,
        `height:${node.height}px`,
        `border-radius:${style.radius}px`,
        `opacity:${node.opacity}`,
        node.type !== 'text' ? `background:${style.cssBackground}` : 'background:transparent',
        node.strokeWidth > 0 ? `border:${node.strokeWidth}px solid ${style.strokeColor}` : '',
        node.blur > 0 ? `backdrop-filter:blur(${node.blur}px);-webkit-backdrop-filter:blur(${node.blur}px)` : '',
        style.boxShadow !== 'none' ? `box-shadow:${style.boxShadow}` : '',
        node.rotation !== 0 ? `transform:rotate(${node.rotation}deg)` : '',
        node.type === 'button' || node.type === 'text'
          ? `color:${style.textColor};font-family:'${node.fontFamily ?? 'Inter'}',sans-serif;font-size:${node.fontSize ?? 14}px;font-weight:${node.fontWeight ?? 500};letter-spacing:${node.letterSpacing ?? 0}px;line-height:${node.lineHeight ?? 1.25};text-align:${node.textAlign ?? 'left'};display:flex;align-items:${node.type === 'button' ? 'center' : 'flex-start'};justify-content:${node.type === 'button' ? 'center' : node.textAlign === 'center' ? 'center' : node.textAlign === 'right' ? 'flex-end' : 'flex-start'}`
          : '',
        proto?.clickAction && proto.clickAction !== 'none' ? 'cursor:pointer' : '',
        animStyle,
      ]
        .filter(Boolean)
        .join(';');

      const tag = node.type === 'button' ? 'button' : 'div';
      const content =
        node.type === 'text' || node.type === 'button'
          ? escapeXml(node.text ?? '')
          : '';
      return `    <${tag} class="node${hoverClass}" style="${inlineCss}"${toastAttr}>${content}</${tag}>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeXml(doc.artboard.name)} — Exported by Atelier Canvas v2</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#08090D;font-family:'Inter',sans-serif;padding:32px}
    .artboard{position:relative;overflow:hidden;width:${doc.artboard.width}px;height:${doc.artboard.height}px;border-radius:${doc.artboard.radius}px;background:${bg.cssBackground};box-shadow:0 32px 96px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.08)}
    .node{position:absolute;border:none;white-space:pre-wrap}
    .hover-lift-glow{transition:transform 220ms cubic-bezier(.22,1,.36,1),filter 220ms ease}
    .hover-lift-glow:hover{transform:translateY(-3px) scale(1.015);filter:brightness(1.1)}
    .hover-scale{transition:transform 200ms cubic-bezier(.22,1,.36,1)}
    .hover-scale:hover{transform:scale(1.03)}
    .hover-glass-tilt{transition:transform 260ms cubic-bezier(.22,1,.36,1)}
    .hover-glass-tilt:hover{transform:perspective(600px) rotateX(2.5deg) rotateY(-2.5deg)}
    @keyframes at-fade-up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
    @keyframes at-spring-scale{0%{opacity:0;transform:scale(.84)}70%{opacity:1;transform:scale(1.03)}100%{opacity:1;transform:scale(1)}}
    @keyframes at-slide-left{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}
    @keyframes at-elastic-pop{0%{opacity:0;transform:scale(.72) translateY(10px)}65%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
    @keyframes at-float-levitate{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes at-shimmer-glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}
    #toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111318;color:#F8FAFC;border:1px solid rgba(6,182,212,.5);padding:10px 18px;border-radius:999px;font-family:'JetBrains Mono',monospace;font-size:12px;opacity:0;transition:opacity 200ms ease;pointer-events:none}
    #toast.show{opacity:1}
  </style>
</head>
<body>
  <main class="artboard">
${nodesHtml}
  </main>
  <div id="toast"></div>
  <script>
    const toast=document.getElementById('toast');let timer;
    document.querySelectorAll('[data-toast]').forEach(el=>{
      el.addEventListener('click',()=>{
        toast.textContent=el.getAttribute('data-toast');
        toast.classList.add('show');
        clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),2600);
      });
    });
  </script>
</body>
</html>
`;
}

export async function svgToPngDataUrl(
  svgMarkup: string,
  width: number,
  height: number,
  scale = 2,
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PNG rasterization requires a browser environment');
  }

  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to decode SVG for PNG export'));
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not initialize 2D canvas context');
    }
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
