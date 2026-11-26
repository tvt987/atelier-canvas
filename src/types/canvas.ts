export type ToolType =
  | 'select'
  | 'hand'
  | 'pen'
  | 'frame'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'button'
  | 'glass'
  | 'line'
  | 'image';

export type NodeType =
  | 'frame'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'button'
  | 'glass'
  | 'line'
  | 'path'
  | 'image';

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

export interface PathPoint {
  x: number;
  y: number;
}

export type DashStyle = 'solid' | 'dashed' | 'dotted';

export interface PathConfig {
  points: PathPoint[];
  closed?: boolean;
  smooth?: boolean;
  dashStyle?: DashStyle;
  endArrow?: boolean;
  glow?: boolean;
}

export interface ImageFilterConfig {
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  blur: number;
}

export interface AutoLayoutConfig {
  enabled: boolean;
  direction: 'row' | 'column';
  gap: number;
  padding: number;
  align: 'start' | 'center' | 'end';
}

export type EntranceAnimation =
  | 'none'
  | 'fade-up'
  | 'spring-scale'
  | 'slide-left'
  | 'elastic-pop'
  | 'float-levitate'
  | 'shimmer-glow';

export type EasingPreset = 'spring' | 'expo-out' | 'smooth';
export type HoverEffect = 'none' | 'lift-glow' | 'scale' | 'glass-tilt';
export type ScreenTransition = 'slide-left' | 'dissolve' | 'spring-scale';

export type ClickAction =
  | 'none'
  | 'toast'
  | 'pulse-target'
  | 'switch-template'
  | 'toggle-theme'
  | 'navigate_artboard';

export interface PrototypeConfig {
  entrance: EntranceAnimation;
  durationMs: number;
  delayMs: number;
  easing: EasingPreset;
  hoverEffect: HoverEffect;
  clickAction: ClickAction;
  clickPayload?: string;
  targetArtboardId?: string;
  transition?: ScreenTransition;
}

export interface CanvasNode {
  id: string;
  artboardId?: string;
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
  pathData?: PathConfig;
  autoLayout?: AutoLayoutConfig;
  prototype?: PrototypeConfig;
  imageSrc?: string;
  objectFit?: 'cover' | 'contain';
  imageFilter?: ImageFilterConfig;
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
  artboards?: Artboard[];
  nodes: CanvasNode[];
  tokens: DesignTokens;
}

export interface AtelierProjectFile {
  format: 'atelier-canvas-project';
  version: '3.0';
  exportedAt: string;
  document: DocumentState;
}

export interface DesignSnapshot {
  id: string;
  label: string;
  timestamp: string;
  doc: DocumentState;
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

export type UiMode = 'design' | 'prototype' | 'dev';
export type ChromeTheme = 'dark' | 'light';
export type Locale = 'en' | 'vi';
export type InspectorTab = 'design' | 'tokens';
export type LeftRailTab = 'layers' | 'assets';
export type CodeFormat = 'react-tailwind' | 'css' | 'tokens-json';
export type DeviceFrameMode = 'studio' | 'macbook' | 'iphone';

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
