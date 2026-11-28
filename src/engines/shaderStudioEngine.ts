import type { CanvasNode, DesignTokens, DocumentState } from '../types/canvas';
import {
  auditNodeContrast,
  autoFixContrastToAAA,
  evaluateWcag,
} from './wcag';

export type ShaderPresetId =
  | 'mesh-warp'
  | 'liquid-iridescence'
  | 'kinetic-dot-orbit'
  | 'liquid-glass-refract';

export type ShaderPaletteId =
  | 'obsidian-electric'
  | 'swiss-vermilion'
  | 'kyoto-jade'
  | 'iridescent-pearl';

export type ShaderCodeTarget = 'glsl' | 'react-tailwind' | 'swiftui';

export type SandboxInteractiveState =
  | 'default'
  | 'hover'
  | 'pressed'
  | 'focus'
  | 'disabled';

export interface ShaderPalettePreset {
  id: ShaderPaletteId;
  name: string;
  shortName: string;
  colors: [string, string, string, string];
  accentHex: string;
}

export interface ShaderPresetMeta {
  id: ShaderPresetId;
  name: string;
  shortName: string;
  tagline: string;
  defaultWarp: number;
  defaultSpeed: number;
  defaultGrain: number;
  defaultScale: number;
}

export interface ShaderStudioConfig {
  enabled: boolean;
  preset: ShaderPresetId;
  paletteId: ShaderPaletteId;
  colors: [string, string, string, string];
  speed: number;
  warp: number;
  grain: number;
  scale: number;
  intensity: number;
}

export interface ZLayerStratumMeta {
  id: 'shader' | 'surface' | 'cards' | 'controls';
  tierIndex: number;
  label: string;
  fullLabel: string;
  baseAltitudePx: number;
  accentColor: string;
}

export interface ZStackLayerGeometry {
  nodeId: string;
  name: string;
  nodeType: CanvasNode['type'];
  stratumId: ZLayerStratumMeta['id'];
  stratumLabel: string;
  accentColor: string;
  zOffsetPx: number;
  shadowBlurPx: number;
  shadowOpacity: number;
  hitOrder: number;
}

export interface Pointer3DTiltResult {
  rotateX: number;
  rotateY: number;
  tiltX: number;
  tiltY: number;
}

export interface CompiledShaderCodeResult {
  target: ShaderCodeTarget;
  filename: string;
  languageLabel: string;
  code: string;
  lines: string[];
  changedLineNumbers: number[];
}

export interface SandboxStateVisualSpec {
  state: SandboxInteractiveState;
  transform: string;
  filter: string;
  boxShadow: string;
  opacityMultiplier: number;
  outline: string;
  tailwindClasses: string;
  swiftUiModifier: string;
}

export interface ArtboardWcagRepairResult {
  nextNodes: CanvasNode[];
  repairedNodeIds: string[];
  repairedCount: number;
  totalAudited: number;
  passingAAABefore: number;
  passingAAAAfter: number;
  minRatioBefore: number;
  minRatioAfter: number;
}

export const SHADER_PRESETS: ShaderPresetMeta[] = [
  {
    id: 'mesh-warp',
    name: 'Mesh Gradient Warp',
    shortName: 'Mesh Warp',
    tagline: 'Organic 4-color domain-warped simplex fluid field',
    defaultWarp: 1.15,
    defaultSpeed: 1.0,
    defaultGrain: 0.05,
    defaultScale: 1.2,
  },
  {
    id: 'liquid-iridescence',
    name: 'Liquid Thin-Film Iridescence',
    shortName: 'Iridescence',
    tagline: 'Pearlescent chrome interference waves reacting to pointer velocity',
    defaultWarp: 1.35,
    defaultSpeed: 1.1,
    defaultGrain: 0.04,
    defaultScale: 1.45,
  },
  {
    id: 'kinetic-dot-orbit',
    name: 'Kinetic Dot-Orbit',
    shortName: 'Dot-Orbit',
    tagline: 'Swiss geometric rotating halftone orbital interference matrix',
    defaultWarp: 0.95,
    defaultSpeed: 1.05,
    defaultGrain: 0.03,
    defaultScale: 1.35,
  },
  {
    id: 'liquid-glass-refract',
    name: 'Liquid Glass Refract',
    shortName: 'Liquid Glass',
    tagline: 'Caustic frosted glass RGB dispersion & specular Fresnel lens',
    defaultWarp: 1.25,
    defaultSpeed: 0.9,
    defaultGrain: 0.05,
    defaultScale: 1.25,
  },
];

export const SHADER_PALETTES: ShaderPalettePreset[] = [
  {
    id: 'obsidian-electric',
    name: 'Obsidian Electric',
    shortName: 'Obsidian',
    colors: ['#0A0D1E', '#4F46E5', '#06B6D4', '#A855F7'],
    accentHex: '#06B6D4',
  },
  {
    id: 'swiss-vermilion',
    name: 'Swiss Vermilion',
    shortName: 'Vermilion',
    colors: ['#16090D', '#E11D48', '#F97316', '#FDE047'],
    accentHex: '#F43F5E',
  },
  {
    id: 'kyoto-jade',
    name: 'Kyoto Jade',
    shortName: 'Kyoto Jade',
    colors: ['#061517', '#0D9488', '#34D399', '#38BDF8'],
    accentHex: '#34D399',
  },
  {
    id: 'iridescent-pearl',
    name: 'Iridescent Pearl',
    shortName: 'Pearl',
    colors: ['#17132B', '#EC4899', '#38BDF8', '#E0F2FE'],
    accentHex: '#EC4899',
  },
];

