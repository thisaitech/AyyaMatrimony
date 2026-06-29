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
/** Firestore field size limit — keep compressed JPEG data URLs under this. */
export const MAX_FIRESTORE_DATA_PHOTO_CHARS = 400_000;

export function isRemotePhotoUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export function isPersistableDataPhotoUri(uri: string): boolean {
  const trimmed = uri.trim();
  return trimmed.startsWith('data:image/') && trimmed.length <= MAX_FIRESTORE_DATA_PHOTO_CHARS;
}

/** HTTPS download URLs or compressed JPEG data URLs saved to Firestore when Storage CORS blocks web. */
export function isPersistablePhotoUri(uri: string): boolean {
  return isRemotePhotoUri(uri) || isPersistableDataPhotoUri(uri);
}

export function isLocalPhotoUri(uri: string): boolean {
  const trimmed = uri.trim();
  if (!trimmed || isRemotePhotoUri(trimmed) || isPersistableDataPhotoUri(trimmed)) {
    return false;
  }
  return true;
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
  if (trimmed.startsWith('blob:')) {
    return false;
  }
  return (
    isRemotePhotoUri(trimmed) ||
    trimmed.startsWith('data:') ||
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

/** Listing cards prefer HTTPS; data URLs are a web-admin fallback only. */
export function resolvePortableListingPhotoUri(photos: string[]): string {
  return photos.find(isRemotePhotoUri) ?? photos.find(isPersistableDataPhotoUri) ?? '';
}

/** Keep persistable URIs (HTTPS or compressed data URLs) — never blob/file paths. */
export function photosForPersistence(photos: string[]): string[] {
  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const photo = photos[index] ?? '';
    return isPersistablePhotoUri(photo) ? photo : '';
  });
}

/** Firestore profile docs must only store cloud URLs — never blob/file/data URIs. */
export function remoteOnlyPhotoSlots(photos: string[]): string[] {
  return photosForPersistence(photos);
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
  options: { viewOnly?: boolean; adminEntry?: boolean; adminView?: boolean } = {},
): string[] {
  if (options.viewOnly && options.adminView) {
    return mergePersistablePhotoSlotSources(
      parsePersistablePhotoUrls(values.profilePhotoUrls),
      parseApprovedProfilePhotoUrls(values[APPROVED_PROFILE_PHOTO_URLS_KEY]),
      parseProfilePhotos(values[PROFILE_PHOTOS_KEY] ?? ''),
      parseProfilePhotos(values[PROFILE_PHOTOS_DRAFT_KEY] ?? ''),
    );
  }

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
    if (uploaded && isPersistablePhotoUri(uploaded)) {
      return uploaded;
    }
    if (isPersistablePhotoUri(local)) {
      return local;
    }
    return '';
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

export function parsePersistablePhotoUrls(raw: string | undefined): string[] {
  const parts = (raw ?? '').split('|');
  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const url = parts[index]?.trim() ?? '';
    return isPersistablePhotoUri(url) ? url : '';
  });
}

export function parseApprovedProfilePhotoUrls(raw: string | undefined): string[] {
  return parsePersistablePhotoUrls(raw);
}

export function serializeRemotePhotoUrls(photos: string[]): string {
  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const url = photos[index]?.trim() ?? '';
    return isRemotePhotoUri(url) ? url : '';
  }).join('|');
}

