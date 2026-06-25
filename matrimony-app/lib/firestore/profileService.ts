import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { CONTACT_PHONE_KEY, PHONE_DIGIT_LENGTH } from '@/constants/contactDetails';
import { hasCompletedProfile, prepareProfileForPublish } from '@/constants/profileCompletion';
import type { PublishedMember } from '@/constants/memberDirectory';
import type { MatchGender } from '@/constants/matchFilters';
import { getFirebaseFirestore } from '@/lib/firebase';
import { fetchUserApprovalStatus, submitLoginApproval } from '@/lib/firestore/approvalService';
import { resolveRegistrationNumber } from '@/lib/firestore/registrationNumberService';
import { getDocResilient, getDocsResilient, isNetworkOnline } from '@/lib/firestore/readHelpers';
import {
  FIRESTORE_COLLECTIONS,
  type FirestoreProfileDoc,
  photoApprovalDocId,
  profileDocIdFromPhone,
} from '@/lib/firestore/collections';
import { uploadProfilePhotos, shouldAttemptCloudPhotoUpload } from '@/lib/firestore/storageService';
import {
  listPhotoApprovals,
  listPhotoApprovalsForPhone,
  queueUploadedPhotosForApproval,
  submitPhotoForApproval,
} from '@/lib/firestore/photoApprovalService';
import {
  biodataForFirestore,
  isLocalPhotoUri,
  isRemotePhotoUri,
  MAX_PROFILE_PHOTOS,
  mergeDraftProfilePhotos,
  mergeUploadedPhotos,
  mergeProfilePhotosIntoBiodata,
  parseApprovedProfilePhotoUrls,
  parseProfilePhotos,
  parseRemotePhotoUrls,
  PROFILE_PHOTOS_DRAFT_KEY,
  PROFILE_PHOTOS_KEY,
  resolveDisplayPhotoUri,
  resolvePortableListingPhotoUri,
  resolveProfilePhotoSlots,
  serializeProfilePhotos,
  serializeRemotePhotoUrls,
} from '@/constants/profilePhotos';

export function resolveProfilePhoneForStorage(
  values: Record<string, string>,
  ownerKey = '',
): Record<string, string> {
  const existing =
    values[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ||
    values.phoneNumber?.replace(/\D/g, '') ||
    '';
  if (existing.length === PHONE_DIGIT_LENGTH) {
    return values;
  }

  if (!ownerKey.startsWith('admin-')) {
    return values;
  }

  const registrationDigits = values.registrationNumber?.replace(/\D/g, '') ?? '';
  const synthetic =
    registrationDigits.length > 0
      ? `7${registrationDigits.padStart(9, '0').slice(-9)}`
      : `7${Date.now().toString().slice(-9)}`;

  return {
    ...values,
    [CONTACT_PHONE_KEY]: synthetic,
    phoneNumber: synthetic,
  };
}

function listingIdFromValues(values: Record<string, string>): string {
  const registration = values.registrationNumber?.trim();
  if (registration) {
    return registration.replace(/\s+/g, '-').toLowerCase();
  }
  const phone = values[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? values.phoneNumber?.replace(/\D/g, '');
  return phone ? `phone_${phone}` : `member-${Date.now()}`;
}

function resolveListingPhotos(values: Record<string, string>): string[] {
  const remotePhotos = parseRemotePhotoUrls(values.profilePhotoUrls);
  const localPhotos = parseProfilePhotos(values[PROFILE_PHOTOS_KEY] ?? '');

  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    const remote = remotePhotos[index] ?? '';
    const local = localPhotos[index] ?? '';
    if (isRemotePhotoUri(remote)) {
      return remote;
    }
    if (isRemotePhotoUri(local)) {
      return local;
    }
    return local;
  });
}

function resolveApprovedListingPhotos(values: Record<string, string>): string[] {
  return parseApprovedProfilePhotoUrls(values[APPROVED_PROFILE_PHOTO_URLS_KEY]);
}

