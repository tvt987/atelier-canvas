export type ToolType =
  | 'select'
  | 'hand'
  | 'frame'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'button'
  | 'glass'
  | 'line';

export type NodeType =
  | 'frame'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'button'
  | 'glass'
  | 'line';

export type FillKind = 'solid' | 'gradient' | 'none';

export interface GradientConfig {
  angle: number;
  from: string;
  to: string;
}

export interface FillConfig {
  kind: FillKind;
  color: string;
  gradient?: GradientConfig;
}

export type ShadowPreset = 'none' | 'subtle' | 'elevated' | 'floating' | 'neon';
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';
export type TextAlign = 'left' | 'center' | 'right';

export type ColorTokenKey =
  | 'brandPrimary'
  | 'brandAccent'
  | 'surfaceCanvas'
  | 'surfaceCard'
  | 'surfaceElevated'
  | 'borderSubtle'
  | 'textPrimary'
  | 'textMuted';

export interface TokenBinding {
  fill?: ColorTokenKey;
  fillGradientFrom?: ColorTokenKey;
  fillGradientTo?: ColorTokenKey;
  stroke?: ColorTokenKey;
  textColor?: ColorTokenKey;
  radius?: 'radiusBase';
}

export interface CanvasNode {
  id: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  radius: number;
  opacity: number;
  fill: FillConfig;
  strokeColor: string;
  strokeWidth: number;
  blur: number;
  shadow: ShadowPreset;
  blendMode: BlendMode;
  locked: boolean;
  visible: boolean;
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: TextAlign;
  textColor?: string;
  tokenBinding?: TokenBinding;
}

export interface Artboard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  background: FillConfig;
  tokenBinding?: {
    fill?: ColorTokenKey;
    fillGradientFrom?: ColorTokenKey;
    fillGradientTo?: ColorTokenKey;
  };
}

export interface DesignTokens {
  id: string;
  name: string;
  tagline: string;
  brandPrimary: string;
  brandAccent: string;
  surfaceCanvas: string;
  surfaceCard: string;
  surfaceElevated: string;
  borderSubtle: string;
  textPrimary: string;
  textMuted: string;
  radiusBase: number;
}

export interface DocumentState {
  templateId: string;
  artboard: Artboard;
  nodes: CanvasNode[];
  tokens: DesignTokens;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  orientation: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
  distanceLabel?: string;
  distanceAnchorX?: number;
  distanceAnchorY?: number;
  kind: 'align' | 'spacing';
}

export type UiMode = 'design' | 'dev';
export type ChromeTheme = 'dark' | 'light';
export type Locale = 'en' | 'vi';
export type InspectorTab = 'design' | 'tokens';
export type CodeFormat = 'react-tailwind' | 'css' | 'tokens-json';

export interface CollaboratorCursor {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  x: number;
  y: number;
  activity: string;
  active: boolean;
}
