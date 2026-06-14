export const PROFILE_PHOTOS_KEY = 'profilePhotos';
export const PHOTO_SKIP_KEY = 'photoSkipped';
export const MAX_PROFILE_PHOTOS = 3;

export function parseProfilePhotos(raw: string): string[] {
  if (!raw) {
    return Array.from({ length: MAX_PROFILE_PHOTOS }, () => '');
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
        const item = parsed[index];
        return typeof item === 'string' ? item : '';
      });
    }
  } catch {
    // Ignore invalid stored values.
  }

  return Array.from({ length: MAX_PROFILE_PHOTOS }, () => '');
}

export function serializeProfilePhotos(photos: string[]): string {
  return JSON.stringify(
    Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => photos[index] ?? ''),
  );
}

export function hasRequiredPhotos(photos: string[], skipped: boolean): boolean {
  return skipped || photos.some((photo) => photo.length > 0);
}