export const SANDBOX_STATES: Array<{
  id: SandboxInteractiveState;
  label: string;
  shortLabel: string;
}> = [
  { id: 'default', label: 'Default', shortLabel: 'Default' },
  { id: 'hover', label: 'Hover', shortLabel: 'Hover' },
  { id: 'pressed', label: 'Pressed', shortLabel: 'Pressed' },
  { id: 'focus', label: 'Focus', shortLabel: 'Focus' },
  { id: 'disabled', label: 'Disabled', shortLabel: 'Disabled' },
];

export const Z_STRATA_META: ZLayerStratumMeta[] = [
  {
    id: 'shader',
    tierIndex: 0,
    label: 'Shader',
    fullLabel: 'Z+0 Shader',
    baseAltitudePx: 0,
    accentColor: '#06B6D4',
  },
  {
    id: 'surface',
    tierIndex: 1,
    label: 'Surface',
    fullLabel: 'Z+40 Surface',
    baseAltitudePx: 50,
    accentColor: '#6366F1',
  },
  {
    id: 'cards',
    tierIndex: 2,
    label: 'Cards',
    fullLabel: 'Z+80 Cards',
    baseAltitudePx: 100,
    accentColor: '#06B6D4',
  },
  {
    id: 'controls',
    tierIndex: 3,
    label: 'Type & CTA',
    fullLabel: 'Z+120 Type & CTA',
    baseAltitudePx: 150,
    accentColor: '#F43F5E',
  },
];

export const DEFAULT_SHADER_CONFIG: ShaderStudioConfig = {
  enabled: true,
  preset: 'mesh-warp',
  paletteId: 'obsidian-electric',
  colors: ['#0A0D1E', '#4F46E5', '#06B6D4', '#A855F7'],
  speed: 1.0,
  warp: 1.15,
  grain: 0.05,
  scale: 1.2,
  intensity: 0.92,
};

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeHexColor(hex: string, fallback: string): string {
  const trimmed = hex.trim();
  if (!HEX_COLOR_RE.test(trimmed)) return fallback;
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return trimmed.toUpperCase();
}

export function hexToVec3(hex: string): [number, number, number] {
  const safe = normalizeHexColor(hex, '#6366F1');
  const r = parseInt(safe.slice(1, 3), 16) / 255;
  const g = parseInt(safe.slice(3, 5), 16) / 255;
  const b = parseInt(safe.slice(5, 7), 16) / 255;
  return [
    Math.round(r * 10000) / 10000,
    Math.round(g * 10000) / 10000,
    Math.round(b * 10000) / 10000,
  ];
}

export function getShaderPaletteById(id: ShaderPaletteId): ShaderPalettePreset {
  return SHADER_PALETTES.find((p) => p.id === id) ?? SHADER_PALETTES[0];
}

export function getShaderPresetById(id: ShaderPresetId): ShaderPresetMeta {
  return SHADER_PRESETS.find((p) => p.id === id) ?? SHADER_PRESETS[0];
}

export function sanitizeShaderConfig(
  partial: Partial<ShaderStudioConfig>,
): ShaderStudioConfig {
  const palette = getShaderPaletteById(
    partial.paletteId ?? DEFAULT_SHADER_CONFIG.paletteId,
  );
  const presetMeta = getShaderPresetById(
    partial.preset ?? DEFAULT_SHADER_CONFIG.preset,
  );
  const rawColors = partial.colors ?? palette.colors;
  const colors: [string, string, string, string] = [
    normalizeHexColor(rawColors[0] ?? palette.colors[0], palette.colors[0]),
    normalizeHexColor(rawColors[1] ?? palette.colors[1], palette.colors[1]),
    normalizeHexColor(rawColors[2] ?? palette.colors[2], palette.colors[2]),
    normalizeHexColor(rawColors[3] ?? palette.colors[3], palette.colors[3]),
  ];

  return {
    enabled: partial.enabled ?? DEFAULT_SHADER_CONFIG.enabled,
    preset: presetMeta.id,
    paletteId: palette.id,
    colors,
    speed: Math.round(clampNumber(partial.speed ?? DEFAULT_SHADER_CONFIG.speed, 0.1, 3.0) * 100) / 100,
    warp: Math.round(clampNumber(partial.warp ?? DEFAULT_SHADER_CONFIG.warp, 0.0, 2.0) * 100) / 100,
    grain: Math.round(clampNumber(partial.grain ?? DEFAULT_SHADER_CONFIG.grain, 0.0, 0.35) * 1000) / 1000,
    scale: Math.round(clampNumber(partial.scale ?? DEFAULT_SHADER_CONFIG.scale, 0.5, 3.0) * 100) / 100,
    intensity: Math.round(clampNumber(partial.intensity ?? DEFAULT_SHADER_CONFIG.intensity, 0.15, 1.0) * 100) / 100,
  };
}

