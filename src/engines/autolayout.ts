import type { Artboard, AutoLayoutConfig, CanvasNode } from '../types/canvas';

export const DEFAULT_AUTO_LAYOUT: AutoLayoutConfig = {
  enabled: false,
  layoutMode: 'flex',
  direction: 'row',
  columns: 2,
  gap: 16,
  padding: 20,
  align: 'center',
  justify: 'start',
  wrap: false,
};

/**
 * Generates clean production CSS rules for a Flexbox or CSS Grid Auto-Layout container.
 */
export function generateAutoLayoutCss(config: AutoLayoutConfig): string {
  const mode = config.layoutMode ?? 'flex';
  const alignCss =
    config.align === 'start'
      ? 'flex-start'
      : config.align === 'end'
        ? 'flex-end'
        : config.align === 'stretch'
          ? 'stretch'
          : 'center';

  if (mode === 'grid') {
    const cols = Math.max(1, Math.min(6, Math.round(config.columns ?? 2)));
    return [
      `display: grid;`,
      `grid-template-columns: repeat(${cols}, minmax(0, 1fr));`,
      `gap: ${config.gap}px;`,
      `padding: ${config.padding}px;`,
      `align-items: ${alignCss};`,
    ].join('\n');
  }

  const justifyCss =
    config.justify === 'center'
      ? 'center'
      : config.justify === 'end'
        ? 'flex-end'
        : config.justify === 'between'
          ? 'space-between'
          : 'flex-start';

  const lines = [
    `display: flex;`,
    `flex-direction: ${config.direction};`,
    `gap: ${config.gap}px;`,
    `padding: ${config.padding}px;`,
    `align-items: ${alignCss};`,
    `justify-content: ${justifyCss};`,
  ];
  if (config.wrap) {
    lines.push(`flex-wrap: wrap;`);
  }
  return lines.join('\n');
}

/**
 * Generates Tailwind CSS v4 utility classes for a Flexbox or CSS Grid Auto-Layout container.
 */
export function generateAutoLayoutTailwind(config: AutoLayoutConfig): string {
  const mode = config.layoutMode ?? 'flex';
  const alignTw =
    config.align === 'start'
      ? 'items-start'
      : config.align === 'end'
        ? 'items-end'
        : config.align === 'stretch'
          ? 'items-stretch'
          : 'items-center';

  if (mode === 'grid') {
    const cols = Math.max(1, Math.min(6, Math.round(config.columns ?? 2)));
    return `grid grid-cols-${cols} gap-[${config.gap}px] p-[${config.padding}px] ${alignTw}`;
  }

  const dirTw = config.direction === 'column' ? 'flex-col' : 'flex-row';
  const justifyTw =
    config.justify === 'center'
      ? 'justify-center'
      : config.justify === 'end'
        ? 'justify-end'
        : config.justify === 'between'
          ? 'justify-between'
          : 'justify-start';
  const wrapTw = config.wrap ? ' flex-wrap' : '';
  return `flex ${dirTw}${wrapTw} gap-[${config.gap}px] p-[${config.padding}px] ${alignTw} ${justifyTw}`;
}

/**
 * Deterministic Figma-style Flexbox & CSS Grid Auto-Layout engine for Frame containers.
 * Finds all visible unlocked nodes whose center resides inside the frame,
 * sorts them, reflows them with exact padding + gap + align + justify (or grid columns),
 * and ensures the parent frame fits its children cleanly.
 */