function buildListingFromValues(
  values: Record<string, string>,
  id: string,
  options: { adminRegistration?: boolean } = {},
) {
  const mergedPhotos = options.adminRegistration
    ? resolveListingPhotos(values)
    : resolveApprovedListingPhotos(values);
  const image = resolvePortableListingPhotoUri(mergedPhotos);
  const heightLabel = values.height ? values.height.replace('ft', "'") : '';
  const ageYear = values.dateOfBirth?.match(/(\d{4})/)?.[1];
  const age = ageYear
    ? `${new Date().getFullYear() - Number(ageYear)} Years${heightLabel ? `, ${heightLabel}` : ''}`
    : '—';

  return {
    id,
    name: values.fullName?.trim() || 'Member',
    age,
    community: values.caste?.trim() || values.registrationCommunity || '—',
    location: values.nativePlace?.trim() || values.irupidam?.trim() || 'Tamil Nadu',
    image,
    gender: (values.gender as MatchGender) || 'male',
    phoneNumber: values[CONTACT_PHONE_KEY]?.trim() || values.phoneNumber?.trim() || '—',
    verified: true,
  };
}

function profileDocFromValues(
  values: Record<string, string>,
  ownerKey: string,
  published: boolean,
): FirestoreProfileDoc | null {
  const phone = values[CONTACT_PHONE_KEY]?.replace(/\D/g, '') || values.phoneNumber?.replace(/\D/g, '') || '';
  if (!phone) {
    return null;
  }

  const profileId = profileDocIdFromPhone(phone) || listingIdFromValues(values);
  const mergedPhotos = resolveListingPhotos(values);
  const isAdminRegistration = ownerKey.startsWith('admin-');
  const slotPhotoUrls = resolveProfilePhotoSlots(
    {
      photoUrls: mergedPhotos,
      primaryPhotoUrl: mergedPhotos.find(isRemotePhotoUri) ?? '',
      biodata: values,
    },
    mergedPhotos,
  );
  const now = Date.now();

  const listing = buildListingFromValues(
    {
      ...values,
      profilePhotoUrls: serializeRemotePhotoUrls(slotPhotoUrls),
      [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(slotPhotoUrls),
    },
    listingIdFromValues(values),
    { adminRegistration: isAdminRegistration },
  );
  const resolvedGender =
    values.gender === 'male' || values.gender === 'female' ? values.gender : listing.gender;

  return {
    profileId,
    phone,
    ownerKey,
    biodata: {
      ...biodataForFirestore(values),
      gender: resolvedGender,
      memberListingId: listingIdFromValues(values),
    },
    photoUrls: slotPhotoUrls,
    primaryPhotoUrl: slotPhotoUrls.find(Boolean) ?? '',
    registrationCommunity: values.registrationCommunity?.trim() ?? '',
    gender: resolvedGender,
    fullName: values.fullName?.trim() ?? '',
    published,
    listing,
    createdAt: now,
    updatedAt: now,
  };
}

export function publishedMemberFromProfileDoc(docData: FirestoreProfileDoc): PublishedMember {
  const approvedImage = docData.approvedPhotoUrls?.find((url) => Boolean(url?.trim())) ?? '';
  const listing = docData.listing;
  const rawImage =
    approvedImage ||
    (docData.registrationSource === 'admin' || docData.ownerKey?.startsWith('admin-')
      ? docData.primaryPhotoUrl || listing?.image || ''
      : '');
  const image = resolveDisplayPhotoUri(rawImage, Platform.OS === 'web' ? 'web' : 'native');

  return {
    id: listing?.id ?? docData.profileId,
    name: listing?.name ?? docData.fullName ?? 'Member',
    age: listing?.age ?? '—',
    community: listing?.community ?? docData.registrationCommunity ?? '—',
    location: listing?.location ?? 'Tamil Nadu',
    gender: listing?.gender ?? docData.gender ?? 'male',
    phoneNumber: listing?.phoneNumber ?? docData.phone ?? '—',
    verified: listing?.verified ?? true,
    biodata: docData.biodata ?? {},
    ownerKey: docData.ownerKey,
    image,
    interestStatus: 'none',
  };
}

export async function upsertProfileFromValues(
  values: Record<string, string>,
  ownerKey = 'current-user',
  options: { published?: boolean; uploadPhotos?: boolean; autoApprovePhotos?: boolean } = {},
): Promise<FirestoreProfileDoc | null> {
  const preparedValues = resolveProfilePhoneForStorage(
    prepareProfileForPublish(values),
    ownerKey,
  );
  if (!hasCompletedProfile(preparedValues)) {
    return null;
  }

  const db = await getFirebaseFirestore();
  if (!db) {
    return null;
  }

  const phone =
    preparedValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ||
    preparedValues.phoneNumber?.replace(/\D/g, '') ||
    '';
  if (!phone) {
    return null;
  }

  let nextValues = { ...preparedValues };
  const registrationNumber = await resolveRegistrationNumber({
    religion: preparedValues.religion ?? preparedValues.registrationCommunity ?? '',
    rasi: preparedValues.rasi,
    natchathiram: preparedValues.natchathiram,
    existingNumber: preparedValues.registrationNumber,
  }).catch(() => preparedValues.registrationNumber ?? '');
  if (registrationNumber) {
    nextValues = { ...nextValues, registrationNumber };
  }
  let uploadedSlots: string[] = [];
  if (options.uploadPhotos !== false) {
    const localPhotos = mergeDraftProfilePhotos(
      preparedValues[PROFILE_PHOTOS_DRAFT_KEY] ?? '',
      preparedValues[PROFILE_PHOTOS_KEY] ?? '',
    );
    const needsUpload =
      shouldAttemptCloudPhotoUpload() && localPhotos.some((uri) => isLocalPhotoUri(uri));
    if (needsUpload) {
      try {
        const uploaded = await uploadProfilePhotos(phone, localPhotos);
        const merged = mergeUploadedPhotos(localPhotos, uploaded);
        uploadedSlots = merged;
        nextValues = {
          ...nextValues,
          profilePhotoUrls: serializeRemotePhotoUrls(merged),
          [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(merged),
          [PROFILE_PHOTOS_DRAFT_KEY]: '',
        };
      } catch {
        // Keep local photo URIs so profile save still succeeds; admin can approve later.
        nextValues = {
          ...nextValues,
          [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(localPhotos),
        };
        uploadedSlots = localPhotos;
      }
    } else {
      uploadedSlots = localPhotos;
    }
  }

  const profileId = profileDocIdFromPhone(phone);
  const docRef = doc(db, FIRESTORE_COLLECTIONS.profiles, profileId);
  const existing = await getDocResilient(docRef);
  const payload = profileDocFromValues(nextValues, ownerKey, options.published ?? true);
  if (!payload) {
    return null;
  }

  const merged: FirestoreProfileDoc = {
    ...payload,
    registrationSource: ownerKey.startsWith('admin-') ? 'admin' : 'self',
    approvalStatus: ownerKey.startsWith('admin-')
      ? 'approved'
      : existing?.exists()
        ? (existing.data() as FirestoreProfileDoc).approvalStatus ?? 'pending'
        : 'pending',
    browseHidden: ownerKey.startsWith('admin-')
      ? false
      : existing?.exists()
        ? (existing.data() as FirestoreProfileDoc).browseHidden ?? false
        : false,
    accountStatus: existing?.exists()
      ? (existing.data() as FirestoreProfileDoc).accountStatus ?? 'active'
      : 'active',
    createdAt: existing?.exists() ? (existing.data() as FirestoreProfileDoc).createdAt : payload.createdAt,
    updatedAt: Date.now(),
  };

  await setDoc(docRef, merged, { merge: true });

  if (options.uploadPhotos !== false) {
    const slots = resolveProfilePhotoSlots(merged, uploadedSlots);
    const previousSlots = existing?.exists()
      ? resolveProfilePhotoSlots(existing.data() as FirestoreProfileDoc)
      : [];

    const remoteSlots = slots.filter(isRemotePhotoUri);
    if (remoteSlots.length > 0) {
      await queueUploadedPhotosForApproval(phone, slots, {
        memberName: preparedValues.fullName,
        autoApprove: options.autoApprovePhotos ?? ownerKey.startsWith('admin-'),
      }).catch(() => undefined);
    }

    await Promise.all(
      slots.map(async (photoUrl, slot) => {
        if (!isRemotePhotoUri(photoUrl)) {
          return;
        }

        const approvalId = photoApprovalDocId(phone, slot);
        const approvalRef = doc(db, FIRESTORE_COLLECTIONS.photoApprovals, approvalId);
        const existingApproval = await getDocResilient(approvalRef);
        const photoChanged = photoUrl !== previousSlots[slot];

        if (!photoChanged && existingApproval?.exists()) {
          return;
        }

        return submitPhotoForApproval(phone, {
          memberName: preparedValues.fullName,
          photoUrl,
          slot,
          autoApprove: options.autoApprovePhotos ?? ownerKey.startsWith('admin-'),
        });
      }),
    );
  }

  if (!ownerKey.startsWith('admin-')) {
    await submitLoginApproval(phone, {
      name: merged.fullName || preparedValues.fullName?.trim(),
      profileId: merged.profileId,
      registrationCommunity: merged.registrationCommunity,
      source: 'profile',
    }).catch(() => undefined);
  }

  return merged;
}

export async function fetchProfileByPhone(phone: string): Promise<FirestoreProfileDoc | null> {
  const db = await getFirebaseFirestore();
  const profileId = profileDocIdFromPhone(phone);
  if (!db || !profileId) {
    return null;
  }

  try {
    const snapshot = await getDocResilient(doc(db, FIRESTORE_COLLECTIONS.profiles, profileId));
    if (!snapshot?.exists()) {
      return null;
    }

    return snapshot.data() as FirestoreProfileDoc;
  } catch {
    return null;
  }
}

export function isBrowsablePublishedProfile(profile: FirestoreProfileDoc): boolean {
  const isAdminProfile =
    profile.registrationSource === 'admin' || profile.ownerKey?.startsWith('admin-');

  return (
    profile.published === true &&
    profile.browseHidden !== true &&
    profile.accountStatus !== 'blocked' &&
    profile.accountStatus !== 'deleted' &&
    (profile.approvalStatus === 'approved' || isAdminProfile)
  );
}

export async function listPublishedProfiles(): Promise<FirestoreProfileDoc[]> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return [];
  }

  const profilesRef = collection(db, FIRESTORE_COLLECTIONS.profiles);

  try {
    const publishedQuery = query(profilesRef, where('published', '==', true));
    const snapshot = isNetworkOnline()
      ? await getDocsFromServer(publishedQuery).catch(() => getDocs(publishedQuery))
      : await getDocs(publishedQuery);
    const filtered = snapshot.docs
      .map((entry) => entry.data() as FirestoreProfileDoc)
      .filter(isBrowsablePublishedProfile);
    if (filtered.length > 0) {
      return filtered;
    }
  } catch {
    // Fall through to full collection read.
  }

  const allProfiles = await getDocsResilient<FirestoreProfileDoc>(db, FIRESTORE_COLLECTIONS.profiles, {
    preferServer: true,
  });

  return allProfiles.filter(isBrowsablePublishedProfile);
}

export async function setProfileBrowseHidden(phone: string, browseHidden: boolean): Promise<void> {
  const db = await getFirebaseFirestore();
  const profileId = profileDocIdFromPhone(phone);
  if (!db || !profileId) {
    return;
  }

  await setDoc(
    doc(db, FIRESTORE_COLLECTIONS.profiles, profileId),
    { browseHidden, updatedAt: Date.now() },
    { merge: true },
  );
}

export async function listAllProfiles(): Promise<FirestoreProfileDoc[]> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return [];
  }

  const profiles = await getDocsResilient<FirestoreProfileDoc>(
    db,
    FIRESTORE_COLLECTIONS.profiles,
    { orderByField: 'updatedAt' },
  );

  return profiles.filter((profile) => profile.accountStatus !== 'deleted');
}