export const VERTEX_SHADER_ES300 = `#version 300 es
precision highp float;

const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2( 3.0, -1.0),
  vec2(-1.0,  3.0)
);

out vec2 v_uv;

void main() {
  vec2 pos = POSITIONS[gl_VertexID];
  v_uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

const GLSL_NOISE_HELPERS = `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    value += amp * vnoise(p);
    p = rot * p * 2.03 + vec2(17.1, 31.7);
    amp *= 0.5;
  }
  return value;
}
`;

export function getFragmentShaderSource(preset: ShaderPresetId): string {
  const header = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform vec2 u_pointerVel;
uniform float u_warp;
uniform float u_grain;
uniform float u_scale;
uniform float u_intensity;
uniform vec3 u_color0;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
${GLSL_NOISE_HELPERS}
`;

  if (preset === 'mesh-warp') {
    return `${header}
void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * u_scale;
  vec2 ptr = (u_pointer - 0.5) * vec2(aspect, 1.0) * u_scale;

  float t = u_time * 0.42;
  float ptrDist = length(p - ptr);
  vec2 ptrPush = normalize(p - ptr + vec2(0.0001)) * exp(-ptrDist * 2.4) * (0.14 + length(u_pointerVel) * 0.35);

  vec2 q = vec2(
    fbm(p * 1.15 + vec2(t * 0.65, -t * 0.42)),
    fbm(p * 1.15 + vec2(-t * 0.38, t * 0.58) + vec2(5.2, 1.3))
  );
  vec2 r = vec2(
    fbm(p * 1.35 + u_warp * 1.45 * q + ptrPush + vec2(1.7, 9.2) + t * 0.25),
    fbm(p * 1.35 + u_warp * 1.45 * q - ptrPush + vec2(8.3, 2.8) - t * 0.22)
  );

  float field = fbm(p * 0.95 + u_warp * 1.15 * r);
  float lobeA = smoothstep(0.15, 0.85, q.x * 0.72 + sin(p.x * 1.6 + t) * 0.22 + 0.16);
  float lobeB = smoothstep(0.12, 0.88, r.y * 0.78 + cos(p.y * 1.5 - t * 0.8) * 0.22 + 0.14);
  float ribbon = pow(smoothstep(0.32, 0.92, field), 1.25);

  vec3 col = mix(u_color0, u_color1, lobeA * 0.92);
  col = mix(col, u_color2, lobeB * 0.86);
  col = mix(col, u_color3, ribbon * 0.78);

  // Subtle luminous caustic crest
  float crest = exp(-abs(field - 0.58) * 14.0) * 0.22;
  col += mix(u_color2, u_color3, 0.55) * crest;

  // Gentle studio edge framing
  float vig = 1.0 - smoothstep(0.55, 1.38, length((uv - 0.5) * vec2(1.15, 1.05)));
  col *= mix(0.72, 1.08, vig);

  // Fine tactile grain
  float g = (hash21(gl_FragCoord.xy + fract(u_time) * 97.0) - 0.5) * u_grain;
  col = clamp(col + vec3(g), 0.0, 1.0);

  outColor = vec4(col, u_intensity);
}
`;
  }

  if (preset === 'liquid-iridescence') {
    return `${header}
void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * u_scale * 1.35;
  vec2 ptr = (u_pointer - 0.5) * vec2(aspect, 1.0) * u_scale * 1.35;

  float t = u_time * 0.55;
  float velBoost = clamp(length(u_pointerVel) * 2.8, 0.0, 1.6);
  float dPtr = length(p - ptr);
  float ripple = sin(dPtr * 10.5 - t * 4.2) * exp(-dPtr * 1.9) * (0.24 + velBoost * 0.35);

  vec2 w = p;
  for (int i = 0; i < 3; i++) {
    float fi = float(i + 1);
    w += vec2(
      sin(w.y * (1.7 * fi) + t * 0.9 + ripple),
      cos(w.x * (1.7 * fi) - t * 0.8 - ripple)
    ) * (0.26 * u_warp / fi);
  }

  float filmPhase = fbm(w * 1.25 + vec2(t * 0.18, -t * 0.14)) * 2.1 + length(w - p) * 0.72 + ripple;
  vec3 thinFilm = 0.5 + 0.5 * cos(6.28318 * (filmPhase + vec3(0.0, 0.31, 0.64)));

  vec3 baseMix = mix(u_color0, u_color1, smoothstep(0.15, 0.85, sin(w.x * 1.4 + t * 0.5) * 0.5 + 0.5));
  baseMix = mix(baseMix, u_color2, smoothstep(0.2, 0.9, cos(w.y * 1.6 - t * 0.4) * 0.5 + 0.5) * 0.78);

  vec3 col = mix(baseMix, thinFilm * mix(u_color2, u_color3, 0.55) + u_color1 * 0.25, 0.54);

  // Liquid chrome specular ridge
  float ridge = pow(clamp(1.0 - abs(sin(filmPhase * 5.2)), 0.0, 1.0), 5.0);
  col += mix(u_color3, vec3(1.0), 0.55) * ridge * 0.52;

  float g = (hash21(gl_FragCoord.xy + fract(u_time) * 63.0) - 0.5) * u_grain;
  col = clamp(col + vec3(g), 0.0, 1.0);

  outColor = vec4(col, u_intensity);
}
`;
  }

  if (preset === 'kinetic-dot-orbit') {
    return `${header}
void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 ptr = (u_pointer - 0.5) * vec2(aspect, 1.0);

  float t = u_time * 0.62;
  float angle = 0.24 * sin(t * 0.35);
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 rp = rot * p;

  // Concentric orbital harmonic wave
  vec2 orbA = vec2(cos(t * 0.75) * 0.28, sin(t * 0.62) * 0.22);
  vec2 orbB = vec2(cos(-t * 0.55 + 2.1) * 0.34, sin(-t * 0.71 + 1.2) * 0.24);
  float wA = sin(length(p - orbA) * 18.0 * u_scale - t * 3.1);
  float wB = cos(length(p - orbB) * 15.0 * u_scale + t * 2.4);
  float wPtr = exp(-length(p - ptr) * 3.2) * 1.1;
  float wave = clamp(0.5 + 0.34 * (wA * 0.6 + wB * 0.4) * (0.5 + 0.6 * u_warp) + wPtr * 0.45, 0.0, 1.0);

  // Swiss halftone dot matrix
  float gridDensity = 24.0 * u_scale;
  vec2 grid = rp * gridDensity;
  vec2 cell = fract(grid) - 0.5;
  float dotRadius = mix(0.08, 0.43, wave);
  float dist = length(cell);
  float dotMask = 1.0 - smoothstep(dotRadius - 0.055, dotRadius + 0.035, dist);

  // Subtle atmospheric glow + orbital tracks
  float bgGlow = exp(-length(p - orbA) * 2.1) * 0.42 + exp(-length(p - orbB) * 2.3) * 0.36;
  float ring = exp(-abs(length(p) - (0.34 + 0.04 * sin(t))) * 48.0) * 0.26;
  vec3 bgCol = mix(u_color0, u_color1, bgGlow * 0.75) + u_color2 * ring;

  vec3 dotColor = mix(u_color1, u_color2, smoothstep(0.15, 0.78, wave));
  dotColor = mix(dotColor, u_color3, smoothstep(0.62, 0.98, wave));

  vec3 col = mix(bgCol, dotColor, dotMask * 0.94);

  float g = (hash21(gl_FragCoord.xy + fract(u_time) * 41.0) - 0.5) * u_grain;
  col = clamp(col + vec3(g), 0.0, 1.0);

  outColor = vec4(col, u_intensity);
}
`;
  }

  // liquid-glass-refract
  return `${header}
vec3 sampleGlassField(vec2 uvSample, float t) {
  float a = sin(uvSample.x * 4.2 + t * 0.7) * cos(uvSample.y * 3.8 - t * 0.55);
  float b = fbm(uvSample * 2.1 * u_scale + vec2(t * 0.3, -t * 0.22));
  vec3 c = mix(u_color0, u_color1, smoothstep(-0.3, 0.8, a * 0.5 + b * 0.65));
  c = mix(c, u_color2, smoothstep(0.28, 0.86, b));
  c = mix(c, u_color3, pow(smoothstep(0.55, 0.96, b + a * 0.2), 1.6) * 0.72);
  return c;
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 ptr = (u_pointer - 0.5) * vec2(aspect, 1.0);

  float t = u_time * 0.48;
  float dPtr = length(p - ptr);

  // Refracting caustic glass surface height derivatives
  float eps = 0.015;
  float hC = fbm(p * 2.4 * u_scale + vec2(t * 0.35, -t * 0.25)) + exp(-dPtr * 3.0) * 0.42;
  float hX = fbm((p + vec2(eps, 0.0)) * 2.4 * u_scale + vec2(t * 0.35, -t * 0.25)) + exp(-length(p + vec2(eps, 0.0) - ptr) * 3.0) * 0.42;
  float hY = fbm((p + vec2(0.0, eps)) * 2.4 * u_scale + vec2(t * 0.35, -t * 0.25)) + exp(-length(p + vec2(0.0, eps) - ptr) * 3.0) * 0.42;

  vec2 normalXY = vec2(hX - hC, hY - hC) / eps;
  float disp = 0.022 * (0.4 + u_warp * 0.7);

  // Chromatic dispersion across RGB channels
  float colR = sampleGlassField(uv + normalXY * disp * 1.35, t).r;
  float colG = sampleGlassField(uv + normalXY * disp * 0.95, t).g;
  float colB = sampleGlassField(uv + normalXY * disp * 0.55, t).b;
  vec3 col = vec3(colR, colG, colB);

  // Caustic intersection ribbons + Fresnel specular highlight
  float caustic = pow(clamp(length(normalXY) * 0.45, 0.0, 1.0), 2.1);
  vec3 lightDir = normalize(vec3(ptr - p, 0.45));
  vec3 surfNorm = normalize(vec3(-normalXY * 0.45, 1.0));
  float spec = pow(max(dot(surfNorm, lightDir), 0.0), 18.0);

  col += mix(u_color2, u_color3, 0.55) * caustic * 0.45;
  col += vec3(0.95, 0.98, 1.0) * spec * 0.42;

  // Frosted sheen vignette
  float sheen = smoothstep(0.85, 0.15, abs(uv.x - uv.y * 0.65 - 0.15)) * 0.08;
  col += vec3(sheen);

  float g = (hash21(gl_FragCoord.xy + fract(u_time) * 83.0) - 0.5) * u_grain;
  col = clamp(col + vec3(g), 0.0, 1.0);

  outColor = vec4(col, u_intensity);
}
`;
}

