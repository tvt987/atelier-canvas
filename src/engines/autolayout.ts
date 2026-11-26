import type { AutoLayoutConfig, CanvasNode } from '../types/canvas';

/**
 * Deterministic Figma-style Auto-Layout engine for Frame containers.
 * Finds all visible unlocked nodes whose center resides inside the frame,
 * sorts them along the primary axis, reflows them with exact padding + gap + cross-axis align,
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
      enabled: true,
      direction: 'row',
      gap: 16,
      padding: 20,
      align: 'center',
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

  const sorted = [...children].sort((a, b) =>
    config.direction === 'row' ? a.x - b.x : a.y - b.y,
  );

  const totalPrimary =
    sorted.reduce(
      (sum, c) => sum + (config.direction === 'row' ? c.width : c.height),
      0,
    ) +
    config.gap * (sorted.length - 1);

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

  const positionedMap = new Map<string, { x: number; y: number }>();
  let cursor =
    (config.direction === 'row' ? frame.x : frame.y) + config.padding;

  for (const child of sorted) {
    if (config.direction === 'row') {
      const innerCross = nextFrameHeight - config.padding * 2;
      let y = frame.y + config.padding;
      if (config.align === 'center') {
        y = frame.y + config.padding + Math.round((innerCross - child.height) / 2);
      } else if (config.align === 'end') {
        y = frame.y + nextFrameHeight - config.padding - child.height;
      }
      positionedMap.set(child.id, { x: Math.round(cursor), y: Math.round(y) });
      cursor += child.width + config.gap;
    } else {
      const innerCross = nextFrameWidth - config.padding * 2;
      let x = frame.x + config.padding;
      if (config.align === 'center') {
        x = frame.x + config.padding + Math.round((innerCross - child.width) / 2);
      } else if (config.align === 'end') {
        x = frame.x + nextFrameWidth - config.padding - child.width;
      }
      positionedMap.set(child.id, { x: Math.round(x), y: Math.round(cursor) });
      cursor += child.height + config.gap;
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
    return { ...node, x: pos.x, y: pos.y };
  });
}
