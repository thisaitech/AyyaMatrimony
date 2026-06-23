import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { hasCompletedProfile } from '@/constants/profileCompletion';
import type { PublishedMember } from '@/constants/memberDirectory';
import type { MatchGender } from '@/constants/matchFilters';
import { getFirebaseFirestore } from '@/lib/firebase';
import { fetchUserApprovalStatus } from '@/lib/firestore/approvalService';
import {
  FIRESTORE_COLLECTIONS,
  type FirestoreProfileDoc,
  profileDocIdFromPhone,
} from '@/lib/firestore/collections';
import { uploadProfilePhotos } from '@/lib/firestore/storageService';
import { submitPhotoForApproval } from '@/lib/firestore/photoApprovalService';
import { parseProfilePhotos, PROFILE_PHOTOS_KEY, serializeProfilePhotos, biodataForFirestore, isRemotePhotoUri, isLocalPhotoUri, mergeUploadedPhotos, serializeRemotePhotoUrls, MAX_PROFILE_PHOTOS } from '@/constants/profilePhotos';

function listingIdFromValues(values: Record<string, string>): string {
  const registration = values.registrationNumber?.trim();
  if (registration) {
    return registration.replace(/\s+/g, '-').toLowerCase();
  }
  const phone = values[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? values.phoneNumber?.replace(/\D/g, '');
  return phone ? `phone_${phone}` : `member-${Date.now()}`;
}

function resolveListingPhotos(values: Record<string, string>): string[] {
  const remotePhotos = values.profilePhotoUrls?.split('|').filter(Boolean) ?? [];
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

function buildListingFromValues(values: Record<string, string>, id: string) {
  const mergedPhotos = resolveListingPhotos(values);
  const image = mergedPhotos.find((photo) => isRemotePhotoUri(photo)) ?? mergedPhotos.find(Boolean) ?? '';
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
  const now = Date.now();

  const listing = buildListingFromValues(
    {
      ...values,
      profilePhotoUrls: serializeRemotePhotoUrls(mergedPhotos),
      [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(mergedPhotos),
    },
    listingIdFromValues(values),
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
    photoUrls: mergedPhotos.filter(isRemotePhotoUri),
    primaryPhotoUrl: mergedPhotos.find(isRemotePhotoUri) ?? '',
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
  const image =
    approvedImage ||
    (docData.registrationSource === 'admin'
      ? docData.primaryPhotoUrl || listing?.image || ''
      : '');

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
  if (!hasCompletedProfile(values)) {
    return null;
  }

  const db = await getFirebaseFirestore();
  if (!db) {
    return null;
  }

  const phone = values[CONTACT_PHONE_KEY]?.replace(/\D/g, '') || values.phoneNumber?.replace(/\D/g, '') || '';
  if (!phone) {
    return null;
  }

  let nextValues = { ...values };
  if (options.uploadPhotos !== false) {
    const localPhotos = parseProfilePhotos(values[PROFILE_PHOTOS_KEY] ?? '');
    const needsUpload = localPhotos.some((uri) => isLocalPhotoUri(uri));
    if (needsUpload) {
      try {
        const uploaded = await uploadProfilePhotos(phone, localPhotos);
        const merged = mergeUploadedPhotos(localPhotos, uploaded);
        nextValues = {
          ...nextValues,
          profilePhotoUrls: serializeRemotePhotoUrls(merged),
          [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(merged),
        };

        await Promise.all(
          merged.map((photoUrl, slot) => {
            if (!isRemotePhotoUri(photoUrl)) {
              return Promise.resolve();
            }
            return submitPhotoForApproval(phone, {
              memberName: values.fullName,
              photoUrl,
              slot,
              autoApprove: options.autoApprovePhotos ?? ownerKey.startsWith('admin-'),
            });
          }),
        );
      } catch {
        // Keep local photo URIs so profile save still succeeds; admin can approve later.
        nextValues = {
          ...nextValues,
          [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(localPhotos),
        };
      }
    }
  }

  const profileId = profileDocIdFromPhone(phone);
  const docRef = doc(db, FIRESTORE_COLLECTIONS.profiles, profileId);
  const existing = await getDoc(docRef);
  const payload = profileDocFromValues(nextValues, ownerKey, options.published ?? true);
  if (!payload) {
    return null;
  }

  const merged: FirestoreProfileDoc = {
    ...payload,
    registrationSource: ownerKey.startsWith('admin-') ? 'admin' : 'self',
    approvalStatus: ownerKey.startsWith('admin-')
      ? 'approved'
      : existing.exists()
        ? (existing.data() as FirestoreProfileDoc).approvalStatus ?? 'pending'
        : 'pending',
    accountStatus: existing.exists()
      ? (existing.data() as FirestoreProfileDoc).accountStatus ?? 'active'
      : 'active',
    createdAt: existing.exists() ? (existing.data() as FirestoreProfileDoc).createdAt : payload.createdAt,
    updatedAt: Date.now(),
  };

  await setDoc(docRef, merged, { merge: true });
  return merged;
}

export async function fetchProfileByPhone(phone: string): Promise<FirestoreProfileDoc | null> {
  const db = await getFirebaseFirestore();
  const profileId = profileDocIdFromPhone(phone);
  if (!db || !profileId) {
    return null;
  }

  const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTIONS.profiles, profileId));
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as FirestoreProfileDoc;
}

export async function listPublishedProfiles(): Promise<FirestoreProfileDoc[]> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return [];
  }

  const snapshot = await getDocs(
    query(collection(db, FIRESTORE_COLLECTIONS.profiles), where('published', '==', true)),
  );

  return snapshot.docs
    .map((entry) => entry.data() as FirestoreProfileDoc)
    .filter(
      (profile) =>
        profile.browseHidden !== true &&
        profile.accountStatus !== 'blocked' &&
        profile.accountStatus !== 'deleted' &&
        profile.approvalStatus === 'approved',
    );
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

  const snapshot = await getDocs(collection(db, FIRESTORE_COLLECTIONS.profiles));
  return snapshot.docs
    .map((entry) => entry.data() as FirestoreProfileDoc)
    .filter((profile) => profile.accountStatus !== 'deleted');
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

  const biodata = { ...(remote.biodata ?? {}) };
  const photoUrls = Array.isArray(remote.photoUrls) ? remote.photoUrls : [];
  if (photoUrls.length > 0) {
    biodata.profilePhotoUrls = photoUrls.join('|');
    biodata[PROFILE_PHOTOS_KEY] = serializeProfilePhotos(photoUrls);
  }

  const approvalStatus = await fetchUserApprovalStatus(phone).catch(() => remote.approvalStatus ?? null);
  if (approvalStatus) {
    biodata.approvalStatus = approvalStatus;
  } else if (remote.approvalStatus) {
    biodata.approvalStatus = remote.approvalStatus;
  }

  if (!biodata.gender) {
    biodata.gender = remote.gender || remote.listing?.gender || '';
  }

  return biodata;
}
