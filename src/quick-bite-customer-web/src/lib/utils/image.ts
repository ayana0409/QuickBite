/**
 * Utility for formatting and normalizing image URLs across QuickBite Customer Web.
 * Safely resolves bare Cloudinary filenames to full HTTPS URLs and provides fallbacks.
 */

export const DEFAULT_FALLBACK_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_FOLDER =
  process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || 'quick-bite/food-items';

/**
 * Format any image filename or URL to a complete, accessible URL.
 * If given a bare filename (e.g. food-ae7ab...webp), prepends the Cloudinary base URL using environment variables.
 */
export function formatImageUrl(
  urlOrFilename?: string | null,
  fallback: string = DEFAULT_FALLBACK_FOOD_IMAGE,
): string {
  if (!urlOrFilename || typeof urlOrFilename !== 'string') {
    return fallback;
  }

  const trimmed = urlOrFilename.trim();
  if (!trimmed) {
    return fallback;
  }

  // Already an absolute HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Data URLs or Blob URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If no Cloudinary cloud name is provided in env, return fallback image
  if (!CLOUDINARY_CLOUD_NAME) {
    return fallback;
  }

  // Remove leading slashes and build Cloudinary URL
  const cleanFilename = trimmed.replace(/^\/+/, '');
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${CLOUDINARY_FOLDER}/${cleanFilename}`;
}

/**
 * Formats all images inside a food item object.
 */
export function formatFoodItemImages<T extends { images?: string[] }>(food: T): T {
  if (!food) return food;
  if (Array.isArray(food.images)) {
    return {
      ...food,
      images: food.images.map((img) => formatImageUrl(img)),
    };
  }
  return food;
}
