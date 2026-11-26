import type {
  CanvasNode,
  DesignTokens,
  NodeType,
  PathPoint,
} from '../types/canvas';
import { normalizePathPoints } from './bezier';
import { DEFAULT_IMAGE_FILTER, STUDIO_PHOTOS } from './media';

let counter = 1;

export function createImageNode(
  imageSrc: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  tokens: DesignTokens,
  artboardId?: string,
): CanvasNode {
  const id = `node-image-${Date.now().toString(36)}-${counter++}`;
  return {
    id,
    artboardId,
    name,
    type: 'image',
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(40, Math.round(width)),
    height: Math.max(40, Math.round(height)),
    rotation: 0,
    radius: tokens.radiusBase,
    opacity: 1,
    fill: { kind: 'solid', color: tokens.surfaceCard },
    strokeColor: tokens.borderSubtle,
    strokeWidth: 1,
    blur: 0,
    shadow: 'elevated',
    blendMode: 'normal',
    locked: false,
    visible: true,
    imageSrc,
    objectFit: 'cover',
    imageFilter: { ...DEFAULT_IMAGE_FILTER },
    tokenBinding: { stroke: 'borderSubtle', radius: 'radiusBase' },
  };
}

export function createPathNodeFromPoints(
  rawPoints: PathPoint[],
  tokens: DesignTokens,
  artboardId?: string,
): CanvasNode {
  const normalized = normalizePathPoints(rawPoints, 10);
  const id = `node-path-${Date.now().toString(36)}-${counter++}`;
  return {
    id,
    artboardId,
    name: `Vector Curve ${counter}`,
    type: 'path',
    x: normalized.x,
    y: normalized.y,
    width: normalized.width,
    height: normalized.height,
    rotation: 0,
    radius: 0,
    opacity: 1,
    fill: { kind: 'none', color: 'transparent' },
    strokeColor: tokens.brandAccent,
    strokeWidth: 2.5,
    blur: 0,
    shadow: 'none',
    blendMode: 'normal',
    locked: false,
    visible: true,
    tokenBinding: { stroke: 'brandAccent' },
    pathData: {
      points: normalized.points,
      closed: false,
      smooth: true,
      dashStyle: 'solid',
      endArrow: true,
      glow: true,
    },
  };
}