export function classifyLayerStratum(node: CanvasNode): ZLayerStratumMeta {
  if (node.type === 'ellipse' && node.opacity < 0.55) {
    return Z_STRATA_META[1]; // Surface / Ambient Glow
  }
  if (node.type === 'frame') {
    return Z_STRATA_META[1]; // Surface
  }
  if (
    node.type === 'glass' ||
    node.type === 'rect' ||
    node.type === 'line' ||
    node.type === 'path'
  ) {
    return Z_STRATA_META[2]; // Cards & Vector Surfaces
  }
  return Z_STRATA_META[3]; // Type, Image & Interactive CTA
}

export function computeStrataAltitudes(explodeFactor: number): Array<
  ZLayerStratumMeta & { liveZPx: number; liveBadgeLabel: string }
> {
  const f = clampNumber(explodeFactor, 0, 1);
  return Z_STRATA_META.map((stratum) => {
    const liveZPx = Math.round(stratum.baseAltitudePx * f);
    return {
      ...stratum,
      liveZPx,
      liveBadgeLabel: `Z+${liveZPx} ${stratum.label}`,
    };
  });
}

export function computeZStackGeometry(
  nodes: CanvasNode[],
  explodeFactor: number,
): ZStackLayerGeometry[] {
  const f = clampNumber(explodeFactor, 0, 1);
  const visibleNodes = nodes.filter((n) => n.visible);

  const computed = visibleNodes.map((node, index) => {
    const stratum = classifyLayerStratum(node);
    const microElevation =
      node.type === 'button' ? 10 : node.type === 'text' ? 5 : (index % 3) * 2;
    const zOffsetPx = Math.round((stratum.baseAltitudePx + microElevation) * f);
    const shadowBlurPx = Math.round(12 + zOffsetPx * 0.26);
    const shadowOpacity =
      Math.round(clampNumber(0.24 + (zOffsetPx / 180) * 0.34, 0.12, 0.62) * 100) /
      100;

    return {
      nodeId: node.id,
      name: node.name,
      nodeType: node.type,
      stratumId: stratum.id,
      stratumLabel: `Z+${zOffsetPx} ${stratum.label}`,
      accentColor: stratum.accentColor,
      zOffsetPx,
      shadowBlurPx,
      shadowOpacity,
      hitOrder: 0,
    };
  });

  // Sort hitOrder so highest Z layers win click hit-testing deterministically
  const ranked = [...computed].sort((a, b) => b.zOffsetPx - a.zOffsetPx);
  const orderMap = new Map<string, number>();
  ranked.forEach((item, rankIdx) => {
    orderMap.set(item.nodeId, ranked.length - rankIdx);
  });

  return computed.map((item) => ({
    ...item,
    hitOrder: orderMap.get(item.nodeId) ?? 1,
  }));
}

