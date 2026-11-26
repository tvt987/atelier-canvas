import type { CanvasNode, DocumentState } from '../types/canvas';
import { getTokenThemeById } from './tokens';

export interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'generate' | 'theme' | 'layout' | 'mode' | 'template' | 'export';
  keywords: string[];
  shortcut?: string;
}

export const COMMAND_CATALOG: CommandItem[] = [
  {
    id: 'gen-glass-pricing',
    title: 'Add Glass Pricing Card',
    subtitle: 'Insert translucent Pro tier card bound to live tokens',
    category: 'generate',
    keywords: ['add', 'glass', 'pricing', 'card', 'blur', 'generate'],
  },
  {
    id: 'gen-neon-orb',
    title: 'Create Neon Gradient Orb',
    subtitle: 'Add ambient electric radial accent sphere',
    category: 'generate',
    keywords: ['create', 'neon', 'gradient', 'orb', 'ellipse', 'glow'],
  },
  {
    id: 'gen-primary-cta',
    title: 'Add Primary CTA Button',
    subtitle: 'Insert gradient button with token-bound shadow',
    category: 'generate',
    keywords: ['add', 'button', 'cta', 'action', 'primary'],
  },
  {
    id: 'gen-editorial-title',
    title: 'Insert Editorial Display Headline',
    subtitle: 'Add Cormorant Garamond editorial typography layer',
    category: 'generate',
    keywords: ['text', 'headline', 'editorial', 'serif', 'typography'],
  },
  {
    id: 'theme-swiss-vermilion',
    title: 'Switch to Swiss Vermilion Theme',
    subtitle: 'Morph all token-bound layers to Vermilion & Amber',
    category: 'theme',
    keywords: ['swiss', 'vermilion', 'theme', 'red', 'morph', 'tokens'],
  },
  {
    id: 'theme-obsidian-electric',
    title: 'Switch to Obsidian Electric Theme',
    subtitle: 'Morph canvas to Electric Indigo & Cyan dark tokens',
    category: 'theme',
    keywords: ['obsidian', 'electric', 'indigo', 'dark', 'theme'],
  },
  {
    id: 'theme-apple-frosted',
    title: 'Switch to Apple Frosted Light Theme',
    subtitle: 'Morph canvas to frosted light glass & Cupertino Blue',
    category: 'theme',
    keywords: ['apple', 'frosted', 'light', 'theme', 'white'],
  },
  {
    id: 'theme-tokyo-bauhaus',
    title: 'Switch to Tokyo Bauhaus Theme',
    subtitle: 'Morph canvas to Cobalt, Acid Lime & crisp 4px geometry',
    category: 'theme',
    keywords: ['tokyo', 'bauhaus', 'cobalt', 'lime', 'theme'],
  },
  {
    id: 'layout-center-selected',
    title: 'Center Selected Layer',
    subtitle: 'Align active selection to exact artboard center',
    category: 'layout',
    keywords: ['center', 'align', 'middle', 'layer', 'selected'],
  },
  {
    id: 'mode-toggle-dev',
    title: 'Toggle Dev Mode',
    subtitle: 'Switch between Design canvas & React/Tailwind redline specs',
    category: 'mode',
    keywords: ['dev', 'mode', 'code', 'inspect', 'redline', 'tailwind'],
    shortcut: 'Shift+D',
  },
  {
    id: 'export-svg',
    title: 'Export Clean Vector SVG',
    subtitle: 'Open Export Studio to download SVG, 2x PNG, or TSX',
    category: 'export',
    keywords: ['export', 'svg', 'png', 'download', 'tsx', 'code'],
  },
  {
    id: 'template-swiss',
    code: 'swiss-poster',
    title: 'Load Template: Swiss Exhibition Poster',
    subtitle: 'Switch artboard to International Typographic poster',
    category: 'template',
    keywords: ['template', 'swiss', 'poster', 'exhibition'],
  } as CommandItem,
  {
    id: 'template-saas',
    title: 'Load Template: AI SaaS Hero Landing',
    subtitle: 'Switch artboard to modern AI SaaS hero with telemetry',
    category: 'template',
    keywords: ['template', 'saas', 'hero', 'landing', 'ai'],
  },
  {
    id: 'template-tokens',
    title: 'Load Template: Design System Token Sheet',
    subtitle: 'Switch artboard to live semantic token spec sheet',
    category: 'template',
    keywords: ['template', 'token', 'sheet', 'design', 'system'],
  },
  {
    id: 'template-fintech',
    title: 'Load Template: Spatial FinTech App UI',
    subtitle: 'Switch artboard to Spatial FinTech analytics composition',
    category: 'template',
    keywords: ['template', 'fintech', 'spatial', 'banking'],
  },
];

