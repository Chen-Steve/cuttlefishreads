/** Server actions reject bodies above this; stay under Vercel's ~4.5MB cap. */
export const MAX_COVER_BYTES = 2 * 1024 * 1024;

/** Reject huge source files before we try to decode them in the browser. */
export const MAX_COVER_SOURCE_BYTES = 15 * 1024 * 1024;

export function validateCoverFile(file: File): string | null {
  if (file.size > MAX_COVER_BYTES) {
    return `Cover image is too large (max ${MAX_COVER_BYTES / 1024 / 1024} MB). Try a smaller image.`;
  }
  if (file.type && !file.type.startsWith("image/")) {
    return "Cover must be an image file (JPEG, PNG, WebP, or GIF).";
  }
  return null;
}
