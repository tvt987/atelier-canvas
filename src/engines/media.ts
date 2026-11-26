import type { ImageFilterConfig } from '../types/canvas';

export const DEFAULT_IMAGE_FILTER: ImageFilterConfig = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  blur: 0,
};

export function resolveMediaUrl(filename: string): string {
  const base =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.BASE_URL === 'string'
      ? import.meta.env.BASE_URL
      : '/atelier-canvas/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}media/${filename}`;
}

export interface StudioPhotoPreset {
  id: string;
  filename: string;
  title: string;
  category: string;
  src: string;
  defaultW: number;
  defaultH: number;
}

export const STUDIO_PHOTOS: StudioPhotoPreset[] = [
  {
    id: 'hero-eyewear',
    filename: 'hero_eyewear_editorial.webp',
    title: 'Editorial Eyewear Portrait',
    category: 'Campaign',
    src: resolveMediaUrl('hero_eyewear_editorial.webp'),
    defaultW: 360,
    defaultH: 460,
  },
  {
    id: 'lookbook-autumn',
    filename: 'lookbook_01_autumn.webp',
    title: 'Autumn Tailoring Look 01',
    category: 'Lookbook',
    src: resolveMediaUrl('lookbook_01_autumn.webp'),
    defaultW: 300,
    defaultH: 360,
  },
  {
    id: 'lookbook-travel',
    filename: 'lookbook_02_travel.webp',
    title: 'Voyage Architecture Look 02',
    category: 'Lookbook',
    src: resolveMediaUrl('lookbook_02_travel.webp'),
    defaultW: 300,
    defaultH: 360,
  },
  {
    id: 'lookbook-nocturne',
    filename: 'lookbook_03_nocturne.webp',
    title: 'Nocturne Silhouette Look 03',
    category: 'Editorial',
    src: resolveMediaUrl('lookbook_03_nocturne.webp'),
    defaultW: 300,
    defaultH: 360,
  },
  {
    id: 'prod-fragrance',
    filename: 'prod_frg_01.webp',
    title: 'Sculptural Fragrance Bottle',
    category: 'Product',
    src: resolveMediaUrl('prod_frg_01.webp'),
    defaultW: 260,
    defaultH: 260,
  },
  {
    id: 'prod-object',
    filename: 'prod_obj_01.webp',
    title: 'Minimalist Ceramic Vessel',
    category: 'Object',
    src: resolveMediaUrl('prod_obj_01.webp'),
    defaultW: 260,
    defaultH: 260,
  },
];

export function buildImageFilterCss(
  filter?: ImageFilterConfig,
): string | undefined {
  if (!filter) return undefined;
  const parts: string[] = [];
  if (filter.brightness !== 100) parts.push(`brightness(${filter.brightness}%)`);
  if (filter.contrast !== 100) parts.push(`contrast(${filter.contrast}%)`);
  if (filter.saturate !== 100) parts.push(`saturate(${filter.saturate}%)`);
  if (filter.grayscale > 0) parts.push(`grayscale(${filter.grayscale}%)`);
  if (filter.blur > 0) parts.push(`blur(${filter.blur}px)`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}