export async function updateProfileAccountStatus(
  phone: string,
  accountStatus: FirestoreProfileDoc['accountStatus'],
): Promise<void> {
  const db = await getFirebaseFirestore();
  const profileId = profileDocIdFromPhone(phone);
  if (!db || !profileId) {
    return;
  }

  await setDoc(
    doc(db, FIRESTORE_COLLECTIONS.profiles, profileId),
    { accountStatus, updatedAt: Date.now() },
    { merge: true },
  );
}

export async function deleteProfileByPhone(phone: string): Promise<void> {
  await updateProfileAccountStatus(phone, 'deleted');
}

export async function blockProfileByPhone(phone: string): Promise<void> {
  await updateProfileAccountStatus(phone, 'blocked');
}

export async function unblockProfileByPhone(phone: string): Promise<void> {
  await updateProfileAccountStatus(phone, 'active');
}

export async function hydrateLocalProfileFromFirestore(phone: string): Promise<Record<string, string> | null> {
  const remote = await fetchProfileByPhone(phone);
  if (!remote) {
    return null;
  }

  const approvalPhotoSlots = await fetchPhotoSlotsFromApprovals(phone, remote);
  const approvedPhotoSlots = await fetchApprovedPhotoSlotsFromApprovals(phone, remote);
  let biodata = mergeProfilePhotosIntoBiodata(
    { ...(remote.biodata ?? {}) },
    remote,
    approvalPhotoSlots,
    approvedPhotoSlots,
  );

  const approvalStatus = await fetchUserApprovalStatus(phone).catch(() => remote.approvalStatus ?? null);
  if (approvalStatus) {
    biodata.approvalStatus = approvalStatus;
  } else if (remote.approvalStatus) {
    biodata.approvalStatus = remote.approvalStatus;
  }

  if (!biodata.gender) {
    biodata.gender = remote.gender || remote.listing?.gender || '';
  }

  if (!biodata.registrationCommunity?.trim() && remote.registrationCommunity?.trim()) {
    biodata.registrationCommunity = remote.registrationCommunity;
  }

  if (!biodata.memberListingId?.trim()) {
    biodata.memberListingId = remote.biodata?.memberListingId || remote.listing?.id || remote.profileId || '';
  }

  if (!biodata[CONTACT_PHONE_KEY]?.trim()) {
    biodata[CONTACT_PHONE_KEY] = remote.phone;
  }

  if (!biodata.phoneNumber?.trim()) {
    biodata.phoneNumber = remote.phone;
  }

  biodata._profileUpdatedAt = String(remote.updatedAt ?? Date.now());

  return biodata;
}

