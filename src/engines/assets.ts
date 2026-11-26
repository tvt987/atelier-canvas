import type { CanvasNode, DocumentState, Point } from '../types/canvas';

export interface AssetKitItem {
  id: string;
  name: string;
  category: 'Data' | 'Commerce' | 'Controls' | 'Navigation' | 'Editorial' | 'Effects';
  dimensions: string;
  description: string;
}

export const ASSET_KIT_ITEMS: AssetKitItem[] = [
  {
    id: 'kpi-sparkline',
    name: 'KPI Sparkline Metric Card',
    category: 'Data',
    dimensions: '276 × 148',
    description: 'Glass telemetry card with smooth Bezier sparkline & delta pill',
  },
  {
    id: 'glass-pricing',
    name: 'Glass Pricing Tier Card',
    category: 'Commerce',
    dimensions: '264 × 192',
    description: 'Frosted Pro tier card with gradient CTA & click interaction',
  },
  {
    id: 'toggle-pill',
    name: 'Interactive Toggle Pill',
    category: 'Controls',
    dimensions: '188 × 40',
    description: 'Segmented pill switch bound to live brand accent tokens',
  },
  {
    id: 'avatar-stack',
    name: 'Avatar Stack & Presence Pill',
    category: 'Controls',
    dimensions: '216 × 44',
    description: 'Overlapping multiplayer presence orbs with live counter',
  },
  {
    id: 'floating-navbar',
    name: 'Floating App Navbar',
    category: 'Navigation',
    dimensions: '520 × 54',
    description: 'Translucent header pill with brand mark, links & CTA',
  },
  {
    id: 'editorial-hero',
    name: 'Editorial Display Hero Lockup',
    category: 'Editorial',
    dimensions: '390 × 124',
    description: 'Cormorant Garamond serif paired with mono eyebrow & rule',
  },
  {
    id: 'terminal-card',
    name: 'Terminal Code Snippet Card',
    category: 'Data',
    dimensions: '320 × 126',
    description: 'Obsidian CLI card with macOS dots & monospace prompt',
  },
  {
    id: 'ambient-orb',
    name: 'Ambient Mesh Gradient Orb',
    category: 'Effects',
    dimensions: '180 × 180',
    description: 'Screen-blended luminous sphere with levitation motion',
  },
  {
    id: 'system-toast',
    name: 'System Alert Toast',
    category: 'Navigation',
    dimensions: '296 × 48',
    description: 'Floating notification banner with status dot & timestamp',
  },
  {
    id: 'mini-bars',
    name: 'Mini Bar Analytics Widget',
    category: 'Data',
    dimensions: '248 × 144',
    description: 'Compact 5-bar chart panel with highlighted peak bar',
  },
];

function base(
  partial: Partial<CanvasNode> &
    Pick<CanvasNode, 'id' | 'name' | 'type' | 'x' | 'y' | 'width' | 'height'>,
): CanvasNode {
  return {
    rotation: 0,
    radius: 12,
    opacity: 1,
    fill: { kind: 'solid', color: '#151924' },
    strokeColor: '#2A3147',
    strokeWidth: 0,
    blur: 0,
    shadow: 'none',
    blendMode: 'normal',
    locked: false,
    visible: true,
    ...partial,
  };
}

