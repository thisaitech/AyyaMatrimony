export const PROFILE_PHOTOS_KEY = 'profilePhotos';
/** Admin-approved cloud URLs only — used for home, profile tab, and member listings. */
export const APPROVED_PROFILE_PHOTO_URLS_KEY = 'approvedProfilePhotoUrls';
/** Local file/content URIs during biodata draft — survives Android activity restarts. */
export const PROFILE_PHOTOS_DRAFT_KEY = 'profilePhotosDraft';
export const BIODATA_SHOW_PHOTO_KEY = 'biodataShowPhoto';
export const PHOTO_SKIP_KEY = 'photoSkipped';

export function parseBiodataShowPhoto(raw: string | undefined): boolean {
  if (!raw?.trim()) {
    return true;
  }
  return raw.trim().toLowerCase() !== 'false';
}
export const MAX_PROFILE_PHOTOS = 3;

export function isRemotePhotoUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export function isLocalPhotoUri(uri: string): boolean {
  return Boolean(uri.trim()) && !isRemotePhotoUri(uri);
}

/** URLs that can render in a browser (admin web, Expo web). */
export function isWebDisplayablePhotoUri(uri: string): boolean {
  const trimmed = uri.trim();
  if (!trimmed) {
    return false;
  }
  return (
    isRemotePhotoUri(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')
  );
}

/** URLs that can render on a native device (includes local cache paths). */
export function isNativeDisplayablePhotoUri(uri: string): boolean {
  const trimmed = uri.trim();
  if (!trimmed) {
    return false;
  }
  return (
    isWebDisplayablePhotoUri(trimmed) ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://')
  );
}

export function isDisplayablePhotoUri(uri: string, platform: 'web' | 'native' = 'native'): boolean {
  return platform === 'web' ? isWebDisplayablePhotoUri(uri) : isNativeDisplayablePhotoUri(uri);
}

/** Drop device-local paths on web so Image does not throw "Not allowed to load local resource". */
export function resolveDisplayPhotoUri(uri: string, platform: 'web' | 'native' = 'native'): string {
  const trimmed = uri?.trim() ?? '';
  return isDisplayablePhotoUri(trimmed, platform) ? trimmed : '';
}

export function firstDisplayablePhotoUri(
  photos: string[],
  platform: 'web' | 'native' = 'native',
): string {
  for (const photo of photos) {
    const resolved = resolveDisplayPhotoUri(photo, platform);
    if (resolved) {
      return resolved;
    }
  }
  return '';
}

/** Listing cards and Firestore should only store cloud URLs — never device cache paths. */
export function resolvePortableListingPhotoUri(photos: string[]): string {
  return photos.find(isRemotePhotoUri) ?? '';
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

/** Prefer in-progress local draft URIs over persisted remote-only slots. */
export function mergeDraftProfilePhotos(draftRaw: string, persistedRaw: string): string[] {
  const draftPhotos = parseProfilePhotos(draftRaw);
  const storedPhotos = parseProfilePhotos(persistedRaw);
  if (draftPhotos.some((photo) => photo.length > 0)) {
    return draftPhotos;
  }
  return storedPhotos;
}

/** Editable biodata step — keep pending cloud uploads visible while filling the form. */
export function mergeEditableProfilePhotos(
  draftRaw: string,
  persistedRaw: string,
  profilePhotoUrlsRaw = '',
): string[] {
  const draftPhotos = parseProfilePhotos(draftRaw);
  if (draftPhotos.some((photo) => photo.length > 0)) {
    return draftPhotos;
  }

  const storedPhotos = parseProfilePhotos(persistedRaw);
  if (storedPhotos.some((photo) => photo.length > 0)) {
    return storedPhotos;
  }

  return parseRemotePhotoUrls(profilePhotoUrlsRaw);
}

/** Member-facing profile/biodata view — approved cloud photos only. */
export function mergeApprovedProfilePhotos(
  approvedRaw: string,
  persistedRaw: string,
): string[] {
  const approvedPhotos = parseApprovedProfilePhotoUrls(approvedRaw);
  if (approvedPhotos.some((photo) => photo.length > 0)) {
    return approvedPhotos;
  }
  return parseProfilePhotos(persistedRaw).map((photo) => (isRemotePhotoUri(photo) ? photo : ''));
}

/** Resolve which photo slots the biodata form should render. */
export function resolveBiodataFormPhotoSlots(
  values: Record<string, string>,
  options: { viewOnly?: boolean; adminEntry?: boolean } = {},
): string[] {
  if (options.viewOnly) {
    return mergeApprovedProfilePhotos(
      values[APPROVED_PROFILE_PHOTO_URLS_KEY] ?? '',
      values[PROFILE_PHOTOS_KEY] ?? '',
    );
  }

  return mergeEditableProfilePhotos(
    values[PROFILE_PHOTOS_DRAFT_KEY] ?? '',
    values[PROFILE_PHOTOS_KEY] ?? '',
    values.profilePhotoUrls ?? '',
  );
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

export function parseRemotePhotoUrls(raw: string | undefined): string[] {
  const parts = (raw ?? '').split('|');
  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const url = parts[index]?.trim() ?? '';
    return isRemotePhotoUri(url) ? url : '';
  });
}

export function parseApprovedProfilePhotoUrls(raw: string | undefined): string[] {
  return parseRemotePhotoUrls(raw);
}

export function serializeRemotePhotoUrls(photos: string[]): string {
  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const url = photos[index]?.trim() ?? '';
    return isRemotePhotoUri(url) ? url : '';
  }).join('|');
}

