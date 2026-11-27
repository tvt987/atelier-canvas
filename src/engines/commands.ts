import type { CanvasNode, DocumentState } from '../types/canvas';
import { getTokenThemeById } from './tokens';
import { instantiateAssetKitItem } from './assets';

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
    id: 'gen-kpi-sparkline',
    title: 'Insert KPI Sparkline Metric Card',
    subtitle: 'Add glass metric widget with smooth Bezier sparkline curve',
    category: 'generate',
    keywords: ['kpi', 'sparkline', 'chart', 'metric', 'bezier', 'widget'],
  },
  {
    id: 'gen-neon-orb',
    title: 'Create Neon Gradient Orb',
    subtitle: 'Add ambient electric radial accent sphere with levitation',
    category: 'generate',
    keywords: ['create', 'neon', 'gradient', 'orb', 'ellipse', 'glow'],
  },
  {
    id: 'gen-primary-cta',
    title: 'Add Primary CTA Button',
    subtitle: 'Insert gradient button with hover lift & toast action',
    category: 'generate',
    keywords: ['add', 'button', 'cta', 'action', 'primary'],
  },
  {
    id: 'gen-editorial-title',
    title: 'Insert Editorial Display Headline',
    subtitle: 'Add Cormorant Garamond editorial typography lockup',
    category: 'generate',
    keywords: ['text', 'headline', 'editorial', 'serif', 'typography'],
  },
  {
    id: 'mode-present-prototype',
    title: 'Launch Interactive Prototype Presentation',
    subtitle: 'Open fullscreen presentation player with MacBook / iPhone frames',
    category: 'mode',
    keywords: ['present', 'play', 'prototype', 'preview', 'fullscreen', 'device'],
  },
  {
    id: 'mode-prototype',
    title: 'Switch to Prototype Mode',
    subtitle: 'Configure entrance animations, spring hovers & click interactions',
    category: 'mode',
    keywords: ['prototype', 'motion', 'animation', 'interaction', 'mode'],
    shortcut: 'Shift+2',
  },
  {
    id: 'mode-toggle-dev',
    title: 'Toggle Dev Mode',
    subtitle: 'Switch between Design canvas & Framer Motion / Tailwind v4 codegen',
    category: 'mode',
    keywords: ['dev', 'mode', 'code', 'inspect', 'redline', 'tailwind'],
    shortcut: 'Shift+3',
  },
  {
    id: 'theme-obsidian-pro',
    title: 'Switch to Obsidian Pro Theme',
    subtitle: 'Morph all token-bound layers to Obsidian Pro indigo & cyan',
    category: 'theme',
    keywords: ['obsidian', 'pro', 'indigo', 'dark', 'theme', 'tokens'],
  },
  {
    id: 'theme-swiss-editorial-light',
    title: 'Switch to Swiss Editorial Light Theme',
    subtitle: 'Morph all token-bound layers to architectural ivory & vermilion',
    category: 'theme',
    keywords: ['swiss', 'editorial', 'light', 'vermilion', 'theme', 'tokens'],
  },
  {
    id: 'theme-cyber-emerald',
    title: 'Switch to Cyber Emerald Theme',
    subtitle: 'Morph canvas to stealth jade & luminous emerald matrix tokens',
    category: 'theme',
    keywords: ['cyber', 'emerald', 'green', 'matrix', 'theme', 'tokens'],
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
    id: 'open-variant-matrix',
    title: 'Open Component Variant Matrix & WCAG 2.1 Contrast Audit',
    subtitle: 'Inspect 4×3×4 UI variants, 1-click Auto-Fix contrast & export React CVA / SwiftUI',
    category: 'mode',
    keywords: ['variant', 'matrix', 'component', 'wcag', 'contrast', 'audit', 'cva', 'swiftui', 'autofix', 'button', 'badge', 'input'],
  },
  {
    id: 'toggle-canvas-backdrop',
    title: 'Toggle Light Studio Canvas (#F4F5F7) / Dark Figma Canvas',
    subtitle: 'Switch canvas backdrop between Daylight Light UI and Obsidian Dark surface',
    category: 'layout',
    keywords: ['daylight', 'light', 'dark', 'obsidian', 'canvas', 'backdrop', 'figma', 'surface'],
  },
  {
    id: 'open-token-compiler',
    title: 'Multi-Platform Design Token Compiler (Tailwind v4 / TS / SwiftUI / Kotlin)',
    subtitle: 'Compile active W3C tokens to Web, React, iOS & Android with WCAG audit',
    category: 'export',
    keywords: ['compile', 'token', 'compiler', 'tailwind', 'typescript', 'swiftui', 'kotlin', 'compose', 'ios', 'android'],
  },
  {
    id: 'enterprise-license',
    title: 'Enterprise Super VIP Pro License (MBBank VietQR)',
    subtitle: 'Unlock full commercial studio license — 13.900.000 VND',
    category: 'export',
    keywords: ['enterprise', 'license', 'pro', 'vietqr', 'mbbank', 'billing', 'upgrade'],
  },
  {
    id: 'layout-toggle-grid-8px',
    title: 'Toggle 8px Snap Grid',
    subtitle: 'Enable or disable exact 8px baseline snapping & micro-grid',
    category: 'layout',
    keywords: ['grid', '8px', 'snap', 'baseline', 'layout'],
  },
  {
    id: 'layout-center-selected',
    title: 'Center Selected Layer',
    subtitle: 'Align active selection to exact artboard center',
    category: 'layout',
    keywords: ['center', 'align', 'middle', 'layer', 'selected'],
  },
  {
    id: 'snapshot-save',
    title: 'Save Design Version Snapshot',
    subtitle: 'Capture named milestone in local version history',
    category: 'layout',
    keywords: ['snapshot', 'version', 'history', 'save', 'milestone'],
  },
  {
    id: 'export-svg',
    title: 'Export Studio (SVG / 2x-3x PNG / Animated HTML / TSX)',
    subtitle: 'Open Export Studio to download production vector & code assets',
    category: 'export',
    keywords: ['export', 'svg', 'png', 'html', 'download', 'tsx', 'code'],
  },
  {
    id: 'mode-toggle-3dstack',
    title: 'Toggle 3D Stack Depth Explode View',
    subtitle: 'Inspect every z-index layer floating in interactive 3D space',
    category: 'mode',
    keywords: ['3d', 'stack', 'explode', 'depth', 'layers', 'isometric'],
  },
  {
    id: 'project-save-file',
    title: 'Save Project as .atelier.json',
    subtitle: 'Download complete multi-artboard project file locally',
    category: 'export',
    keywords: ['save', 'project', 'atelier', 'json', 'backup', 'file'],
  },
  {
    id: 'template-editorial',
    title: 'Load Template: Luxury Editorial Campaign (Real Photography)',
    subtitle: 'Switch artboard to Hasselblad editorial photography spread',
    category: 'template',
    keywords: ['template', 'luxury', 'editorial', 'photo', 'photography', 'campaign'],
  },
  {
    id: 'template-swiss',
    title: 'Load Template: Swiss Exhibition Poster',
    subtitle: 'Switch artboard to International Typographic poster',
    category: 'template',
    keywords: ['template', 'swiss', 'poster', 'exhibition'],
  },
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
  if (commandId === 'gen-glass-pricing') {
    return instantiateAssetKitItem('glass-pricing', doc);
  }
  if (commandId === 'gen-kpi-sparkline') {
    return instantiateAssetKitItem('kpi-sparkline', doc);
  }
  if (commandId === 'gen-neon-orb') {
    return instantiateAssetKitItem('ambient-orb', doc);
  }
  if (commandId === 'gen-editorial-title') {
    return instantiateAssetKitItem('editorial-hero', doc);
  }

  if (commandId === 'gen-primary-cta') {
    const t = doc.tokens;
    const uid = Math.random().toString(36).slice(2, 7);
    const cx = Math.round(doc.artboard.width / 2);
    const cy = Math.round(doc.artboard.height / 2);
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
        prototype: {
          entrance: 'spring-scale',
          durationMs: 460,
          delayMs: 0,
          easing: 'spring',
          hoverEffect: 'lift-glow',
          clickAction: 'toast',
          clickPayload: 'Component deployed to production edge',
        },
      },
    ];
  }

  return [];
}

export function resolveThemeCommand(commandId: string) {
  switch (commandId) {
    case 'theme-obsidian-pro':
      return getTokenThemeById('obsidian-pro');
    case 'theme-swiss-editorial-light':
      return getTokenThemeById('swiss-editorial-light');
    case 'theme-cyber-emerald':
      return getTokenThemeById('cyber-emerald');
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
