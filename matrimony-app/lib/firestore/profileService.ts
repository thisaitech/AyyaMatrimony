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
  return {
    ...docData.listing,
    biodata: docData.biodata,
    ownerKey: docData.ownerKey,
    image: docData.primaryPhotoUrl || docData.listing.image,
    interestStatus: 'none',
    phoneNumber: docData.phone,
  };
}

export async function upsertProfileFromValues(
  values: Record<string, string>,
  ownerKey = 'current-user',
  options: { published?: boolean; uploadPhotos?: boolean } = {},
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
      const uploaded = await uploadProfilePhotos(phone, localPhotos);
      const merged = mergeUploadedPhotos(localPhotos, uploaded);
      nextValues = {
        ...nextValues,
        profilePhotoUrls: serializeRemotePhotoUrls(merged),
        [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(merged),
      };
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

  return snapshot.docs.map((entry) => entry.data() as FirestoreProfileDoc);
}

export async function hydrateLocalProfileFromFirestore(phone: string): Promise<Record<string, string> | null> {
  const remote = await fetchProfileByPhone(phone);
  if (!remote) {
    return null;
  }

  const biodata = { ...remote.biodata };
  if (remote.photoUrls.length > 0) {
    biodata.profilePhotoUrls = remote.photoUrls.join('|');
    biodata[PROFILE_PHOTOS_KEY] = serializeProfilePhotos(remote.photoUrls);
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