export function serializePersistablePhotoUrls(photos: string[]): string {
  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const url = photos[index]?.trim() ?? '';
    return isPersistablePhotoUri(url) ? url : '';
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
      if (candidate && isPersistablePhotoUri(candidate)) {
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
  return isPersistablePhotoUri(trimmed);
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
    approvedSlots = slots.map((url) => (isPersistablePhotoUri(url) ? url : ''));
  }
  if (!slots.some(Boolean) && !approvedSlots.some(Boolean)) {
    return biodata;
  }

  const displaySlots = slots.some(Boolean) ? slots : approvedSlots;
  const approvedPrimary = approvedSlots.find(Boolean) ?? resolvePortableListingPhotoUri(displaySlots);
  return {
    ...biodata,
    profilePhotoUrls: serializePersistablePhotoUrls(displaySlots),
    [APPROVED_PROFILE_PHOTO_URLS_KEY]: serializePersistablePhotoUrls(approvedSlots),
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

  const localUploaded = parsePersistablePhotoUrls(local.profilePhotoUrls);
  const remoteUploaded = parsePersistablePhotoUrls(remote.profilePhotoUrls);
  const mergedUploaded = mergePersistablePhotoSlotSources(remoteUploaded, localUploaded);
  if (mergedUploaded.some(Boolean)) {
    next.profilePhotoUrls = serializePersistablePhotoUrls(mergedUploaded);
  } else if (local.profilePhotoUrls?.trim()) {
    next.profilePhotoUrls = local.profilePhotoUrls;
  }

  const localApproved = parseApprovedProfilePhotoUrls(local[APPROVED_PROFILE_PHOTO_URLS_KEY]);
  const remoteApproved = parseApprovedProfilePhotoUrls(remote[APPROVED_PROFILE_PHOTO_URLS_KEY]);
  if (remoteApproved.some(Boolean)) {
    next[APPROVED_PROFILE_PHOTO_URLS_KEY] = serializePersistablePhotoUrls(remoteApproved);
  } else if (localApproved.some(Boolean)) {
    next[APPROVED_PROFILE_PHOTO_URLS_KEY] = serializePersistablePhotoUrls(localApproved);
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
  storageSlots: string[] = [],
): string {
  const uris = getAdminProfilePhotoUris(profile, platform, fallbackSlots, storageSlots);
  return uris[0] ?? '';
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
  storageSlots: string[] = [],
): string[] {
  const mergedFallback = mergeRemotePhotoSlotSources(fallbackSlots, storageSlots);
  const slots = resolveProfilePhotoSlots(profile, mergedFallback, { includeLocal: true, platform });
  const resolved = slots
    .map((uri) => resolveDisplayPhotoUri(uri, platform))
    .filter((uri) => Boolean(uri));

  if (resolved.length > 0) {
    return resolved;
  }

  for (const candidate of [
    ...storageSlots,
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

export function profileDocHasRemotePhotos(profile: {
  photoUrls?: string[];
  approvedPhotoUrls?: string[];
  primaryPhotoUrl?: string;
  listing?: { image?: string };
  biodata?: Record<string, string>;
}): boolean {
  const biodata = profile.biodata ?? {};
  const candidates = [
    ...(profile.photoUrls ?? []),
    ...(profile.approvedPhotoUrls ?? []),
    profile.primaryPhotoUrl ?? '',
    profile.listing?.image ?? '',
    biodata.listingImage ?? '',
    ...parseRemotePhotoUrls(biodata.profilePhotoUrls),
    ...parseApprovedProfilePhotoUrls(biodata[APPROVED_PROFILE_PHOTO_URLS_KEY]),
    ...parseProfilePhotos(biodata[PROFILE_PHOTOS_KEY] ?? ''),
  ];

  return candidates.some((url) => isPersistablePhotoUri(url?.trim() ?? ''));
}

export function mergePersistablePhotoSlotSources(...sources: string[][]): string[] {
  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    for (const source of sources) {
      const url = source[index]?.trim() ?? '';
      if (isPersistablePhotoUri(url)) {
        return url;
      }
    }
    return '';
  });
}

export function mergeRemotePhotoSlotSources(...sources: string[][]): string[] {
  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    for (const source of sources) {
      const url = source[index]?.trim() ?? '';
      if (isRemotePhotoUri(url)) {
        return url;
      }
    }
    return '';
  });
}

export function biodataForFirestore(values: Record<string, string>): Record<string, string> {
  const pipeUrls = (values.profilePhotoUrls ?? '').split('|');
  const localPhotos = parseProfilePhotos(values[PROFILE_PHOTOS_KEY] ?? '');
  const persistSlots = Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    for (const candidate of [pipeUrls[index], localPhotos[index]]) {
      const url = candidate?.trim() ?? '';
      if (isPersistablePhotoUri(url)) {
        return url;
      }
    }
    return '';
  });

  // Keep biodata lean — large data URLs live only on root photoUrls / approvedPhotoUrls.
  const biodataSlots = persistSlots.map((url) => (isRemotePhotoUri(url) ? url : ''));

  return {
    ...values,
    profilePhotoUrls: serializePersistablePhotoUrls(biodataSlots),
    [APPROVED_PROFILE_PHOTO_URLS_KEY]: serializePersistablePhotoUrls(
      parseApprovedProfilePhotoUrls(values[APPROVED_PROFILE_PHOTO_URLS_KEY]).map((url) =>
        isRemotePhotoUri(url) ? url : '',
      ),
    ),
    [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(biodataSlots),
  };
}

export function hasRequiredPhotos(photos: string[], skipped: boolean): boolean {
  return skipped || photos.some((photo) => photo.length > 0);
}