/** Approved cloud URLs only — for public profile avatar and member listings. */
export function resolveApprovedProfilePhotoSlots(
  profile: {
    approvedPhotoUrls?: string[];
    primaryPhotoUrl?: string;
    biodata?: Record<string, string>;
  },
  fallbackSlots: string[] = [],
): string[] {
  const biodata = profile.biodata ?? {};
  const fromDoc = Array.isArray(profile.approvedPhotoUrls) ? profile.approvedPhotoUrls : [];
  const fromBiodata = parseApprovedProfilePhotoUrls(biodata[APPROVED_PROFILE_PHOTO_URLS_KEY]);
  const primary = profile.primaryPhotoUrl?.trim() ?? '';

  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const candidates = [fromDoc[index], fromBiodata[index], fallbackSlots[index], index === 0 ? primary : ''];

    for (const candidate of candidates) {
      if (candidate && isRemotePhotoUri(candidate)) {
        return candidate;
      }
    }

    return '';
  });
}

type ProfilePhotoSlotOptions = {
  /** Include device-local URIs (admin preview on native before cloud upload completes). */
  includeLocal?: boolean;
  platform?: 'web' | 'native';
};

function isPersistedPhotoUri(
  uri: string,
  options: ProfilePhotoSlotOptions = {},
): boolean {
  const trimmed = uri?.trim() ?? '';
  if (!trimmed) {
    return false;
  }
  if (options.includeLocal) {
    return isDisplayablePhotoUri(trimmed, options.platform ?? 'native');
  }
  return isRemotePhotoUri(trimmed);
}

/** Merge every Firestore photo field into fixed slots for admin display and biodata hydration. */
export function resolveProfilePhotoSlots(
  profile: {
    photoUrls?: string[];
    approvedPhotoUrls?: string[];
    primaryPhotoUrl?: string;
    listing?: { image?: string };
    biodata?: Record<string, string>;
  },
  fallbackSlots: string[] = [],
  options: ProfilePhotoSlotOptions = {},
): string[] {
  const biodata = profile.biodata ?? {};
  const fromDoc = Array.isArray(profile.photoUrls) ? profile.photoUrls : [];
  const fromApproved = Array.isArray(profile.approvedPhotoUrls) ? profile.approvedPhotoUrls : [];
  const fromBiodataPhotos = parseProfilePhotos(biodata[PROFILE_PHOTOS_KEY] ?? '');
  const fromDraftPhotos = parseProfilePhotos(biodata[PROFILE_PHOTOS_DRAFT_KEY] ?? '');
  const fromPipe = (biodata.profilePhotoUrls ?? '').split('|');
  const primary = profile.primaryPhotoUrl?.trim() ?? '';
  const listingImage = profile.listing?.image?.trim() ?? '';

  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const candidates = [
      fromDoc[index],
      fromApproved[index],
      fromBiodataPhotos[index],
      fromDraftPhotos[index],
      fromPipe[index],
      fallbackSlots[index],
      index === 0 ? primary : '',
      index === 0 ? listingImage : '',
    ];

    for (const candidate of candidates) {
      if (candidate && isPersistedPhotoUri(candidate, options)) {
        return candidate;
      }
    }

    return '';
  });
}