export function applyAutoLayoutToFrame(
  frameId: string,
  allNodes: CanvasNode[],
  configOverride?: AutoLayoutConfig,
): CanvasNode[] {
  const frame = allNodes.find((n) => n.id === frameId);
  if (!frame || frame.type !== 'frame') return allNodes;

  const config: AutoLayoutConfig = configOverride ??
    frame.autoLayout ?? {
      ...DEFAULT_AUTO_LAYOUT,
      enabled: true,
    };

  if (!config.enabled) {
    return allNodes.map((n) =>
      n.id === frameId ? { ...n, autoLayout: config } : n,
    );
  }

  const children = allNodes.filter((n) => {
    if (n.id === frameId || !n.visible || n.locked) return false;
    const cx = n.x + n.width / 2;
    const cy = n.y + n.height / 2;
    return (
      cx >= frame.x &&
      cx <= frame.x + frame.width &&
      cy >= frame.y &&
      cy <= frame.y + frame.height
    );
  });

  if (children.length === 0) {
    return allNodes.map((n) =>
      n.id === frameId ? { ...n, autoLayout: config } : n,
    );
  }

  const mode = config.layoutMode ?? 'flex';

  // CSS GRID MODE
  if (mode === 'grid') {
    const cols = Math.max(1, Math.min(6, Math.round(config.columns ?? 2)));
    const sorted = [...children].sort((a, b) =>
      Math.abs(a.y - b.y) > 24 ? a.y - b.y : a.x - b.x,
    );
    const maxCellW = Math.max(...sorted.map((c) => c.width));
    const maxCellH = Math.max(...sorted.map((c) => c.height));
    const rows = Math.ceil(sorted.length / cols);

    const neededW =
      config.padding * 2 + cols * maxCellW + config.gap * Math.max(0, cols - 1);
    const neededH =
      config.padding * 2 + rows * maxCellH + config.gap * Math.max(0, rows - 1);

    const nextFrameWidth = Math.max(frame.width, neededW);
    const nextFrameHeight = Math.max(frame.height, neededH);
    const innerW = nextFrameWidth - config.padding * 2;
    const cellW = Math.floor(
      (innerW - config.gap * Math.max(0, cols - 1)) / cols,
    );

    const positionedMap = new Map<
      string,
      { x: number; y: number; width?: number }
    >();

    sorted.forEach((child, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cellX = frame.x + config.padding + col * (cellW + config.gap);
      const cellY = frame.y + config.padding + row * (maxCellH + config.gap);
      const yOffset =
        config.align === 'center'
          ? Math.round((maxCellH - child.height) / 2)
          : config.align === 'end'
            ? maxCellH - child.height
            : 0;
      positionedMap.set(child.id, {
        x: Math.round(cellX),
        y: Math.round(cellY + yOffset),
        width: config.align === 'stretch' ? Math.max(24, cellW) : undefined,
      });
    });

    return allNodes.map((node) => {
      if (node.id === frameId) {
        return {
          ...node,
          width: Math.round(nextFrameWidth),
          height: Math.round(nextFrameHeight),
          autoLayout: config,
        };
      }
      const pos = positionedMap.get(node.id);
      if (!pos) return node;
      return {
        ...node,
        x: pos.x,
        y: pos.y,
        width: pos.width ?? node.width,
      };
    });
  }

  // FLEXBOX MODE
  const sorted = [...children].sort((a, b) =>
    config.direction === 'row' ? a.x - b.x : a.y - b.y,
  );

  const sumPrimarySizes = sorted.reduce(
    (sum, c) => sum + (config.direction === 'row' ? c.width : c.height),
    0,
  );
  const totalPrimary = sumPrimarySizes + config.gap * (sorted.length - 1);

  const maxCross = Math.max(
    ...sorted.map((c) => (config.direction === 'row' ? c.height : c.width)),
  );

  const nextFrameWidth =
    config.direction === 'row'
      ? Math.max(frame.width, totalPrimary + config.padding * 2)
      : Math.max(frame.width, maxCross + config.padding * 2);

  const nextFrameHeight =
    config.direction === 'column'
      ? Math.max(frame.height, totalPrimary + config.padding * 2)
      : Math.max(frame.height, maxCross + config.padding * 2);

  const innerPrimary =
    (config.direction === 'row' ? nextFrameWidth : nextFrameHeight) -
    config.padding * 2;
  const freeSpace = Math.max(0, innerPrimary - totalPrimary);

  let effectiveGap = config.gap;
  let startOffset = 0;
  if (config.justify === 'center') {
    startOffset = Math.round(freeSpace / 2);
  } else if (config.justify === 'end') {
    startOffset = Math.round(freeSpace);
  } else if (config.justify === 'between' && sorted.length > 1) {
    effectiveGap = Math.round(
      (innerPrimary - sumPrimarySizes) / (sorted.length - 1),
    );
  }

  const positionedMap = new Map<
    string,
    { x: number; y: number; width?: number; height?: number }
  >();
  let cursor =
    (config.direction === 'row' ? frame.x : frame.y) +
    config.padding +
    startOffset;

  for (const child of sorted) {
    if (config.direction === 'row') {
      const innerCross = nextFrameHeight - config.padding * 2;
      let y = frame.y + config.padding;
      let hOverride: number | undefined;
      if (config.align === 'center') {
        y =
          frame.y +
          config.padding +
          Math.round((innerCross - child.height) / 2);
      } else if (config.align === 'end') {
        y = frame.y + nextFrameHeight - config.padding - child.height;
      } else if (config.align === 'stretch') {
        hOverride = Math.max(20, Math.round(innerCross));
      }
      positionedMap.set(child.id, {
        x: Math.round(cursor),
        y: Math.round(y),
        height: hOverride,
      });
      cursor += child.width + effectiveGap;
    } else {
      const innerCross = nextFrameWidth - config.padding * 2;
      let x = frame.x + config.padding;
      let wOverride: number | undefined;
      if (config.align === 'center') {
        x =
          frame.x +
          config.padding +
          Math.round((innerCross - child.width) / 2);
      } else if (config.align === 'end') {
        x = frame.x + nextFrameWidth - config.padding - child.width;
      } else if (config.align === 'stretch') {
        wOverride = Math.max(20, Math.round(innerCross));
      }
      positionedMap.set(child.id, {
        x: Math.round(x),
        y: Math.round(cursor),
        width: wOverride,
      });
      cursor += child.height + effectiveGap;
    }
  }

  return allNodes.map((node) => {
    if (node.id === frameId) {
      return {
        ...node,
        width: Math.round(nextFrameWidth),
        height: Math.round(nextFrameHeight),
        autoLayout: config,
      };
    }
    const pos = positionedMap.get(node.id);
    if (!pos) return node;
    return {
      ...node,
      x: pos.x,
      y: pos.y,
      width: pos.width ?? node.width,
      height: pos.height ?? node.height,
    };
  });
}