export function computePointer3DTilt(
  baseRotateX: number,
  baseRotateY: number,
  normalizedPointerX: number,
  normalizedPointerY: number,
  tiltEnabled: boolean,
  maxTiltDeg = 7.5,
): Pointer3DTiltResult {
  const clampedBaseX = clampNumber(baseRotateX, 0, 72);
  const clampedBaseY = clampNumber(baseRotateY, -60, 60);
  if (!tiltEnabled) {
    return {
      rotateX: clampedBaseX,
      rotateY: clampedBaseY,
      tiltX: 0,
      tiltY: 0,
    };
  }
  const nx = clampNumber(normalizedPointerX, -1, 1);
  const ny = clampNumber(normalizedPointerY, -1, 1);
  const tiltX = Math.round(-ny * maxTiltDeg * 100) / 100;
  const tiltY = Math.round(nx * maxTiltDeg * 100) / 100;

  return {
    rotateX: Math.round(clampNumber(clampedBaseX + tiltX, 0, 78) * 100) / 100,
    rotateY: Math.round(clampNumber(clampedBaseY + tiltY, -68, 68) * 100) / 100,
    tiltX,
    tiltY,
  };
}

export function computeInteractiveStateStyle(
  state: SandboxInteractiveState,
  accentHex = '#06B6D4',
): SandboxStateVisualSpec {
  switch (state) {
    case 'hover':
      return {
        state,
        transform: 'translate3d(0, -3px, 0) scale(1.02)',
        filter: 'brightness(1.12) saturate(1.08)',
        boxShadow: `0 16px 34px -6px ${accentHex}66, 0 0 0 1px ${accentHex}88`,
        opacityMultiplier: 1,
        outline: 'none',
        tailwindClasses:
          'hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-110 transition-all duration-200',
        swiftUiModifier: '.scaleEffect(isHovering ? 1.02 : 1.0).brightness(isHovering ? 0.06 : 0.0)',
      };
    case 'pressed':
      return {
        state,
        transform: 'translate3d(0, 1px, 0) scale(0.97)',
        filter: 'brightness(0.93) contrast(1.04)',
        boxShadow: `0 4px 12px -2px ${accentHex}55, inset 0 2px 6px rgba(0,0,0,0.32)`,
        opacityMultiplier: 1,
        outline: 'none',
        tailwindClasses:
          'active:translate-y-px active:scale-[0.97] active:brightness-95 transition-transform duration-100',
        swiftUiModifier: '.scaleEffect(configuration.isPressed ? 0.97 : 1.0)',
      };
    case 'focus':
      return {
        state,
        transform: 'translate3d(0, -1px, 0)',
        filter: 'brightness(1.05)',
        boxShadow: `0 0 0 3px #0A0B0E, 0 0 0 5.5px ${accentHex}`,
        opacityMultiplier: 1,
        outline: `2px solid ${accentHex}`,
        tailwindClasses:
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        swiftUiModifier: '.focusable(true).overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cyan, lineWidth: 2.5))',
      };
    case 'disabled':
      return {
        state,
        transform: 'none',
        filter: 'grayscale(0.75) brightness(0.78)',
        boxShadow: 'none',
        opacityMultiplier: 0.46,
        outline: 'none',
        tailwindClasses: 'disabled:opacity-45 disabled:grayscale disabled:pointer-events-none',
        swiftUiModifier: '.disabled(true).opacity(0.46).saturation(0.25)',
      };
    default:
      return {
        state: 'default',
        transform: 'none',
        filter: 'none',
        boxShadow: 'none',
        opacityMultiplier: 1,
        outline: 'none',
        tailwindClasses: 'transition-all duration-200 ease-out',
        swiftUiModifier: '.animation(.spring(response: 0.32, dampingFraction: 0.8), value: isPressed)',
      };
  }
}

