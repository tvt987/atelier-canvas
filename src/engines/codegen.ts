import type {
  Artboard,
  CanvasNode,
  DesignTokens,
  DocumentState,
  ShadowPreset,
} from '../types/canvas';
import {
  resolveArtboardBackground,
  resolveNodeStyle,
  tokensToW3CJson,
} from './tokens';

export interface RedlineMeasurements {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function computeRedlineMeasurements(
  node: CanvasNode,
  artboard: Artboard,
): RedlineMeasurements {
  const left = Math.round(node.x - artboard.x);
  const top = Math.round(node.y - artboard.y);
  const right = Math.round(artboard.x + artboard.width - (node.x + node.width));
  const bottom = Math.round(artboard.y + artboard.height - (node.y + node.height));
  return { top, right, bottom, left };
}

function sanitizeComponentName(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
  return cleaned.length > 0 ? cleaned : 'AtelierComposition';
}

function shadowToTailwind(shadow: ShadowPreset): string {
  switch (shadow) {
    case 'subtle':
      return 'shadow-md';
    case 'elevated':
      return 'shadow-2xl';
    case 'floating':
      return 'shadow-[0_24px_60px_rgba(0,0,0,0.45)]';
    case 'neon':
      return 'shadow-[0_12px_32px_rgba(99,102,241,0.38)]';
    default:
      return '';
  }
}

function fontFamilyToTw(fontFamily?: string): string {
  if (!fontFamily) return 'font-sans';
  if (fontFamily.includes('Mono')) return 'font-mono';
  if (fontFamily.includes('Garamond')) return 'font-serif';
  if (fontFamily.includes('Space Grotesk')) return 'font-[Space_Grotesk]';
  return 'font-sans';
}

function weightToTw(weight?: number): string {
  if (!weight || weight <= 400) return 'font-normal';
  if (weight <= 500) return 'font-medium';
  if (weight <= 600) return 'font-semibold';
  return 'font-bold';
}

function escapeJsxText(text: string): string {
  return text.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
}

function buildNodeJsx(
  node: CanvasNode,
  tokens: DesignTokens,
  indent: string,
): string {
  const resolved = resolveNodeStyle(node, tokens);
  const classes: string[] = [
    'absolute',
    `left-[${Math.round(node.x)}px]`,
    `top-[${Math.round(node.y)}px]`,
    `w-[${Math.round(node.width)}px]`,
    `h-[${Math.round(node.height)}px]`,
  ];

  if (node.type === 'ellipse') {
    classes.push('rounded-full');
  } else if (resolved.radius > 0) {
    classes.push(
      resolved.radius >= 999 ? 'rounded-full' : `rounded-[${resolved.radius}px]`,
    );
  }

  if (node.opacity < 1) {
    classes.push(`opacity-[${Number(node.opacity.toFixed(2))}]`);
  }

  if (node.blur > 0) {
    classes.push(`backdrop-blur-[${node.blur}px]`);
  }

  const shadowTw = shadowToTailwind(node.shadow);
  if (shadowTw) classes.push(shadowTw);

  if (node.strokeWidth > 0) {
    classes.push(`border-[${node.strokeWidth}px]`, `border-[${resolved.strokeColor}]`);
  }

  if (node.blendMode !== 'normal') {
    classes.push(`mix-blend-${node.blendMode}`);
  }

  if (node.type === 'button') {
    classes.push(
      'flex',
      'items-center',
      'justify-center',
      fontFamilyToTw(node.fontFamily),
      weightToTw(node.fontWeight),
      `text-[${node.fontSize ?? 14}px]`,
      `text-[${resolved.textColor}]`,
    );
  } else if (node.type === 'text') {
    classes.push(
      fontFamilyToTw(node.fontFamily),
      weightToTw(node.fontWeight),
      `text-[${node.fontSize ?? 16}px]`,
      `text-[${resolved.textColor}]`,
      node.textAlign === 'center'
        ? 'text-center'
        : node.textAlign === 'right'
          ? 'text-right'
          : 'text-left',
    );
  }

  const inlineEntries: string[] = [];
  if (resolved.fill.kind === 'gradient') {
    inlineEntries.push(`background: '${resolved.cssBackground}'`);
  } else if (resolved.fill.kind === 'solid') {
    if (node.type === 'glass' || node.blur > 0) {
      inlineEntries.push(`backgroundColor: '${resolved.cssBackground}'`);
    } else {
      classes.push(`bg-[${resolved.fill.color}]`);
    }
  }

  if (node.rotation !== 0) {
    inlineEntries.push(`transform: 'rotate(${Math.round(node.rotation)}deg)'`);
  }

  if (node.letterSpacing && node.letterSpacing !== 0) {
    inlineEntries.push(`letterSpacing: '${node.letterSpacing}px'`);
  }

  const styleAttr =
    inlineEntries.length > 0 ? ` style={{ ${inlineEntries.join(', ')} }}` : '';
  const tag = node.type === 'button' ? 'button' : 'div';
  const classAttr = `className="${classes.join(' ')}"`;

  if ((node.type === 'text' || node.type === 'button') && node.text) {
    return `${indent}<${tag} ${classAttr}${styleAttr}>\n${indent}  ${escapeJsxText(node.text)}\n${indent}</${tag}>`;
  }
  return `${indent}<${tag} aria-label="${node.name}" ${classAttr}${styleAttr} />`;
}

export function generateReactTailwind(
  doc: DocumentState,
  selectedNode?: CanvasNode | null,
): string {
  if (selectedNode) {
    const compName = sanitizeComponentName(selectedNode.name);
    const jsx = buildNodeJsx(selectedNode, doc.tokens, '    ');
    return `// Generated by Atelier Canvas — React 19 + Tailwind CSS v4
export function ${compName}() {
  return (
${jsx}
  );
}
`;
  }

  const compName = sanitizeComponentName(doc.artboard.name);
  const bg = resolveArtboardBackground(doc.artboard, doc.tokens);
  const visibleNodes = doc.nodes.filter((n) => n.visible);
  const childrenJsx = visibleNodes
    .map((n) => buildNodeJsx(n, doc.tokens, '      '))
    .join('\n');

  const artboardStyle =
    bg.fill.kind === 'gradient'
      ? ` style={{ background: '${bg.cssBackground}' }}`
      : '';
  const artboardBgClass =
    bg.fill.kind === 'solid' ? ` bg-[${bg.fill.color}]` : '';

  return `// Generated by Atelier Canvas — React 19 + Tailwind CSS v4
export function ${compName}() {
  return (
    <section
      className="relative overflow-hidden w-[${Math.round(doc.artboard.width)}px] h-[${Math.round(doc.artboard.height)}px] rounded-[${doc.artboard.radius}px]${artboardBgClass}"${artboardStyle}
    >
${childrenJsx}
    </section>
  );
}
`;
}

export function generatePureCss(
  doc: DocumentState,
  selectedNode?: CanvasNode | null,
): string {
  const t = doc.tokens;
  const rootVars = `:root {
  --brand-primary: ${t.brandPrimary};
  --brand-accent: ${t.brandAccent};
  --surface-canvas: ${t.surfaceCanvas};
  --surface-card: ${t.surfaceCard};
  --surface-elevated: ${t.surfaceElevated};
  --border-subtle: ${t.borderSubtle};
  --text-primary: ${t.textPrimary};
  --text-muted: ${t.textMuted};
  --radius-base: ${t.radiusBase}px;
}`;

  if (selectedNode) {
    const style = resolveNodeStyle(selectedNode, t);
    const cls = selectedNode.id.replace(/[^a-zA-Z0-9-_]/g, '-');
    const lines = [
      rootVars,
      '',
      `.${cls} {`,
      `  position: absolute;`,
      `  left: ${Math.round(selectedNode.x)}px;`,
      `  top: ${Math.round(selectedNode.y)}px;`,
      `  width: ${Math.round(selectedNode.width)}px;`,
      `  height: ${Math.round(selectedNode.height)}px;`,
      `  border-radius: ${style.radius}px;`,
      `  opacity: ${Number(selectedNode.opacity.toFixed(2))};`,
    ];
    if (style.fill.kind !== 'none') {
      lines.push(`  background: ${style.cssBackground};`);
    }
    if (selectedNode.strokeWidth > 0) {
      lines.push(`  border: ${selectedNode.strokeWidth}px solid ${style.strokeColor};`);
    }
    if (selectedNode.blur > 0) {
      lines.push(`  backdrop-filter: blur(${selectedNode.blur}px);`);
    }
    if (style.boxShadow !== 'none') {
      lines.push(`  box-shadow: ${style.boxShadow};`);
    }
    if (selectedNode.rotation !== 0) {
      lines.push(`  transform: rotate(${Math.round(selectedNode.rotation)}deg);`);
    }
    if (selectedNode.type === 'text' || selectedNode.type === 'button') {
      lines.push(`  color: ${style.textColor};`);
      lines.push(`  font-family: '${selectedNode.fontFamily ?? 'Inter'}', sans-serif;`);
      lines.push(`  font-size: ${selectedNode.fontSize ?? 14}px;`);
      lines.push(`  font-weight: ${selectedNode.fontWeight ?? 500};`);
    }
    lines.push('}');
    return lines.join('\n') + '\n';
  }

  const bg = resolveArtboardBackground(doc.artboard, t);
  return `${rootVars}

.atelier-artboard {
  position: relative;
  overflow: hidden;
  width: ${Math.round(doc.artboard.width)}px;
  height: ${Math.round(doc.artboard.height)}px;
  border-radius: ${doc.artboard.radius}px;
  background: ${bg.cssBackground};
}
`;
}

export function generateTokensJson(tokens: DesignTokens): string {
  return tokensToW3CJson(tokens);
}