export function createNodeFromTool(
  type: Exclude<NodeType, 'path'>,
  x: number,
  y: number,
  width: number,
  height: number,
  tokens: DesignTokens,
  artboardId?: string,
): CanvasNode {
  if (type === 'image') {
    const photo = STUDIO_PHOTOS[counter % STUDIO_PHOTOS.length];
    return createImageNode(
      photo.src,
      photo.title,
      x,
      y,
      width || photo.defaultW,
      height || photo.defaultH,
      tokens,
      artboardId,
    );
  }

  const id = `node-${type}-${Date.now().toString(36)}-${counter++}`;
  const defaultSizes: Record<Exclude<NodeType, 'path' | 'image'>, { w: number; h: number }> = {
    frame: { w: 280, h: 180 },
    rect: { w: 180, h: 120 },
    ellipse: { w: 130, h: 130 },
    text: { w: 240, h: 42 },
    button: { w: 176, h: 44 },
    glass: { w: 240, h: 150 },
    line: { w: 200, h: 2 },
  };

  const w = Math.max(type === 'line' ? 24 : 20, Math.round(width || defaultSizes[type].w));
  const h = Math.max(type === 'line' ? 2 : 16, Math.round(height || defaultSizes[type].h));

  const common = {
    id,
    artboardId,
    x: Math.round(x),
    y: Math.round(y),
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    strokeColor: tokens.borderSubtle,
    strokeWidth: 0,
    blur: 0,
    shadow: 'none' as const,
    blendMode: 'normal' as const,
    locked: false,
    visible: true,
  };

  switch (type) {
    case 'frame':
      return {
        ...common,
        name: `Frame ${counter}`,
        type: 'frame',
        radius: tokens.radiusBase,
        fill: { kind: 'solid', color: tokens.surfaceCard },
        strokeColor: tokens.borderSubtle,
        strokeWidth: 1,
        tokenBinding: {
          fill: 'surfaceCard',
          stroke: 'borderSubtle',
          radius: 'radiusBase',
        },
        autoLayout: {
          enabled: false,
          direction: 'row',
          gap: 16,
          padding: 20,
          align: 'center',
        },
      };
    case 'rect':
      return {
        ...common,
        name: `Card ${counter}`,
        type: 'rect',
        radius: tokens.radiusBase,
        fill: {
          kind: 'gradient',
          color: tokens.brandPrimary,
          gradient: { angle: 135, from: tokens.brandPrimary, to: tokens.brandAccent },
        },
        shadow: 'subtle',
        tokenBinding: {
          fill: 'brandPrimary',
          fillGradientFrom: 'brandPrimary',
          fillGradientTo: 'brandAccent',
          radius: 'radiusBase',
        },
      };
    case 'ellipse':
      return {
        ...common,
        name: `Orb ${counter}`,
        type: 'ellipse',
        radius: Math.round(Math.max(w, h) / 2),
        fill: {
          kind: 'gradient',
          color: tokens.brandAccent,
          gradient: { angle: 135, from: tokens.brandPrimary, to: tokens.brandAccent },
        },
        shadow: 'neon',
        tokenBinding: {
          fill: 'brandPrimary',
          fillGradientFrom: 'brandPrimary',
          fillGradientTo: 'brandAccent',
        },
      };
    case 'text':
      return {
        ...common,
        name: `Heading ${counter}`,
        type: 'text',
        radius: 0,
        fill: { kind: 'none', color: 'transparent' },
        text: 'Design System Spec',
        fontFamily: 'Space Grotesk',
        fontWeight: 600,
        fontSize: 24,
        letterSpacing: -0.5,
        lineHeight: 1.25,
        textAlign: 'left',
        textColor: tokens.textPrimary,
        tokenBinding: { textColor: 'textPrimary' },
      };
    case 'button':
      return {
        ...common,
        name: `Button ${counter}`,
        type: 'button',
        radius: 12,
        fill: {
          kind: 'gradient',
          color: tokens.brandPrimary,
          gradient: { angle: 120, from: tokens.brandPrimary, to: tokens.brandAccent },
        },
        shadow: 'neon',
        text: 'Continue',
        fontFamily: 'Space Grotesk',
        fontWeight: 600,
        fontSize: 14,
        textAlign: 'center',
        textColor: '#FFFFFF',
        tokenBinding: {
          fill: 'brandPrimary',
          fillGradientFrom: 'brandPrimary',
          fillGradientTo: 'brandAccent',
        },
        prototype: {
          entrance: 'none',
          durationMs: 400,
          delayMs: 0,
          easing: 'spring',
          hoverEffect: 'lift-glow',
          clickAction: 'toast',
          clickPayload: 'Action triggered',
        },
      };
    case 'glass':
      return {
        ...common,
        name: `Glass Card ${counter}`,
        type: 'glass',
        radius: tokens.radiusBase,
        blur: 20,
        fill: {
          kind: 'gradient',
          color: tokens.surfaceCard,
          gradient: { angle: 145, from: tokens.surfaceCard, to: tokens.surfaceElevated },
        },
        strokeColor: tokens.borderSubtle,
        strokeWidth: 1,
        shadow: 'elevated',
        tokenBinding: {
          fill: 'surfaceCard',
          fillGradientFrom: 'surfaceCard',
          fillGradientTo: 'surfaceElevated',
          stroke: 'borderSubtle',
          radius: 'radiusBase',
        },
      };
    case 'line':
      return {
        ...common,
        height: Math.max(2, Math.min(h, 4)),
        name: `Connector ${counter}`,
        type: 'line',
        radius: 2,
        fill: { kind: 'solid', color: tokens.brandAccent },
        tokenBinding: { fill: 'brandAccent' },
      };
  }
}
