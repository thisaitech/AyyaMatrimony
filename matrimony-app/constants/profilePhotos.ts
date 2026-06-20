export const PROFILE_PHOTOS_KEY = 'profilePhotos';
export const PHOTO_SKIP_KEY = 'photoSkipped';
export const MAX_PROFILE_PHOTOS = 3;

export function isRemotePhotoUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export function isLocalPhotoUri(uri: string): boolean {
  return Boolean(uri.trim()) && !isRemotePhotoUri(uri);
}

/** Keep only cloud URLs in persisted profile storage — never base64/blob/file paths. */
export function photosForPersistence(photos: string[]): string[] {
  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const photo = photos[index] ?? '';
    return isRemotePhotoUri(photo) ? photo : '';
  });
}

export function serializePersistedProfilePhotos(photos: string[]): string {
  return serializeProfilePhotos(photosForPersistence(photos));
}

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

export function mergeUploadedPhotos(localPhotos: string[], uploadedPhotos: string[]): string[] {
  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const uploaded = uploadedPhotos[index] ?? '';
    const local = localPhotos[index] ?? '';
    if (uploaded) {
      return uploaded;
    }
    if (isRemotePhotoUri(local)) {
      return local;
    }
    return local;
  });
}

export function remotePhotoUrlList(photos: string[]): string[] {
  return photos.filter((photo) => isRemotePhotoUri(photo));
}

export function serializeRemotePhotoUrls(photos: string[]): string {
  return remotePhotoUrlList(photos).join('|');
}

export function biodataForFirestore(values: Record<string, string>): Record<string, string> {
  const remoteUrls = values.profilePhotoUrls?.split('|').filter(isRemotePhotoUri) ?? [];
  const localPhotos = parseProfilePhotos(values[PROFILE_PHOTOS_KEY] ?? '');
  const remoteSlots = Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const remote = remoteUrls[index] ?? '';
    const local = localPhotos[index] ?? '';
    return isRemotePhotoUri(remote) ? remote : isRemotePhotoUri(local) ? local : '';
  });

  return {
    ...values,
    profilePhotoUrls: serializeRemotePhotoUrls(remoteSlots),
    [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(remoteSlots),
  };
}

export function hasRequiredPhotos(photos: string[], skipped: boolean): boolean {
  return skipped || photos.some((photo) => photo.length > 0);
}