function darkenHexChannel(hex: string, factor: number): string {
  const safe = normalizeHexColor(hex, '#4F46E5');
  const r = Math.max(0, Math.round(parseInt(safe.slice(1, 3), 16) * factor));
  const g = Math.max(0, Math.round(parseInt(safe.slice(3, 5), 16) * factor));
  const b = Math.max(0, Math.round(parseInt(safe.slice(5, 7), 16) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

function darkenButtonFillForWhiteAAA(baseHex: string): string {
  let candidate = normalizeHexColor(baseHex, '#4F46E5');
  for (let step = 0; step < 12; step += 1) {
    if (evaluateWcag('#FFFFFF', candidate).passesAAA) {
      return candidate;
    }
    candidate = darkenHexChannel(candidate, 0.78);
  }
  return '#1E1B4B';
}

export function repairArtboardContrastToAAA(
  doc: DocumentState,
  artboardId?: string,
): ArtboardWcagRepairResult {
  const targetBoardId = artboardId ?? doc.artboard.id;
  const repairedNodeIds: string[] = [];
  let totalAudited = 0;
  let passingAAABefore = 0;
  let passingAAAAfter = 0;
  let minRatioBefore = 21;
  let minRatioAfter = 21;

  const nextNodes: CanvasNode[] = doc.nodes.map((node): CanvasNode => {
    const nodeBoardId = node.artboardId ?? doc.artboard.id;
    if (nodeBoardId !== targetBoardId || !node.visible) return node;
    if (node.type !== 'text' && node.type !== 'button') return node;

    const audit = auditNodeContrast(node, doc);
    if (!audit) return node;
    totalAudited += 1;
    minRatioBefore = Math.min(minRatioBefore, audit.ratio);
    if (audit.passesAAA) {
      passingAAABefore += 1;
      passingAAAAfter += 1;
      minRatioAfter = Math.min(minRatioAfter, audit.ratio);
      return node;
    }

    const fixedHex = autoFixContrastToAAA(audit.foregroundHex, audit.backgroundHex);
    const afterInkAudit = evaluateWcag(fixedHex, audit.backgroundHex);

    if (afterInkAudit.passesAAA) {
      minRatioAfter = Math.min(minRatioAfter, afterInkAudit.ratio);
      passingAAAAfter += 1;
      repairedNodeIds.push(node.id);
      return {
        ...node,
        textColor: fixedHex,
        tokenBinding: node.tokenBinding
          ? { ...node.tokenBinding, textColor: undefined }
          : undefined,
      };
    }

    // For buttons on mid-tone fills where neither black nor white reaches 7.0:1 alone,
    // deepen the button surface deterministically so crisp #FFFFFF hits WCAG AAA >= 7.0:1.
    if (node.type === 'button') {
      const deepFrom = darkenButtonFillForWhiteAAA(audit.backgroundHex);
      const deepTo = node.fill.gradient
        ? darkenButtonFillForWhiteAAA(node.fill.gradient.to)
        : deepFrom;
      const afterSurfaceAudit = evaluateWcag('#FFFFFF', deepFrom);
      minRatioAfter = Math.min(minRatioAfter, afterSurfaceAudit.ratio);
      if (afterSurfaceAudit.passesAAA) {
        passingAAAAfter += 1;
      }
      repairedNodeIds.push(node.id);
      return {
        ...node,
        textColor: '#FFFFFF',
        fill:
          node.fill.kind === 'gradient' && node.fill.gradient
            ? {
                ...node.fill,
                color: deepFrom,
                gradient: {
                  ...node.fill.gradient,
                  from: deepFrom,
                  to: deepTo,
                },
              }
            : { ...node.fill, kind: 'solid' as const, color: deepFrom },
        tokenBinding: node.tokenBinding
          ? {
              ...node.tokenBinding,
              fill: undefined,
              fillGradientFrom: undefined,
              fillGradientTo: undefined,
              textColor: undefined,
            }
          : undefined,
      };
    }

    minRatioAfter = Math.min(minRatioAfter, afterInkAudit.ratio);
    repairedNodeIds.push(node.id);
    return {
      ...node,
      textColor: fixedHex,
      tokenBinding: node.tokenBinding
        ? { ...node.tokenBinding, textColor: undefined }
        : undefined,
    };
  });

  // Pass 2: If any text layer sits over a mid-tone surface card where neither pure white nor black
  // reaches 7.0:1 alone (e.g. text on #6366F1 gradient card), deepen that underlying surface slightly
  // and set the text ink to crisp #FFFFFF so 100% of audited layers hit true WCAG AAA (>= 7.0:1).
  const repairedDoc: DocumentState = { ...doc, nodes: nextNodes };
  const finalNodes: CanvasNode[] = [...nextNodes];
  for (let idx = 0; idx < finalNodes.length; idx += 1) {
    const node = finalNodes[idx];
    const nodeBoardId = node.artboardId ?? doc.artboard.id;
    if (nodeBoardId !== targetBoardId || !node.visible || node.type !== 'text') continue;
    const audit = auditNodeContrast(node, { ...repairedDoc, nodes: finalNodes });
    if (!audit || audit.passesAAA) continue;

    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    for (let j = idx - 1; j >= 0; j -= 1) {
      const surface = finalNodes[j];
      if (
        !surface.visible ||
        surface.type === 'text' ||
        surface.type === 'line' ||
        surface.type === 'path'
      ) {
        continue;
      }
      const inside =
        cx >= surface.x &&
        cx <= surface.x + surface.width &&
        cy >= surface.y &&
        cy <= surface.y + surface.height;
      if (!inside) continue;

      const deepFrom = darkenButtonFillForWhiteAAA(audit.backgroundHex);
      const deepTo = surface.fill.gradient
        ? darkenButtonFillForWhiteAAA(surface.fill.gradient.to)
        : deepFrom;
      finalNodes[j] = {
        ...surface,
        fill:
          surface.fill.kind === 'gradient' && surface.fill.gradient
            ? {
                ...surface.fill,
                color: deepFrom,
                gradient: {
                  ...surface.fill.gradient,
                  from: deepFrom,
                  to: deepTo,
                },
              }
            : { ...surface.fill, kind: 'solid' as const, color: deepFrom },
        tokenBinding: surface.tokenBinding
          ? {
              ...surface.tokenBinding,
              fill: undefined,
              fillGradientFrom: undefined,
              fillGradientTo: undefined,
            }
          : undefined,
      };
      finalNodes[idx] = {
        ...node,
        textColor: '#FFFFFF',
        tokenBinding: node.tokenBinding
          ? { ...node.tokenBinding, textColor: undefined }
          : undefined,
      };
      if (!repairedNodeIds.includes(surface.id)) repairedNodeIds.push(surface.id);
      if (!repairedNodeIds.includes(node.id)) repairedNodeIds.push(node.id);
      break;
    }
  }

  // Recalculate true final WCAG AAA pass count & minimum ratio across the repaired artboard
  const verifiedDoc: DocumentState = { ...doc, nodes: finalNodes };
  let verifiedPassingAAA = 0;
  let verifiedMinRatio = 21;
  for (const node of finalNodes) {
    const nodeBoardId = node.artboardId ?? doc.artboard.id;
    if (nodeBoardId !== targetBoardId || !node.visible) continue;
    if (node.type !== 'text' && node.type !== 'button') continue;
    const post = auditNodeContrast(node, verifiedDoc);
    if (!post) continue;
    verifiedMinRatio = Math.min(verifiedMinRatio, post.ratio);
    if (post.passesAAA) verifiedPassingAAA += 1;
  }

  return {
    nextNodes: finalNodes,
    repairedNodeIds,
    repairedCount: repairedNodeIds.length,
    totalAudited,
    passingAAABefore,
    passingAAAAfter: verifiedPassingAAA,
    minRatioBefore: totalAudited > 0 ? Math.round(minRatioBefore * 10) / 10 : 21,
    minRatioAfter: totalAudited > 0 ? Math.round(verifiedMinRatio * 10) / 10 : 21,
  };
}

export function computeCodeDiffLines(
  previousCode: string | null | undefined,
  currentCode: string,
): number[] {
  if (!previousCode) return [];
  const prevLines = previousCode.split('\n');
  const nextLines = currentCode.split('\n');
  const changed: number[] = [];

  for (let i = 0; i < nextLines.length; i += 1) {
    if (prevLines[i] !== nextLines[i]) {
      changed.push(i + 1);
    }
  }
  return changed;
}

function formatVec3Glsl(hex: string): string {
  const [r, g, b] = hexToVec3(hex);
  return `vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})`;
}

function formatSwiftColor(hex: string): string {
  const [r, g, b] = hexToVec3(hex);
  return `Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)})`;
}

export function compileShaderStudioCode(params: {
  target: ShaderCodeTarget;
  config: ShaderStudioConfig;
  tokens: DesignTokens;
  sandboxState: SandboxInteractiveState;
  selectedNode?: CanvasNode | null;
  wcagRepairSummary?: { repairedCount: number; minRatioAfter: number } | null;
  previousCode?: string | null;
}): CompiledShaderCodeResult {
  const config = sanitizeShaderConfig(params.config);
  const presetMeta = getShaderPresetById(config.preset);
  const stateSpec = computeInteractiveStateStyle(
    params.sandboxState,
    params.tokens.brandAccent,
  );
  const nodeName = params.selectedNode?.name ?? 'Treasury Hero CTA';
  const nodeTextHex = params.selectedNode?.textColor ?? params.tokens.textPrimary;
  const wcagLine = params.wcagRepairSummary
    ? `// WCAG AAA Verified: min ${params.wcagRepairSummary.minRatioAfter.toFixed(1)}:1 (${params.wcagRepairSummary.repairedCount} layers repaired)`
    : `// WCAG Contrast Guard: active foreground ${nodeTextHex}`;

  let code = '';
  let filename = '';
  let languageLabel = '';

  if (params.target === 'glsl') {
    filename = `atelier-${config.preset}.frag.glsl`;
    languageLabel = 'GLSL ES 3.00';
    const rawFrag = getFragmentShaderSource(config.preset);
    code = [
      `// Atelier Canvas Pro v7.0 — ${presetMeta.name} (${config.paletteId})`,
      `// Live Uniforms: speed=${config.speed.toFixed(2)} warp=${config.warp.toFixed(2)} grain=${config.grain.toFixed(3)} scale=${config.scale.toFixed(2)}`,
      `// Palette: u_color0=${formatVec3Glsl(config.colors[0])} u_color1=${formatVec3Glsl(config.colors[1])}`,
      `//          u_color2=${formatVec3Glsl(config.colors[2])} u_color3=${formatVec3Glsl(config.colors[3])}`,
      wcagLine,
      '',
      rawFrag.trim(),
    ].join('\n');
  } else if (params.target === 'swiftui') {
    filename = `AtelierShaderSurface.swift`;
    languageLabel = 'SwiftUI + Metal';
    code = [
      `// Atelier Canvas Pro v7.0 — SwiftUI MeshGradient + Metal Shader`,
      `// Preset: ${presetMeta.name} | State: ${params.sandboxState.toUpperCase()}`,
      wcagLine,
      `import SwiftUI`,
      ``,
      `struct AtelierShaderSurface: View {`,
      `    @State private var isHovering = ${params.sandboxState === 'hover' ? 'true' : 'false'}`,
      `    @State private var isPressed = ${params.sandboxState === 'pressed' ? 'true' : 'false'}`,
      `    let shaderEnabled = ${config.enabled ? 'true' : 'false'}`,
      `    let speed: Double = ${config.speed.toFixed(2)}`,
      `    let warpTurbulence: Float = ${config.warp.toFixed(2)}`,
      `    let grainAmount: Float = ${config.grain.toFixed(3)}`,
      ``,
      `    var body: some View {`,
      `        TimelineView(.animation) { timeline in`,
      `            let elapsed = timeline.date.timeIntervalSinceReferenceDate * speed`,
      `            ZStack {`,
      `                if shaderEnabled {`,
      `                    MeshGradient(width: 2, height: 2, points: [`,
      `                        [0.0, 0.0], [1.0, 0.0],`,
      `                        [0.0, 1.0], [1.0, 1.0]`,
      `                    ], colors: [`,
      `                        ${formatSwiftColor(config.colors[0])},`,
      `                        ${formatSwiftColor(config.colors[1])},`,
      `                        ${formatSwiftColor(config.colors[2])},`,
      `                        ${formatSwiftColor(config.colors[3])}`,
      `                    ])`,
      `                    .colorEffect(ShaderLibrary.atelier_${config.preset.replace(/-/g, '_')}(`,
      `                        .float(elapsed),`,
      `                        .float(warpTurbulence),`,
      `                        .float(grainAmount)`,
      `                    ))`,
      `                    .opacity(${config.intensity.toFixed(2)})`,
      `                }`,
      `                Button("${nodeName}") { }`,
      `                    .foregroundStyle(${formatSwiftColor(nodeTextHex)})`,
      `                    ${stateSpec.swiftUiModifier}`,
      `            }`,
      `            .clipShape(RoundedRectangle(cornerRadius: ${params.tokens.radiusBase}, style: .continuous))`,
      `        }`,
      `    }`,
      `}`,
    ].join('\n');
  } else {
    filename = `AtelierShaderHero.tsx`;
    languageLabel = 'React 19 + Tailwind v4';
    code = [
      `// Atelier Canvas Pro v7.0 — Live WebGL2 Procedural Shader + Component Sandbox`,
      `// Preset: ${presetMeta.name} | Palette: ${config.paletteId} | State: ${params.sandboxState.toUpperCase()}`,
      wcagLine,
      `import { ProceduralShaderCanvas } from './ProceduralShaderCanvas';`,
      ``,
      `export const SHADER_UNIFORMS = {`,
      `  enabled: ${config.enabled ? 'true' : 'false'},`,
      `  preset: '${config.preset}',`,
      `  palette: ['${config.colors[0]}', '${config.colors[1]}', '${config.colors[2]}', '${config.colors[3]}'] as const,`,
      `  speed: ${config.speed.toFixed(2)},`,
      `  warp: ${config.warp.toFixed(2)},`,
      `  grain: ${config.grain.toFixed(3)},`,
      `  scale: ${config.scale.toFixed(2)},`,
      `  intensity: ${config.intensity.toFixed(2)},`,
      `} as const;`,
      ``,
      `export function AtelierShaderHero() {`,
      `  return (`,
      `    <section`,
      `      data-state="${params.sandboxState}"`,
      `      className="relative overflow-hidden rounded-[${params.tokens.radiusBase}px] border border-white/10 p-6"`,
      `      style={{ backgroundColor: '${params.tokens.surfaceCanvas}' }}`,
      `    >`,
      `      <ProceduralShaderCanvas config={SHADER_UNIFORMS} className="absolute inset-0" />`,
      `      <div className="relative z-10 backdrop-blur-xl rounded-2xl border border-white/12 bg-slate-950/55 p-6">`,
      `        <button`,
      `          type="button"`,
      `          disabled={${params.sandboxState === 'disabled' ? 'true' : 'false'}}`,
      `          style={{ color: '${nodeTextHex}', backgroundColor: '${params.tokens.brandPrimary}' }}`,
      `          className="px-5 py-2.5 rounded-xl font-semibold ${stateSpec.tailwindClasses}"`,
      `        >`,
      `          ${nodeName}`,
      `        </button>`,
      `      </div>`,
      `    </section>`,
      `  );`,
      `}`,
    ].join('\n');
  }

  const lines = code.split('\n');
  const changedLineNumbers = computeCodeDiffLines(params.previousCode, code);

  return {
    target: params.target,
    filename,
    languageLabel,
    code,
    lines,
    changedLineNumbers,
  };
}
