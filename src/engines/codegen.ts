import type {
  Artboard,
  CanvasNode,
  DesignTokens,
  DocumentState,
  PrototypeConfig,
  ShadowPreset,
} from '../types/canvas';
import {
  exportCssCustomProperties,
  exportW3CDesignTokensJson,
  resolveArtboardBackground,
  resolveNodeStyle,
} from './tokens';
import { buildSvgPathData } from './bezier';
import { buildImageFilterCss } from './media';
import { getDocumentArtboards, getNodesForArtboard } from './projectStorage';
import {
  generateAutoLayoutCss,
  generateAutoLayoutTailwind,
} from './autolayout';
import { exportArtboardToSvg, exportNodeToSvg } from './exporter';

export interface RedlineMeasurements {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function resolveParentArtboard(
  node: CanvasNode,
  doc: DocumentState,
): Artboard {
  const boards = getDocumentArtboards(doc);
  return boards.find((b) => b.id === node.artboardId) ?? doc.artboard;
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

function hasMotion(proto?: PrototypeConfig): boolean {
  if (!proto) return false;
  return proto.entrance !== 'none' || proto.hoverEffect !== 'none';
}

function buildFramerMotionProps(proto?: PrototypeConfig): string {
  if (!proto || !hasMotion(proto)) return '';
  const parts: string[] = [];

  switch (proto.entrance) {
    case 'fade-up':
      parts.push('initial={{ opacity: 0, y: 22 }}', 'animate={{ opacity: 1, y: 0 }}');
      break;
    case 'spring-scale':
      parts.push('initial={{ opacity: 0, scale: 0.84 }}', 'animate={{ opacity: 1, scale: 1 }}');
      break;
    case 'slide-left':
      parts.push('initial={{ opacity: 0, x: 28 }}', 'animate={{ opacity: 1, x: 0 }}');
      break;
    case 'elastic-pop':
      parts.push('initial={{ opacity: 0, scale: 0.72, y: 10 }}', 'animate={{ opacity: 1, scale: 1, y: 0 }}');
      break;
    case 'float-levitate':
      parts.push('animate={{ y: [0, -6, 0] }}');
      break;
    case 'shimmer-glow':
      parts.push('animate={{ filter: ["brightness(1)", "brightness(1.18)", "brightness(1)"] }}');
      break;
    default:
      break;
  }

  if (proto.hoverEffect === 'lift-glow') {
    parts.push('whileHover={{ y: -3, scale: 1.015 }}');
  } else if (proto.hoverEffect === 'scale') {
    parts.push('whileHover={{ scale: 1.03 }}');
  } else if (proto.hoverEffect === 'glass-tilt') {
    parts.push('whileHover={{ y: -2, rotateX: 2.5, rotateY: -2.5 }}');
  }

  const dur = Number((proto.durationMs / 1000).toFixed(2));
  const delay = Number((proto.delayMs / 1000).toFixed(2));
  const repeat =
    proto.entrance === 'float-levitate' || proto.entrance === 'shimmer-glow'
      ? ', repeat: Infinity'
      : '';
  const ease =
    proto.easing === 'spring'
      ? `type: 'spring', stiffness: 320, damping: 24`
      : proto.easing === 'expo-out'
        ? `ease: [0.16, 1, 0.3, 1]`
        : `ease: 'easeInOut'`;
  parts.push(`transition={{ duration: ${dur}, delay: ${delay}, ${ease}${repeat} }}`);

  return ' ' + parts.join(' ');
}

function buildNodeJsx(
  node: CanvasNode,
  artboard: Artboard,
  tokens: DesignTokens,
  indent: string,
): string {
  const resolved = resolveNodeStyle(node, tokens);
  const usesMotion = hasMotion(node.prototype);
  const relX = Math.round(node.x - artboard.x);
  const relY = Math.round(node.y - artboard.y);

  if (node.type === 'image') {
    const filterCss = buildImageFilterCss(node.imageFilter);
    const classes = [
      'absolute',
      `left-[${relX}px]`,
      `top-[${relY}px]`,
      `w-[${Math.round(node.width)}px]`,
      `h-[${Math.round(node.height)}px]`,
      node.objectFit === 'contain' ? 'object-contain' : 'object-cover',
    ];
    if (resolved.radius >= 999) classes.push('rounded-full');
    else if (resolved.radius > 0) classes.push(`rounded-[${resolved.radius}px]`);
    if (node.strokeWidth > 0) {
      classes.push(`border-[${node.strokeWidth}px]`, `border-[${resolved.strokeColor}]`);
    }
    const shadowTw = shadowToTailwind(node.shadow);
    if (shadowTw) classes.push(shadowTw);

    const inlineEntries: string[] = [];
    if (filterCss) inlineEntries.push(`filter: '${filterCss}'`);
    if (node.rotation !== 0) inlineEntries.push(`transform: 'rotate(${Math.round(node.rotation)}deg)'`);
    const styleAttr =
      inlineEntries.length > 0 ? ` style={{ ${inlineEntries.join(', ')} }}` : '';
    const tag = usesMotion ? 'motion.img' : 'img';
    const motionAttrs = buildFramerMotionProps(node.prototype);
    return `${indent}<${tag} src="${node.imageSrc ?? ''}" alt="${node.name}" className="${classes.join(' ')}"${styleAttr}${motionAttrs} />`;
  }

  if (node.type === 'path' && node.pathData) {
    const d = buildSvgPathData(
      node.pathData.points,
      node.pathData.smooth !== false,
      Boolean(node.pathData.closed),
    );
    const dash =
      node.pathData.dashStyle === 'dashed'
        ? ' strokeDasharray="8 6"'
        : node.pathData.dashStyle === 'dotted'
          ? ' strokeDasharray="2 6"'
          : '';
    const classes = [
      'absolute overflow-visible',
      `left-[${relX}px]`,
      `top-[${relY}px]`,
      `w-[${Math.round(node.width)}px]`,
      `h-[${Math.round(node.height)}px]`,
    ];
    return `${indent}<svg className="${classes.join(' ')}" viewBox="0 0 ${Math.round(node.width)} ${Math.round(node.height)}" fill="none">\n${indent}  <path d="${d}" stroke="${resolved.strokeColor}" strokeWidth={${Math.max(1.5, node.strokeWidth || 2.5)}} strokeLinecap="round" strokeLinejoin="round"${dash} />\n${indent}</svg>`;
  }

  const classes: string[] = [
    'absolute',
    `left-[${relX}px]`,
    `top-[${relY}px]`,
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

  if (node.autoLayout?.enabled) {
    classes.push(generateAutoLayoutTailwind(node.autoLayout));
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
  const motionAttrs = buildFramerMotionProps(node.prototype);
  const tag =
    node.type === 'button'
      ? usesMotion
        ? 'motion.button'
        : 'button'
      : usesMotion
        ? 'motion.div'
        : 'div';
  const classAttr = `className="${classes.join(' ')}"`;

  if ((node.type === 'text' || node.type === 'button') && node.text) {
    return `${indent}<${tag} ${classAttr}${styleAttr}${motionAttrs}>\n${indent}  ${escapeJsxText(node.text)}\n${indent}</${tag}>`;
  }
  return `${indent}<${tag} aria-label="${node.name}" ${classAttr}${styleAttr}${motionAttrs} />`;
}

export function generateReactTailwind(
  doc: DocumentState,
  selectedNode?: CanvasNode | null,
): string {
  if (selectedNode) {
    const parentBoard = resolveParentArtboard(selectedNode, doc);
    const compName = sanitizeComponentName(selectedNode.name);
    const usesMotion = hasMotion(selectedNode.prototype);
    const importLine = usesMotion
      ? `import { motion } from 'framer-motion';\n\n`
      : '';
    const jsx = buildNodeJsx(selectedNode, parentBoard, doc.tokens, '    ');
    return `// Generated by Atelier Canvas Pro v4.0 — React 19 + Tailwind CSS v4${usesMotion ? ' + Framer Motion' : ''}
${importLine}export function ${compName}() {
  return (
${jsx}
  );
}
`;
  }

  const compName = sanitizeComponentName(doc.artboard.name);
  const bg = resolveArtboardBackground(doc.artboard, doc.tokens);
  const visibleNodes = getNodesForArtboard(doc, doc.artboard.id).filter(
    (n) => n.visible,
  );
  const anyMotion = visibleNodes.some((n) => hasMotion(n.prototype));
  const importLine = anyMotion
    ? `import { motion } from 'framer-motion';\n\n`
    : '';
  const childrenJsx = visibleNodes
    .map((n) => buildNodeJsx(n, doc.artboard, doc.tokens, '      '))
    .join('\n');

  const artboardStyle =
    bg.fill.kind === 'gradient'
      ? ` style={{ background: '${bg.cssBackground}' }}`
      : '';
  const artboardBgClass =
    bg.fill.kind === 'solid' ? ` bg-[${bg.fill.color}]` : '';
  const artboardLayoutClass = doc.artboard.autoLayout?.enabled
    ? ` ${generateAutoLayoutTailwind(doc.artboard.autoLayout)}`
    : '';

  return `// Generated by Atelier Canvas Pro v4.0 — React 19 + Tailwind CSS v4${anyMotion ? ' + Framer Motion' : ''}
${importLine}export function ${compName}() {
  return (
    <section
      className="relative overflow-hidden w-[${Math.round(doc.artboard.width)}px] h-[${Math.round(doc.artboard.height)}px] rounded-[${doc.artboard.radius}px]${artboardBgClass}${artboardLayoutClass}"${artboardStyle}
    >
${childrenJsx}
    </section>
  );
}
`;
}

function prototypeEasingToCss(easing: PrototypeConfig['easing']): string {
  if (easing === 'spring') return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  if (easing === 'expo-out') return 'cubic-bezier(0.16, 1, 0.3, 1)';
  return 'ease-in-out';
}

export function generatePureCss(
  doc: DocumentState,
  selectedNode?: CanvasNode | null,
): string {
  const t = doc.tokens;
  const rootVars = exportCssCustomProperties(t);

  if (selectedNode) {
    const parentBoard = resolveParentArtboard(selectedNode, doc);
    const style = resolveNodeStyle(selectedNode, t);
    const cls = selectedNode.id.replace(/[^a-zA-Z0-9-_]/g, '-');
    const lines = [
      rootVars,
      '',
      `.${cls} {`,
      `  position: absolute;`,
      `  left: ${Math.round(selectedNode.x - parentBoard.x)}px;`,
      `  top: ${Math.round(selectedNode.y - parentBoard.y)}px;`,
      `  width: ${Math.round(selectedNode.width)}px;`,
      `  height: ${Math.round(selectedNode.height)}px;`,
      `  border-radius: ${style.radius}px;`,
      `  opacity: ${Number(selectedNode.opacity.toFixed(2))};`,
    ];
    if (selectedNode.autoLayout?.enabled) {
      const autoLines = generateAutoLayoutCss(selectedNode.autoLayout)
        .split('\n')
        .map((l) => `  ${l}`);
      lines.push(...autoLines);
    }
    if (selectedNode.type === 'image') {
      lines.push(`  object-fit: ${selectedNode.objectFit ?? 'cover'};`);
      const filterCss = buildImageFilterCss(selectedNode.imageFilter);
      if (filterCss) lines.push(`  filter: ${filterCss};`);
    } else if (style.fill.kind !== 'none' && selectedNode.type !== 'path') {
      lines.push(`  background: ${style.cssBackground};`);
    }
    if (selectedNode.strokeWidth > 0 && selectedNode.type !== 'path') {
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
    if (selectedNode.prototype && selectedNode.prototype.entrance !== 'none') {
      const p = selectedNode.prototype;
      const iter =
        p.entrance === 'float-levitate' || p.entrance === 'shimmer-glow'
          ? 'infinite'
          : 'both';
      lines.push(
        `  animation: atelier-${p.entrance} ${p.durationMs}ms ${prototypeEasingToCss(p.easing)} ${p.delayMs}ms ${iter};`,
      );
    }
    if (selectedNode.prototype && selectedNode.prototype.hoverEffect !== 'none') {
      lines.push(`  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms ease;`);
    }
    lines.push('}');

    if (selectedNode.prototype && selectedNode.prototype.hoverEffect !== 'none') {
      const hoverTransform =
        selectedNode.prototype.hoverEffect === 'lift-glow'
          ? 'translateY(-3px) scale(1.015)'
          : selectedNode.prototype.hoverEffect === 'scale'
            ? 'scale(1.03)'
            : 'perspective(600px) rotateX(2.5deg) rotateY(-2.5deg)';
      lines.push('', `.${cls}:hover {`, `  transform: ${hoverTransform};`, '}');
    }

    if (selectedNode.prototype && selectedNode.prototype.entrance !== 'none') {
      lines.push(
        '',
        `@keyframes atelier-${selectedNode.prototype.entrance} {`,
        `  from { opacity: 0; transform: translateY(18px) scale(0.96); }`,
        `  to { opacity: 1; transform: translateY(0) scale(1); }`,
        '}',
      );
    }

    return lines.join('\n') + '\n';
  }

  const bg = resolveArtboardBackground(doc.artboard, t);
  const autoLayoutLines = doc.artboard.autoLayout?.enabled
    ? '\n' +
      generateAutoLayoutCss(doc.artboard.autoLayout)
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')
    : '';
  return `${rootVars}

.atelier-artboard {
  position: relative;
  overflow: hidden;
  width: ${Math.round(doc.artboard.width)}px;
  height: ${Math.round(doc.artboard.height)}px;
  border-radius: ${doc.artboard.radius}px;
  background: ${bg.cssBackground};${autoLayoutLines}
}
`;
}

export function generateCleanSvg(
  doc: DocumentState,
  selectedNode?: CanvasNode | null,
): string {
  if (selectedNode) {
    return exportNodeToSvg(selectedNode, doc);
  }
  return exportArtboardToSvg(doc);
}

export function generateTokensJson(tokens: DesignTokens): string {
  return exportW3CDesignTokensJson(tokens);
}