async function fetchApprovedPhotoSlotsFromApprovals(
  phone: string,
  profile?: FirestoreProfileDoc | null,
): Promise<string[]> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return [];
  }

  try {
    const approvals = await listPhotoApprovalsForPhone(digits, profile);
    const slots = Array.from({ length: MAX_PROFILE_PHOTOS }, () => '');
    for (const entry of approvals) {
      if (entry.status !== 'approved' || !entry.photoUrl.trim()) {
        continue;
      }
      if (entry.slot >= 0 && entry.slot < MAX_PROFILE_PHOTOS) {
        slots[entry.slot] = entry.photoUrl.trim();
      }
    }
    return slots;
  } catch {
    return [];
  }
}

async function fetchPhotoSlotsFromApprovals(
  phone: string,
  profile?: FirestoreProfileDoc | null,
): Promise<string[]> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return [];
  }

  try {
    const approvals = await listPhotoApprovalsForPhone(digits, profile);
    const slots = Array.from({ length: MAX_PROFILE_PHOTOS }, () => '');
    for (const entry of approvals) {
      if (entry.status === 'rejected' || !entry.photoUrl.trim()) {
        continue;
      }
      if (entry.slot >= 0 && entry.slot < MAX_PROFILE_PHOTOS) {
        slots[entry.slot] = entry.photoUrl.trim();
      }
    }
    return slots;
  } catch {
    return [];
  }
}

export async function buildPhotoApprovalSlotsByPhone(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();

  try {
    const approvals = await listPhotoApprovals();
    for (const entry of approvals) {
      if (entry.status === 'rejected' || !entry.photoUrl.trim()) {
        continue;
      }
      const phone = entry.phone.replace(/\D/g, '');
      if (!phone || entry.slot < 0 || entry.slot >= MAX_PROFILE_PHOTOS) {
        continue;
      }
      const slots =
        map.get(phone) ?? Array.from({ length: MAX_PROFILE_PHOTOS }, () => '');
      slots[entry.slot] = entry.photoUrl.trim();
      map.set(phone, slots);
    }
  } catch {
    return map;
  }

  return map;
}