/**
 * Applies Auto-Layout Flexbox / Grid directly to top-level container cards
 * inside a selected Artboard frame when users configure Artboard Auto-Layout.
 */
export function applyAutoLayoutToArtboard(
  artboard: Artboard,
  allNodes: CanvasNode[],
  config: AutoLayoutConfig,
  primaryArtboardId: string,
): { artboard: Artboard; nodes: CanvasNode[] } {
  const updatedBoard: Artboard = { ...artboard, autoLayout: config };
  if (!config.enabled) {
    return { artboard: updatedBoard, nodes: allNodes };
  }

  // Only reflow unlocked visible non-ambient card/frame/button/rect top containers on this board
  const virtualFrame: CanvasNode = {
    id: `__artboard_virtual_${artboard.id}`,
    artboardId: artboard.id,
    name: artboard.name,
    type: 'frame',
    x: artboard.x,
    y: artboard.y,
    width: artboard.width,
    height: artboard.height,
    rotation: 0,
    radius: artboard.radius,
    opacity: 1,
    fill: artboard.background,
    strokeColor: 'transparent',
    strokeWidth: 0,
    blur: 0,
    shadow: 'none',
    blendMode: 'normal',
    locked: false,
    visible: true,
    autoLayout: config,
  };

  const boardTargets = allNodes.filter((n) => {
    const bId = n.artboardId ?? primaryArtboardId;
    if (bId !== artboard.id || !n.visible || n.locked) return false;
    // Reflow structural container nodes (glass/frame/button) with substantial area
    return (
      (n.type === 'frame' || n.type === 'glass') &&
      n.width >= 180 &&
      n.height >= 80
    );
  });

  if (boardTargets.length < 2) {
    return { artboard: updatedBoard, nodes: allNodes };
  }

  const targetIds = new Set(boardTargets.map((n) => n.id));
  const reflowedSubset = applyAutoLayoutToFrame(
    virtualFrame.id,
    [virtualFrame, ...boardTargets],
    config,
  );
  const deltaMap = new Map<string, { dx: number; dy: number; width: number; height: number }>();
  for (const orig of boardTargets) {
    const moved = reflowedSubset.find((r) => r.id === orig.id);
    if (moved) {
      deltaMap.set(orig.id, {
        dx: moved.x - orig.x,
        dy: moved.y - orig.y,
        width: moved.width,
        height: moved.height,
      });
    }
  }

  const nextNodes = allNodes.map((node) => {
    const bId = node.artboardId ?? primaryArtboardId;
    if (bId !== artboard.id) return node;
    const direct = deltaMap.get(node.id);
    if (direct) {
      return {
        ...node,
        x: node.x + direct.dx,
        y: node.y + direct.dy,
        width: direct.width,
        height: direct.height,
      };
    }
    // Move inner child elements that live inside one of the reflowed cards so card contents stay intact!
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    for (const card of boardTargets) {
      if (targetIds.has(node.id)) continue;
      if (
        cx >= card.x &&
        cx <= card.x + card.width &&
        cy >= card.y &&
        cy <= card.y + card.height
      ) {
        const cardDelta = deltaMap.get(card.id);
        if (cardDelta) {
          return {
            ...node,
            x: node.x + cardDelta.dx,
            y: node.y + cardDelta.dy,
          };
        }
      }
    }
    return node;
  });

  return { artboard: updatedBoard, nodes: nextNodes };
}