export function mergeProfilePhotosIntoBiodata(
  biodata: Record<string, string>,
  profile: {
    photoUrls?: string[];
    approvedPhotoUrls?: string[];
    primaryPhotoUrl?: string;
    listing?: { image?: string };
    biodata?: Record<string, string>;
    registrationSource?: string;
    ownerKey?: string;
  },
  fallbackSlots: string[] = [],
  approvedFallbackSlots: string[] = [],
): Record<string, string> {
  const slots = resolveProfilePhotoSlots(profile, fallbackSlots);
  let approvedSlots = resolveApprovedProfilePhotoSlots(profile, approvedFallbackSlots);
  const isAdminMember =
    profile.registrationSource === 'admin' || profile.ownerKey?.startsWith('admin-');
  if (isAdminMember && !approvedSlots.some(Boolean)) {
    approvedSlots = slots.map((url) => (isRemotePhotoUri(url) ? url : ''));
  }
  if (!slots.some(Boolean) && !approvedSlots.some(Boolean)) {
    return biodata;
  }

  const displaySlots = slots.some(Boolean) ? slots : approvedSlots;
  const approvedPrimary = approvedSlots.find(Boolean) ?? resolvePortableListingPhotoUri(displaySlots);
  return {
    ...biodata,
    profilePhotoUrls: serializeRemotePhotoUrls(displaySlots),
    [APPROVED_PROFILE_PHOTO_URLS_KEY]: serializeRemotePhotoUrls(approvedSlots),
    [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(approvedSlots.some(Boolean) ? approvedSlots : displaySlots),
    listingImage: approvedPrimary,
  };
}

/** Keep pending local/cloud uploads when Firestore refresh is stale or incomplete. */
export function mergeHydratedProfilePhotoFields(
  local: Record<string, string>,
  remote: Record<string, string>,
): Record<string, string> {
  const next = { ...local, ...remote };

  const localUploaded = parseRemotePhotoUrls(local.profilePhotoUrls);
  const remoteUploaded = parseRemotePhotoUrls(remote.profilePhotoUrls);
  const mergedUploaded = Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    return remoteUploaded[index] || localUploaded[index] || '';
  });
  if (mergedUploaded.some(Boolean)) {
    next.profilePhotoUrls = serializeRemotePhotoUrls(mergedUploaded);
  } else if (local.profilePhotoUrls?.trim()) {
    next.profilePhotoUrls = local.profilePhotoUrls;
  }

  const localApproved = parseApprovedProfilePhotoUrls(local[APPROVED_PROFILE_PHOTO_URLS_KEY]);
  const remoteApproved = parseApprovedProfilePhotoUrls(remote[APPROVED_PROFILE_PHOTO_URLS_KEY]);
  if (remoteApproved.some(Boolean)) {
    next[APPROVED_PROFILE_PHOTO_URLS_KEY] = serializeRemotePhotoUrls(remoteApproved);
  } else if (localApproved.some(Boolean)) {
    next[APPROVED_PROFILE_PHOTO_URLS_KEY] = serializeRemotePhotoUrls(localApproved);
  }

  if (local[PROFILE_PHOTOS_DRAFT_KEY]?.trim() && !remote[PROFILE_PHOTOS_DRAFT_KEY]?.trim()) {
    next[PROFILE_PHOTOS_DRAFT_KEY] = local[PROFILE_PHOTOS_DRAFT_KEY];
  }

  if (!next.listingImage?.trim()) {
    next.listingImage =
      remote.listingImage?.trim() ||
      local.listingImage?.trim() ||
      resolvePortableListingPhotoUri(remoteApproved.some(Boolean) ? remoteApproved : mergedUploaded);
  }

  return next;
}

/** Admin lists and profile view — pending and approved photos, including local picks on native. */
export function getAdminProfilePhotoUri(
  profile: {
    photoUrls?: string[];
    approvedPhotoUrls?: string[];
    primaryPhotoUrl?: string;
    listing?: { image?: string };
    biodata?: Record<string, string>;
  },
  platform: 'web' | 'native' = 'native',
  fallbackSlots: string[] = [],
): string {
  const slots = resolveProfilePhotoSlots(profile, fallbackSlots, { includeLocal: true, platform });
  const resolved = firstDisplayablePhotoUri(slots, platform);
  if (resolved) {
    return resolved;
  }

  const listingImage = profile.listing?.image?.trim() ?? '';
  const resolvedListing = resolveDisplayPhotoUri(listingImage, platform);
  if (resolvedListing) {
    return resolvedListing;
  }

  const biodataPrimary = profile.biodata?.listingImage?.trim() ?? '';
  const resolvedBiodata = resolveDisplayPhotoUri(biodataPrimary, platform);
  if (resolvedBiodata) {
    return resolvedBiodata;
  }

  const primary = profile.primaryPhotoUrl?.trim() ?? '';
  return resolveDisplayPhotoUri(primary, platform);
}

/** All displayable admin profile photos (up to MAX_PROFILE_PHOTOS). */
export function getAdminProfilePhotoUris(
  profile: {
    photoUrls?: string[];
    approvedPhotoUrls?: string[];
    primaryPhotoUrl?: string;
    listing?: { image?: string };
    biodata?: Record<string, string>;
  },
  platform: 'web' | 'native' = 'native',
  fallbackSlots: string[] = [],
): string[] {
  const slots = resolveProfilePhotoSlots(profile, fallbackSlots, { includeLocal: true, platform });
  const resolved = slots
    .map((uri) => resolveDisplayPhotoUri(uri, platform))
    .filter((uri) => Boolean(uri));

  if (resolved.length > 0) {
    return resolved;
  }

  for (const candidate of [
    profile.listing?.image,
    profile.biodata?.listingImage,
    profile.primaryPhotoUrl,
  ]) {
    const uri = resolveDisplayPhotoUri(candidate?.trim() ?? '', platform);
    if (uri) {
      return [uri];
    }
  }

  return [];
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