export function filterCommands(query: string): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMAND_CATALOG;
  const terms = q.split(/\s+/);
  return COMMAND_CATALOG.filter((item) => {
    const haystack = `${item.title} ${item.subtitle} ${item.keywords.join(' ')}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function createGeneratedNodesForCommand(
  commandId: string,
  doc: DocumentState,
): CanvasNode[] {
  const t = doc.tokens;
  const uid = Math.random().toString(36).slice(2, 7);
  const cx = Math.round(doc.artboard.width / 2);
  const cy = Math.round(doc.artboard.height / 2);

  if (commandId === 'gen-glass-pricing') {
    const w = 264;
    const h = 186;
    const x = Math.max(24, Math.round(cx - w / 2));
    const y = Math.max(24, Math.round(cy - h / 2));
    return [
      {
        id: `glass-pricing-${uid}`,
        name: 'Glass Pricing Card',
        type: 'glass',
        x,
        y,
        width: w,
        height: h,
        rotation: 0,
        radius: t.radiusBase,
        opacity: 1,
        fill: {
          kind: 'gradient',
          color: t.surfaceCard,
          gradient: { angle: 145, from: t.surfaceCard, to: t.surfaceElevated },
        },
        strokeColor: t.brandPrimary,
        strokeWidth: 1,
        blur: 22,
        shadow: 'floating',
        blendMode: 'normal',
        locked: false,
        visible: true,
        tokenBinding: {
          fill: 'surfaceCard',
          fillGradientFrom: 'surfaceCard',
          fillGradientTo: 'surfaceElevated',
          stroke: 'brandPrimary',
          radius: 'radiusBase',
        },
      },
      {
        id: `glass-pricing-tier-${uid}`,
        name: 'Pricing Tier Eyebrow',
        type: 'text',
        x: x + 22,
        y: y + 20,
        width: 220,
        height: 18,
        rotation: 0,
        radius: 0,
        opacity: 1,
        fill: { kind: 'none', color: 'transparent' },
        strokeColor: 'transparent',
        strokeWidth: 0,
        blur: 0,
        shadow: 'none',
        blendMode: 'normal',
        locked: false,
        visible: true,
        text: 'STUDIO PRO  ·  MONTHLY',
        fontFamily: 'JetBrains Mono',
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: 1.3,
        textAlign: 'left',
        textColor: t.brandAccent,
        tokenBinding: { textColor: 'brandAccent' },
      },
      {
        id: `glass-pricing-price-${uid}`,
        name: 'Pricing Amount',
        type: 'text',
        x: x + 22,
        y: y + 48,
        width: 220,
        height: 46,
        rotation: 0,
        radius: 0,
        opacity: 1,
        fill: { kind: 'none', color: 'transparent' },
        strokeColor: 'transparent',
        strokeWidth: 0,
        blur: 0,
        shadow: 'none',
        blendMode: 'normal',
        locked: false,
        visible: true,
        text: '$49 / mo',
        fontFamily: 'Space Grotesk',
        fontWeight: 700,
        fontSize: 34,
        letterSpacing: -1,
        textAlign: 'left',
        textColor: t.textPrimary,
        tokenBinding: { textColor: 'textPrimary' },
      },
      {
        id: `glass-pricing-cta-${uid}`,
        name: 'Pricing Upgrade Button',
        type: 'button',
        x: x + 22,
        y: y + 122,
        width: 220,
        height: 42,
        rotation: 0,
        radius: 10,
        opacity: 1,
        fill: {
          kind: 'gradient',
          color: t.brandPrimary,
          gradient: { angle: 120, from: t.brandPrimary, to: t.brandAccent },
        },
        strokeColor: 'transparent',
        strokeWidth: 0,
        blur: 0,
        shadow: 'neon',
        blendMode: 'normal',
        locked: false,
        visible: true,
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
      },
    ];
  }

  if (commandId === 'gen-neon-orb') {
    return [
      {
        id: `neon-orb-${uid}`,
        name: 'Neon Gradient Orb',
        type: 'ellipse',
        x: Math.round(cx - 90),
        y: Math.round(cy - 90),
        width: 180,
        height: 180,
        rotation: 0,
        radius: 90,
        opacity: 0.78,
        fill: {
          kind: 'gradient',
          color: t.brandPrimary,
          gradient: { angle: 135, from: t.brandPrimary, to: t.brandAccent },
        },
        strokeColor: 'transparent',
        strokeWidth: 0,
        blur: 0,
        shadow: 'neon',
        blendMode: 'screen',
        locked: false,
        visible: true,
        tokenBinding: {
          fill: 'brandPrimary',
          fillGradientFrom: 'brandPrimary',
          fillGradientTo: 'brandAccent',
        },
      },
    ];
  }

  if (commandId === 'gen-primary-cta') {
    return [
      {
        id: `cta-btn-${uid}`,
        name: 'Primary Action CTA',
        type: 'button',
        x: Math.round(cx - 96),
        y: Math.round(cy - 24),
        width: 192,
        height: 48,
        rotation: 0,
        radius: 12,
        opacity: 1,
        fill: {
          kind: 'gradient',
          color: t.brandPrimary,
          gradient: { angle: 120, from: t.brandPrimary, to: t.brandAccent },
        },
        strokeColor: 'transparent',
        strokeWidth: 0,
        blur: 0,
        shadow: 'neon',
        blendMode: 'normal',
        locked: false,
        visible: true,
        text: 'Deploy Component',
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
      },
    ];
  }

  if (commandId === 'gen-editorial-title') {
    return [
      {
        id: `editorial-${uid}`,
        name: 'Editorial Headline',
        type: 'text',
        x: Math.round(cx - 190),
        y: Math.round(cy - 28),
        width: 380,
        height: 56,
        rotation: 0,
        radius: 0,
        opacity: 1,
        fill: { kind: 'none', color: 'transparent' },
        strokeColor: 'transparent',
        strokeWidth: 0,
        blur: 0,
        shadow: 'none',
        blendMode: 'normal',
        locked: false,
        visible: true,
        text: 'Precision Craft at Scale',
        fontFamily: 'Cormorant Garamond',
        fontWeight: 600,
        fontSize: 42,
        letterSpacing: -0.6,
        textAlign: 'center',
        textColor: t.textPrimary,
        tokenBinding: { textColor: 'textPrimary' },
      },
    ];
  }

  return [];
}

export function resolveThemeCommand(commandId: string) {
  switch (commandId) {
    case 'theme-swiss-vermilion':
      return getTokenThemeById('swiss-vermilion');
    case 'theme-obsidian-electric':
      return getTokenThemeById('obsidian-electric');
    case 'theme-apple-frosted':
      return getTokenThemeById('apple-frosted');
    case 'theme-tokyo-bauhaus':
      return getTokenThemeById('tokyo-bauhaus');
    default:
      return null;
  }
}