export function instantiateAssetKitItem(
  assetId: string,
  doc: DocumentState,
  anchor?: Point,
): CanvasNode[] {
  const t = doc.tokens;
  const uid = Math.random().toString(36).slice(2, 7);
  const cx = Math.round(anchor?.x ?? doc.artboard.width / 2);
  const cy = Math.round(anchor?.y ?? doc.artboard.height / 2);

  switch (assetId) {
    case 'kpi-sparkline': {
      const w = 276;
      const h = 148;
      const x = Math.max(16, Math.round(cx - w / 2));
      const y = Math.max(16, Math.round(cy - h / 2));
      return [
        base({
          id: `asset-kpi-card-${uid}`,
          name: 'KPI Sparkline Card',
          type: 'glass',
          x,
          y,
          width: w,
          height: h,
          radius: t.radiusBase,
          blur: 20,
          shadow: 'elevated',
          fill: {
            kind: 'gradient',
            color: t.surfaceCard,
            gradient: { angle: 145, from: t.surfaceCard, to: t.surfaceElevated },
          },
          strokeColor: t.borderSubtle,
          strokeWidth: 1,
          tokenBinding: {
            fill: 'surfaceCard',
            fillGradientFrom: 'surfaceCard',
            fillGradientTo: 'surfaceElevated',
            stroke: 'borderSubtle',
            radius: 'radiusBase',
          },
          prototype: {
            entrance: 'fade-up',
            durationMs: 520,
            delayMs: 60,
            easing: 'expo-out',
            hoverEffect: 'glass-tilt',
            clickAction: 'toast',
            clickPayload: 'KPI Telemetry synced — +24.2% MoM growth',
          },
        }),
        base({
          id: `asset-kpi-lbl-${uid}`,
          name: 'KPI Eyebrow',
          type: 'text',
          x: x + 18,
          y: y + 16,
          width: 150,
          height: 16,
          fill: { kind: 'none', color: 'transparent' },
          text: 'NET REVENUE RUN-RATE',
          fontFamily: 'JetBrains Mono',
          fontWeight: 500,
          fontSize: 9,
          letterSpacing: 1.2,
          textColor: t.textMuted,
          tokenBinding: { textColor: 'textMuted' },
        }),
        base({
          id: `asset-kpi-pill-${uid}`,
          name: 'KPI Delta Pill',
          type: 'button',
          x: x + 194,
          y: y + 14,
          width: 64,
          height: 22,
          radius: 999,
          fill: { kind: 'solid', color: t.brandAccent },
          text: '+24.2%',
          fontFamily: 'JetBrains Mono',
          fontWeight: 600,
          fontSize: 10,
          textAlign: 'center',
          textColor: '#090D16',
          tokenBinding: { fill: 'brandAccent' },
        }),
        base({
          id: `asset-kpi-val-${uid}`,
          name: 'KPI Value',
          type: 'text',
          x: x + 18,
          y: y + 38,
          width: 190,
          height: 36,
          fill: { kind: 'none', color: 'transparent' },
          text: '$128.4K',
          fontFamily: 'Space Grotesk',
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: -0.9,
          textColor: t.textPrimary,
          tokenBinding: { textColor: 'textPrimary' },
        }),
        base({
          id: `asset-kpi-spark-${uid}`,
          name: 'Sparkline Curve',
          type: 'path',
          x: x + 18,
          y: y + 84,
          width: 240,
          height: 48,
          radius: 0,
          fill: { kind: 'none', color: 'transparent' },
          strokeColor: t.brandAccent,
          strokeWidth: 2.5,
          tokenBinding: { stroke: 'brandAccent' },
          pathData: {
            smooth: true,
            dashStyle: 'solid',
            endArrow: false,
            glow: true,
            points: [
              { x: 4, y: 40 },
              { x: 48, y: 30 },
              { x: 92, y: 35 },
              { x: 140, y: 18 },
              { x: 186, y: 22 },
              { x: 234, y: 6 },
            ],
          },
        }),
      ];
    }

    case 'glass-pricing': {
      const w = 264;
      const h = 192;
      const x = Math.max(16, Math.round(cx - w / 2));
      const y = Math.max(16, Math.round(cy - h / 2));
      return [
        base({
          id: `asset-price-card-${uid}`,
          name: 'Glass Pricing Card',
          type: 'glass',
          x,
          y,
          width: w,
          height: h,
          radius: t.radiusBase,
          blur: 22,
          shadow: 'floating',
          fill: {
            kind: 'gradient',
            color: t.surfaceCard,
            gradient: { angle: 145, from: t.surfaceCard, to: t.surfaceElevated },
          },
          strokeColor: t.brandPrimary,
          strokeWidth: 1,
          tokenBinding: {
            fill: 'surfaceCard',
            fillGradientFrom: 'surfaceCard',
            fillGradientTo: 'surfaceElevated',
            stroke: 'brandPrimary',
            radius: 'radiusBase',
          },
          prototype: {
            entrance: 'spring-scale',
            durationMs: 560,
            delayMs: 40,
            easing: 'spring',
            hoverEffect: 'glass-tilt',
            clickAction: 'none',
          },
        }),
        base({
          id: `asset-price-tier-${uid}`,
          name: 'Pricing Eyebrow',
          type: 'text',
          x: x + 20,
          y: y + 18,
          width: 220,
          height: 16,
          fill: { kind: 'none', color: 'transparent' },
          text: 'STUDIO PRO  ·  TEAM SEAT',
          fontFamily: 'JetBrains Mono',
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: 1.2,
          textColor: t.brandAccent,
          tokenBinding: { textColor: 'brandAccent' },
        }),
        base({
          id: `asset-price-amt-${uid}`,
          name: 'Pricing Figure',
          type: 'text',
          x: x + 20,
          y: y + 44,
          width: 220,
          height: 44,
          fill: { kind: 'none', color: 'transparent' },
          text: '$49 / mo',
          fontFamily: 'Space Grotesk',
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: -1,
          textColor: t.textPrimary,
          tokenBinding: { textColor: 'textPrimary' },
        }),
        base({
          id: `asset-price-copy-${uid}`,
          name: 'Pricing Subtitle',
          type: 'text',
          x: x + 20,
          y: y + 92,
          width: 224,
          height: 20,
          fill: { kind: 'none', color: 'transparent' },
          text: 'Unlimited CRDT rooms + 3x export',
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 12,
          textColor: t.textMuted,
          tokenBinding: { textColor: 'textMuted' },
        }),
        base({
          id: `asset-price-cta-${uid}`,
          name: 'Upgrade Tier CTA',
          type: 'button',
          x: x + 20,
          y: y + 130,
          width: 224,
          height: 42,
          radius: 10,
          shadow: 'neon',
          fill: {
            kind: 'gradient',
            color: t.brandPrimary,
            gradient: { angle: 120, from: t.brandPrimary, to: t.brandAccent },
          },
          text: 'Upgrade Workspace',
          fontFamily: 'Space Grotesk',
          fontWeight: 600,
          fontSize: 13,
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
            clickPayload: 'Studio Pro workspace checkout opened',
          },
        }),
      ];
    }

    case 'toggle-pill': {
      const w = 188;
      const h = 40;
      const x = Math.round(cx - w / 2);
      const y = Math.round(cy - h / 2);
      return [
        base({
          id: `asset-toggle-track-${uid}`,
          name: 'Toggle Track',
          type: 'glass',
          x,
          y,
          width: w,
          height: h,
          radius: 999,
          blur: 14,
          fill: { kind: 'solid', color: t.surfaceElevated },
          strokeColor: t.borderSubtle,
          strokeWidth: 1,
          tokenBinding: { fill: 'surfaceElevated', stroke: 'borderSubtle' },
        }),
        base({
          id: `asset-toggle-thumb-${uid}`,
          name: 'Toggle Active Pill',
          type: 'button',
          x: x + 4,
          y: y + 4,
          width: 92,
          height: 32,
          radius: 999,
          fill: {
            kind: 'gradient',
            color: t.brandPrimary,
            gradient: { angle: 120, from: t.brandPrimary, to: t.brandAccent },
          },
          text: 'Monthly',
          fontFamily: 'Space Grotesk',
          fontWeight: 600,
          fontSize: 12,
          textAlign: 'center',
          textColor: '#FFFFFF',
          tokenBinding: {
            fill: 'brandPrimary',
            fillGradientFrom: 'brandPrimary',
            fillGradientTo: 'brandAccent',
          },
          prototype: {
            entrance: 'none',
            durationMs: 350,
            delayMs: 0,
            easing: 'spring',
            hoverEffect: 'scale',
            clickAction: 'toast',
            clickPayload: 'Billing cadence switched to Annual (-20%)',
          },
        }),
        base({
          id: `asset-toggle-alt-${uid}`,
          name: 'Toggle Secondary Label',
          type: 'text',
          x: x + 102,
          y: y + 11,
          width: 78,
          height: 18,
          fill: { kind: 'none', color: 'transparent' },
          text: 'Annual',
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 12,
          textAlign: 'center',
          textColor: t.textMuted,
          tokenBinding: { textColor: 'textMuted' },
        }),
      ];
    }

    case 'avatar-stack': {
      const w = 216;
      const h = 44;
      const x = Math.round(cx - w / 2);
      const y = Math.round(cy - h / 2);
      return [
        base({
          id: `asset-av-pill-${uid}`,
          name: 'Presence Pill',
          type: 'glass',
          x,
          y,
          width: w,
          height: h,
          radius: 999,
          blur: 14,
          fill: { kind: 'solid', color: t.surfaceCard },
          strokeColor: t.borderSubtle,
          strokeWidth: 1,
          tokenBinding: { fill: 'surfaceCard', stroke: 'borderSubtle' },
        }),
        base({
          id: `asset-av-1-${uid}`,
          name: 'Avatar Orb 1',
          type: 'ellipse',
          x: x + 10,
          y: y + 9,
          width: 26,
          height: 26,
          fill: { kind: 'solid', color: t.brandPrimary },
          strokeColor: t.surfaceCanvas,
          strokeWidth: 2,
          tokenBinding: { fill: 'brandPrimary', stroke: 'surfaceCanvas' },
        }),
        base({
          id: `asset-av-2-${uid}`,
          name: 'Avatar Orb 2',
          type: 'ellipse',
          x: x + 28,
          y: y + 9,
          width: 26,
          height: 26,
          fill: { kind: 'solid', color: t.brandAccent },
          strokeColor: t.surfaceCanvas,
          strokeWidth: 2,
          tokenBinding: { fill: 'brandAccent', stroke: 'surfaceCanvas' },
        }),
        base({
          id: `asset-av-3-${uid}`,
          name: 'Avatar Orb 3',
          type: 'ellipse',
          x: x + 46,
          y: y + 9,
          width: 26,
          height: 26,
          fill: { kind: 'solid', color: '#F43F5E' },
          strokeColor: t.surfaceCanvas,
          strokeWidth: 2,
          tokenBinding: { stroke: 'surfaceCanvas' },
        }),
        base({
          id: `asset-av-label-${uid}`,
          name: 'Presence Count',
          type: 'text',
          x: x + 84,
          y: y + 14,
          width: 120,
          height: 16,
          fill: { kind: 'none', color: 'transparent' },
          text: '12 ACTIVE LIVE',
          fontFamily: 'JetBrains Mono',
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: 0.9,
          textColor: t.textPrimary,
          tokenBinding: { textColor: 'textPrimary' },
        }),
      ];
    }

    case 'floating-navbar': {
      const w = 520;
      const h = 54;
      const x = Math.max(16, Math.round(cx - w / 2));
      const y = Math.max(16, Math.round(cy - h / 2));
      return [
        base({
          id: `asset-nav-shell-${uid}`,
          name: 'Floating Navbar Shell',
          type: 'glass',
          x,
          y,
          width: w,
          height: h,
          radius: 999,
          blur: 18,
          shadow: 'elevated',
          fill: { kind: 'solid', color: t.surfaceCard },
          strokeColor: t.borderSubtle,
          strokeWidth: 1,
          tokenBinding: { fill: 'surfaceCard', stroke: 'borderSubtle' },
        }),
        base({
          id: `asset-nav-logo-${uid}`,
          name: 'Navbar Brand',
          type: 'text',
          x: x + 24,
          y: y + 17,
          width: 120,
          height: 20,
          fill: { kind: 'none', color: 'transparent' },
          text: 'ATELIER OS',
          fontFamily: 'Space Grotesk',
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 1.2,
          textColor: t.textPrimary,
          tokenBinding: { textColor: 'textPrimary' },
        }),
        base({
          id: `asset-nav-links-${uid}`,
          name: 'Navbar Links',
          type: 'text',
          x: x + 160,
          y: y + 18,
          width: 220,
          height: 18,
          fill: { kind: 'none', color: 'transparent' },
          text: 'System    Specs    Pricing',
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 12,
          textAlign: 'center',
          textColor: t.textMuted,
          tokenBinding: { textColor: 'textMuted' },
        }),
        base({
          id: `asset-nav-btn-${uid}`,
          name: 'Navbar Launch CTA',
          type: 'button',
          x: x + 402,
          y: y + 9,
          width: 106,
          height: 36,
          radius: 999,
          fill: {
            kind: 'gradient',
            color: t.brandPrimary,
            gradient: { angle: 120, from: t.brandPrimary, to: t.brandAccent },
          },
          text: 'Launch App',
          fontFamily: 'Space Grotesk',
          fontWeight: 600,
          fontSize: 12,
          textAlign: 'center',
          textColor: '#FFFFFF',
          tokenBinding: {
            fill: 'brandPrimary',
            fillGradientFrom: 'brandPrimary',
            fillGradientTo: 'brandAccent',
          },
          prototype: {
            entrance: 'none',
            durationMs: 350,
            delayMs: 0,
            easing: 'spring',
            hoverEffect: 'lift-glow',
            clickAction: 'toast',
            clickPayload: 'Navigation CTA triggered',
          },
        }),
      ];
    }

    case 'editorial-hero': {
      const w = 390;
      const h = 124;
      const x = Math.max(16, Math.round(cx - w / 2));
      const y = Math.max(16, Math.round(cy - h / 2));
      return [
        base({
          id: `asset-ed-eyebrow-${uid}`,
          name: 'Editorial Index',
          type: 'text',
          x,
          y,
          width: 260,
          height: 16,
          fill: { kind: 'none', color: 'transparent' },
          text: 'ISSUE NO. 09  ·  DESIGN ARCHITECTURE',
          fontFamily: 'JetBrains Mono',
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: 1.5,
          textColor: t.brandAccent,
          tokenBinding: { textColor: 'brandAccent' },
        }),
        base({
          id: `asset-ed-title-${uid}`,
          name: 'Editorial Serif Headline',
          type: 'text',
          x,
          y: y + 24,
          width: w,
          height: 54,
          fill: { kind: 'none', color: 'transparent' },
          text: 'Spatial Craft & Precision',
          fontFamily: 'Cormorant Garamond',
          fontWeight: 600,
          fontSize: 44,
          letterSpacing: -0.6,
          textColor: t.textPrimary,
          tokenBinding: { textColor: 'textPrimary' },
          prototype: {
            entrance: 'fade-up',
            durationMs: 650,
            delayMs: 0,
            easing: 'expo-out',
            hoverEffect: 'none',
            clickAction: 'none',
          },
        }),
        base({
          id: `asset-ed-rule-${uid}`,
          name: 'Editorial Hairline',
          type: 'line',
          x,
          y: y + 92,
          width: 240,
          height: 2,
          radius: 2,
          fill: { kind: 'solid', color: t.brandPrimary },
          tokenBinding: { fill: 'brandPrimary' },
        }),
      ];
    }

    case 'terminal-card': {
      const w = 320;
      const h = 126;
      const x = Math.max(16, Math.round(cx - w / 2));
      const y = Math.max(16, Math.round(cy - h / 2));
      return [
        base({
          id: `asset-term-bg-${uid}`,
          name: 'Terminal Window',
          type: 'glass',
          x,
          y,
          width: w,
          height: h,
          radius: 14,
          blur: 16,
          shadow: 'elevated',
          fill: { kind: 'solid', color: '#0B0E16' },
          strokeColor: t.borderSubtle,
          strokeWidth: 1,
          tokenBinding: { stroke: 'borderSubtle' },
        }),
        base({
          id: `asset-term-dot1-${uid}`,
          name: 'Dot Red',
          type: 'ellipse',
          x: x + 14,
          y: y + 14,
          width: 8,
          height: 8,
          fill: { kind: 'solid', color: '#F43F5E' },
        }),
        base({
          id: `asset-term-dot2-${uid}`,
          name: 'Dot Amber',
          type: 'ellipse',
          x: x + 28,
          y: y + 14,
          width: 8,
          height: 8,
          fill: { kind: 'solid', color: '#F59E0B' },
        }),
        base({
          id: `asset-term-dot3-${uid}`,
          name: 'Dot Emerald',
          type: 'ellipse',
          x: x + 42,
          y: y + 14,
          width: 8,
          height: 8,
          fill: { kind: 'solid', color: '#10B981' },
        }),
        base({
          id: `asset-term-cmd-${uid}`,
          name: 'Terminal Code Output',
          type: 'text',
          x: x + 16,
          y: y + 40,
          width: 288,
          height: 70,
          fill: { kind: 'none', color: 'transparent' },
          text: '$ npx atelier compile --tailwind-v4\n✓ Synced 8 tokens  ·  0 WCAG errors\n✓ Exported React 19 bundle (14ms)',
          fontFamily: 'JetBrains Mono',
          fontWeight: 500,
          fontSize: 11,
          lineHeight: 1.65,
          textColor: '#A5F3FC',
        }),
      ];
    }

    case 'ambient-orb': {
      return [
        base({
          id: `asset-orb-${uid}`,
          name: 'Ambient Mesh Orb',
          type: 'ellipse',
          x: Math.round(cx - 90),
          y: Math.round(cy - 90),
          width: 180,
          height: 180,
          radius: 90,
          opacity: 0.72,
          shadow: 'neon',
          blendMode: 'screen',
          fill: {
            kind: 'gradient',
            color: t.brandPrimary,
            gradient: { angle: 135, from: t.brandPrimary, to: t.brandAccent },
          },
          tokenBinding: {
            fill: 'brandPrimary',
            fillGradientFrom: 'brandPrimary',
            fillGradientTo: 'brandAccent',
          },
          prototype: {
            entrance: 'float-levitate',
            durationMs: 3200,
            delayMs: 0,
            easing: 'smooth',
            hoverEffect: 'scale',
            clickAction: 'none',
          },
        }),
      ];
    }

    case 'system-toast': {
      const w = 296;
      const h = 48;
      const x = Math.round(cx - w / 2);
      const y = Math.round(cy - h / 2);
      return [
        base({
          id: `asset-toast-bg-${uid}`,
          name: 'System Toast Pill',
          type: 'glass',
          x,
          y,
          width: w,
          height: h,
          radius: 14,
          blur: 18,
          shadow: 'floating',
          fill: { kind: 'solid', color: t.surfaceElevated },
          strokeColor: t.brandAccent,
          strokeWidth: 1,
          tokenBinding: { fill: 'surfaceElevated', stroke: 'brandAccent' },
          prototype: {
            entrance: 'slide-left',
            durationMs: 450,
            delayMs: 120,
            easing: 'expo-out',
            hoverEffect: 'lift-glow',
            clickAction: 'toast',
            clickPayload: 'Deployment verified on edge cluster',
          },
        }),
        base({
          id: `asset-toast-dot-${uid}`,
          name: 'Toast Signal Dot',
          type: 'ellipse',
          x: x + 16,
          y: y + 19,
          width: 10,
          height: 10,
          fill: { kind: 'solid', color: '#10B981' },
        }),
        base({
          id: `asset-toast-msg-${uid}`,
          name: 'Toast Message',
          type: 'text',
          x: x + 36,
          y: y + 15,
          width: 244,
          height: 18,
          fill: { kind: 'none', color: 'transparent' },
          text: 'Production tokens synced  ·  12ms',
          fontFamily: 'Inter',
          fontWeight: 500,
          fontSize: 12,
          textColor: t.textPrimary,
          tokenBinding: { textColor: 'textPrimary' },
        }),
      ];
    }

    case 'mini-bars':
    default: {
      const w = 248;
      const h = 144;
      const x = Math.max(16, Math.round(cx - w / 2));
      const y = Math.max(16, Math.round(cy - h / 2));
      const heights = [44, 64, 52, 82, 58];
      const bars = heights.map((bh, idx) =>
        base({
          id: `asset-mbar-${idx}-${uid}`,
          name: `Mini Bar ${idx + 1}`,
          type: 'rect',
          x: x + 22 + idx * 42,
          y: y + 124 - bh,
          width: 24,
          height: bh,
          radius: 6,
          shadow: idx === 3 ? 'neon' : 'none',
          fill:
            idx === 3
              ? {
                  kind: 'gradient',
                  color: t.brandPrimary,
                  gradient: { angle: 180, from: t.brandAccent, to: t.brandPrimary },
                }
              : { kind: 'solid', color: t.surfaceElevated },
          strokeColor: t.borderSubtle,
          strokeWidth: idx === 3 ? 0 : 1,
          tokenBinding:
            idx === 3
              ? {
                  fill: 'brandPrimary',
                  fillGradientFrom: 'brandAccent',
                  fillGradientTo: 'brandPrimary',
                }
              : { fill: 'surfaceElevated', stroke: 'borderSubtle' },
        }),
      );
      return [
        base({
          id: `asset-mbars-card-${uid}`,
          name: 'Mini Analytics Card',
          type: 'glass',
          x,
          y,
          width: w,
          height: h,
          radius: t.radiusBase,
          blur: 18,
          shadow: 'elevated',
          fill: { kind: 'solid', color: t.surfaceCard },
          strokeColor: t.borderSubtle,
          strokeWidth: 1,
          tokenBinding: {
            fill: 'surfaceCard',
            stroke: 'borderSubtle',
            radius: 'radiusBase',
          },
        }),
        base({
          id: `asset-mbars-title-${uid}`,
          name: 'Analytics Header',
          type: 'text',
          x: x + 20,
          y: y + 14,
          width: 200,
          height: 16,
          fill: { kind: 'none', color: 'transparent' },
          text: 'THROUGHPUT  ·  5.4K RPS',
          fontFamily: 'JetBrains Mono',
          fontWeight: 600,
          fontSize: 10,
          letterSpacing: 1,
          textColor: t.textMuted,
          tokenBinding: { textColor: 'textMuted' },
        }),
        ...bars,
      ];
    }
  }
}
