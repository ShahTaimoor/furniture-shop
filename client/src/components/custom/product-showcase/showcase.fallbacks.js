// Shared fallback imagery for the Product Showcase when an admin hasn't
// configured a background yet, or a product/override image fails to load.
// Kept in one place so swapping the "default look" is a one-file change.

export const DEFAULT_BG_IMAGES = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1920&q=80',
];

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=900&q=80';

export const FINAL_FALLBACK_IMAGE = '/logo.svg';
