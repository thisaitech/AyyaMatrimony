import { doc, setDoc, where } from 'firebase/firestore';
import { getDownloadURL, listAll, ref } from 'firebase/storage';
import { Platform } from 'react-native';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import {
  APPROVED_PROFILE_PHOTO_URLS_KEY,
  isRemotePhotoUri,
  MAX_PROFILE_PHOTOS,
  parseApprovedProfilePhotoUrls,
  parseProfilePhotos,
  PROFILE_PHOTOS_KEY,
  serializeRemotePhotoUrls,
  serializeProfilePhotos,
} from '@/constants/profilePhotos';
import { getFirebaseFirestore, getFirebaseStorage } from '@/lib/firebase';
import {
  FIRESTORE_COLLECTIONS,
  photoApprovalDocId,
  profileDocIdFromPhone,
  type FirestorePhotoApprovalDoc,
  type FirestoreProfileDoc,
} from '@/lib/firestore/collections';
import { createAdminNotification } from '@/lib/firestore/adminNotificationService';
import { getDocResilient, getDocsResilient } from '@/lib/firestore/readHelpers';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export type AdminPhotoApprovalRecord = {
  id: string;
  phone: string;
  memberName: string;
  photoUrl: string;
  slot: number;
  status: FirestorePhotoApprovalDoc['status'];
  submittedAt: string;
};

function toAdminPhotoRecord(entry: FirestorePhotoApprovalDoc): AdminPhotoApprovalRecord {
  return {
    id: entry.photoApprovalId,
    phone: entry.phone,
    memberName: entry.memberName,
    photoUrl: entry.photoUrl,
    slot: entry.slot,
    status: entry.status,
    submittedAt: formatDate(entry.submittedAt),
  };
}

function parsePhotoApprovalDocId(photoApprovalId: string): { phone: string; slot: number } | null {
  const match = /^photo_(\d+)_(\d+)$/.exec(photoApprovalId);
  if (!match) {
    return null;
  }

  const slot = Number(match[2]);
  if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_PROFILE_PHOTOS) {
    return null;
  }

  return { phone: match[1], slot };
}

function profileMemberName(profile: FirestoreProfileDoc, phone: string): string {
  return (
    profile.fullName?.trim() ||
    profile.listing?.name?.trim() ||
    profile.biodata?.fullName?.trim() ||
    `Member ${phone.slice(-4)}`
  );
}

function resolveProfilePhone(profile: FirestoreProfileDoc): string {
  return (
    profile.phone?.replace(/\D/g, '') ||
    profile.biodata?.[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ||
    profile.biodata?.phoneNumber?.replace(/\D/g, '') ||
    profile.listing?.phoneNumber?.replace(/\D/g, '') ||
    ''
  );
}

/** Uploaded cloud photos only — excludes primaryPhotoUrl / approved fallbacks. */
function resolveUploadedPhotoSlots(profile: FirestoreProfileDoc): string[] {
  const biodata = profile.biodata ?? {};
  const fromDoc = Array.isArray(profile.photoUrls) ? profile.photoUrls : [];
  const fromBiodataPhotos = parseProfilePhotos(biodata[PROFILE_PHOTOS_KEY] ?? '');
  const fromPipe = (biodata.profilePhotoUrls ?? '').split('|');

  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    for (const candidate of [fromDoc[index], fromBiodataPhotos[index], fromPipe[index]]) {
      const trimmed = candidate?.trim() ?? '';
      if (isRemotePhotoUri(trimmed)) {
        return trimmed;
      }
    }
    return '';
  });
}

function resolveStrictApprovedPhotoSlots(profile: FirestoreProfileDoc): string[] {
  const biodata = profile.biodata ?? {};
  const fromDoc = Array.isArray(profile.approvedPhotoUrls) ? profile.approvedPhotoUrls : [];
  const fromBiodata = parseApprovedProfilePhotoUrls(biodata[APPROVED_PROFILE_PHOTO_URLS_KEY]);

  return Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => {
    for (const candidate of [fromDoc[index], fromBiodata[index]]) {
      const trimmed = candidate?.trim() ?? '';
      if (isRemotePhotoUri(trimmed)) {
        return trimmed;
      }
    }
    return '';
  });
}

function resolveModerationStatus(
  uploadedUrl: string,
  approvedUrl: string,
): FirestorePhotoApprovalDoc['status'] {
  if (!uploadedUrl.trim() || !isRemotePhotoUri(uploadedUrl)) {
    return 'rejected';
  }
  return approvedUrl.trim() === uploadedUrl.trim() ? 'approved' : 'pending';
}

async function runWithFirestoreRetry(task: () => Promise<void>, attempts = 3): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await getFirebaseFirestore();
      await task();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function listStoragePhotoApprovals(
  profiles: FirestoreProfileDoc[],
): Promise<AdminPhotoApprovalRecord[]> {
  // Firebase Storage listAll is not CORS-safe in the browser — use Firestore only on web.
  if (Platform.OS === 'web') {
    return [];
  }

  const storage = await getFirebaseStorage();
  if (!storage) {
    return [];
  }

  const profileByPhone = new Map<string, FirestoreProfileDoc>();
  for (const profile of profiles) {
    const phone = resolveProfilePhone(profile);
    if (phone) {
      profileByPhone.set(phone, profile);
    }
  }

  const records: AdminPhotoApprovalRecord[] = [];

  try {
    const root = await listAll(ref(storage, 'profiles'));
    await Promise.all(
      root.prefixes.map(async (phonePrefix) => {
        const phone = phonePrefix.name.replace(/\D/g, '');
        if (!phone) {
          return;
        }

        let items;
        try {
          items = await listAll(ref(storage, `profiles/${phonePrefix.name}/photos`));
        } catch {
          return;
        }

        const profile = profileByPhone.get(phone);
        const approvedSlots = profile ? resolveStrictApprovedPhotoSlots(profile) : [];
        const sortTime = profile?.updatedAt ?? profile?.createdAt ?? Date.now();

        await Promise.all(
          items.items.map(async (item) => {
            const slotMatch = /^photo_(\d+)\.jpg$/i.exec(item.name);
            if (!slotMatch) {
              return;
            }

            const slot = Number(slotMatch[1]);
            if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_PROFILE_PHOTOS) {
              return;
            }

            let photoUrl = '';
            try {
              photoUrl = await getDownloadURL(item);
            } catch {
              return;
            }

            if (!isRemotePhotoUri(photoUrl)) {
              return;
            }

            records.push({
              id: photoApprovalDocId(phone, slot),
              phone,
              memberName: profile ? profileMemberName(profile, phone) : `Member ${phone.slice(-4)}`,
              photoUrl,
              slot,
              status: resolveModerationStatus(photoUrl, approvedSlots[slot] ?? ''),
              submittedAt: formatDate(sortTime),
            });
          }),
        );
      }),
    );
  } catch {
    return records;
  }

  return records;
}

function mergePhotoApprovalRecords(
  approvalDocs: FirestorePhotoApprovalDoc[],
  profiles: FirestoreProfileDoc[],
  storageRecords: AdminPhotoApprovalRecord[] = [],
): AdminPhotoApprovalRecord[] {
  const profileByPhone = new Map<string, FirestoreProfileDoc>();
  for (const profile of profiles) {
    const phone = resolveProfilePhone(profile);
    if (phone) {
      profileByPhone.set(phone, profile);
    }
  }

  const records = new Map<string, { record: AdminPhotoApprovalRecord; sortTime: number }>();

  for (const entry of approvalDocs) {
    const phone = entry.phone.replace(/\D/g, '');
    if (!phone) {
      continue;
    }

    const profile = profileByPhone.get(phone);
    const uploadedSlots = profile ? resolveUploadedPhotoSlots(profile) : [];
    const approvedSlots = profile ? resolveStrictApprovedPhotoSlots(profile) : [];
    const slot = entry.slot;
    const photoUrl = entry.photoUrl.trim() || uploadedSlots[slot]?.trim() || '';
    if (!photoUrl) {
      continue;
    }

    const id = entry.photoApprovalId || photoApprovalDocId(phone, slot);
    const profileStatus = resolveModerationStatus(photoUrl, approvedSlots[slot] ?? '');
    const status: FirestorePhotoApprovalDoc['status'] =
      entry.status === 'rejected'
        ? 'rejected'
        : profileStatus === 'pending'
          ? 'pending'
          : entry.status === 'approved' && profileStatus === 'approved'
            ? 'approved'
            : profileStatus;

    records.set(id, {
      record: {
        id,
        phone,
        memberName: entry.memberName?.trim() || (profile ? profileMemberName(profile, phone) : `Member ${phone.slice(-4)}`),
        photoUrl,
        slot,
        status,
        submittedAt: formatDate(entry.submittedAt ?? entry.updatedAt ?? Date.now()),
      },
      sortTime: entry.updatedAt ?? entry.submittedAt ?? 0,
    });
  }

  for (const profile of profiles) {
    if (profile.accountStatus === 'deleted') {
      continue;
    }

    const phone = resolveProfilePhone(profile);
    if (!phone) {
      continue;
    }

    const memberName = profileMemberName(profile, phone);
    const uploadedSlots = resolveUploadedPhotoSlots(profile);
    const approvedSlots = resolveStrictApprovedPhotoSlots(profile);
    const sortTime = profile.updatedAt ?? profile.createdAt ?? 0;

    for (let slot = 0; slot < MAX_PROFILE_PHOTOS; slot++) {
      const photoUrl = uploadedSlots[slot]?.trim() ?? '';
      if (!photoUrl) {
        continue;
      }

      const id = photoApprovalDocId(phone, slot);
      if (records.has(id)) {
        continue;
      }

      const status = resolveModerationStatus(photoUrl, approvedSlots[slot] ?? '');
      records.set(id, {
        record: {
          id,
          phone,
          memberName,
          photoUrl,
          slot,
          status,
          submittedAt: formatDate(sortTime),
        },
        sortTime,
      });
    }
  }

  for (const record of storageRecords) {
    if (!record.photoUrl.trim()) {
      continue;
    }

    const existing = records.get(record.id);
    if (!existing) {
      records.set(record.id, {
        record,
        sortTime: Date.now(),
      });
      continue;
    }

    if (existing.record.status !== 'pending' && record.status === 'pending') {
      records.set(record.id, {
        record: { ...existing.record, status: 'pending', photoUrl: record.photoUrl },
        sortTime: existing.sortTime,
      });
    }
  }

  return Array.from(records.values())
    .sort((left, right) => right.sortTime - left.sortTime)
    .map(({ record }) => record);
}

export async function queueUploadedPhotosForApproval(
  phone: string,
  photos: string[],
  options: { memberName?: string; autoApprove?: boolean } = {},
): Promise<void> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return;
  }

  await Promise.allSettled(
    photos.map((photoUrl, slot) => {
      if (!isRemotePhotoUri(photoUrl)) {
        return Promise.resolve();
      }
      return submitPhotoForApproval(digits, {
        memberName: options.memberName,
        photoUrl,
        slot,
        autoApprove: options.autoApprove,
      });
    }),
  );
}

export async function submitPhotoForApproval(
  phone: string,
  options: {
    memberName?: string;
    photoUrl: string;
    slot: number;
    autoApprove?: boolean;
  },
): Promise<void> {
  const digits = phone.replace(/\D/g, '');
  if (!digits || !options.photoUrl.trim()) {
    return;
  }

  const photoApprovalId = photoApprovalDocId(digits, options.slot);
  const profileId = profileDocIdFromPhone(digits);
  const now = Date.now();
  const status = options.autoApprove ? 'approved' : 'pending';

  const payload: FirestorePhotoApprovalDoc = {
    photoApprovalId,
    phone: digits,
    memberName: options.memberName?.trim() || `Member ${digits.slice(-4)}`,
    profileId: profileId || '',
    photoUrl: options.photoUrl.trim(),
    slot: options.slot,
    status,
    submittedAt: now,
    updatedAt: now,
    reviewedBy: options.autoApprove ? 'admin' : undefined,
  };

  await runWithFirestoreRetry(async () => {
    const db = await getFirebaseFirestore();
    if (!db) {
      throw new Error('Firestore unavailable');
    }

    await setDoc(doc(db, FIRESTORE_COLLECTIONS.photoApprovals, photoApprovalId), payload, {
      merge: true,
    });
  });

  if (profileId) {
    const db = await getFirebaseFirestore();
    if (!db) {
      return;
    }

    const profileRef = doc(db, FIRESTORE_COLLECTIONS.profiles, profileId);
    const profileSnap = await getDocResilient(profileRef);
    const profile = profileSnap?.exists() ? (profileSnap.data() as FirestoreProfileDoc) : null;
    const photoUrls = Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => profile?.photoUrls?.[index] ?? '');
    photoUrls[options.slot] = options.photoUrl.trim();
    const approvedPhotoUrls = Array.from(
      { length: MAX_PROFILE_PHOTOS },
      (_, index) => profile?.approvedPhotoUrls?.[index] ?? '',
    );
    if (status === 'approved') {
      approvedPhotoUrls[options.slot] = options.photoUrl.trim();
    } else {
      approvedPhotoUrls[options.slot] = '';
    }

    const biodata = {
      ...(profile?.biodata ?? {}),
      [CONTACT_PHONE_KEY]: digits,
      profilePhotoUrls: serializeRemotePhotoUrls(photoUrls),
      [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(photoUrls),
    };

    await runWithFirestoreRetry(async () => {
      const db = await getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore unavailable');
      }

      await setDoc(
        profileRef,
        {
          profileId,
          phone: digits,
          photoUrls,
          approvedPhotoUrls,
          biodata,
          primaryPhotoUrl: approvedPhotoUrls.find(Boolean) || profile?.primaryPhotoUrl || '',
          ...(status === 'approved'
            ? { 'listing.image': approvedPhotoUrls.find(Boolean) || '' }
            : {}),
          updatedAt: now,
          ...(profile ? {} : { createdAt: now, published: true, approvalStatus: 'pending', accountStatus: 'active' }),
        },
        { merge: true },
      );
    });
  }

  if (!options.autoApprove) {
    void createAdminNotification({
      title: 'Photo pending review',
      body: `${payload.memberName} uploaded a photo for moderation.`,
      type: 'photo',
      relatedPhone: digits,
    }).catch(() => undefined);
  }
}

export async function listPhotoApprovalsForPhone(
  phone: string,
  profile?: FirestoreProfileDoc | null,
): Promise<AdminPhotoApprovalRecord[]> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return [];
  }

  const db = await getFirebaseFirestore();
  if (!db) {
    return [];
  }

  const [approvalDocs, resolvedProfile] = await Promise.all([
    getDocsResilient<FirestorePhotoApprovalDoc>(db, FIRESTORE_COLLECTIONS.photoApprovals, {
      constraints: [where('phone', '==', digits)],
      preferServer: true,
    }),
    profile
      ? Promise.resolve(profile)
      : getDocResilient(doc(db, FIRESTORE_COLLECTIONS.profiles, profileDocIdFromPhone(digits))).then(
          (snapshot) => (snapshot?.exists() ? (snapshot.data() as FirestoreProfileDoc) : null),
        ),
  ]);

  const profiles =
    resolvedProfile && resolvedProfile.accountStatus !== 'deleted' ? [resolvedProfile] : [];
  const storageRecords = await listStoragePhotoApprovals(profiles);
  return mergePhotoApprovalRecords(approvalDocs, profiles, storageRecords);
}

export async function listPhotoApprovals(
  status?: FirestorePhotoApprovalDoc['status'],
): Promise<AdminPhotoApprovalRecord[]> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return [];
  }

  const [approvalDocs, profiles] = await Promise.all([
    getDocsResilient<FirestorePhotoApprovalDoc>(db, FIRESTORE_COLLECTIONS.photoApprovals, {
      orderByField: 'updatedAt',
      preferServer: true,
    }),
    getDocsResilient<FirestoreProfileDoc>(db, FIRESTORE_COLLECTIONS.profiles, {
      orderByField: 'updatedAt',
      preferServer: true,
    }).then((entries) => entries.filter((profile) => profile.accountStatus !== 'deleted')),
  ]);

  const storageRecords = await listStoragePhotoApprovals(profiles);
  const merged = mergePhotoApprovalRecords(approvalDocs, profiles, storageRecords);
  return status ? merged.filter((entry) => entry.status === status) : merged;
}

export async function updatePhotoApprovalStatus(
  photoApprovalId: string,
  status: 'approved' | 'rejected',
  options: { reviewedBy?: string; rejectReason?: string } = {},
): Promise<void> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return;
  }

  const docRef = doc(db, FIRESTORE_COLLECTIONS.photoApprovals, photoApprovalId);
  const existing = await getDocResilient(docRef);
  const now = Date.now();
  let current: FirestorePhotoApprovalDoc;

  if (!existing?.exists()) {
    const parsed = parsePhotoApprovalDocId(photoApprovalId);
    if (!parsed) {
      return;
    }

    const profileId = profileDocIdFromPhone(parsed.phone);
    if (!profileId) {
      return;
    }

    const profileSnapshot = await getDocResilient(doc(db, FIRESTORE_COLLECTIONS.profiles, profileId));
    if (!profileSnapshot?.exists()) {
      return;
    }

    const profile = profileSnapshot.data() as FirestoreProfileDoc;
    const photoUrl = resolveUploadedPhotoSlots(profile)[parsed.slot]?.trim() ?? '';
    if (!isRemotePhotoUri(photoUrl)) {
      return;
    }

    current = {
      photoApprovalId,
      phone: parsed.phone,
      memberName: profileMemberName(profile, parsed.phone),
      profileId,
      photoUrl,
      slot: parsed.slot,
      status: 'pending',
      submittedAt: profile.updatedAt ?? profile.createdAt ?? now,
      updatedAt: now,
    };
  } else {
    current = existing.data() as FirestorePhotoApprovalDoc;
  }

  await setDoc(
    docRef,
    {
      ...current,
      status,
      updatedAt: now,
      reviewedBy: options.reviewedBy ?? 'admin',
      rejectReason: status === 'rejected' ? options.rejectReason : undefined,
    } satisfies FirestorePhotoApprovalDoc,
    { merge: true },
  );

  const profileId = current.profileId || profileDocIdFromPhone(current.phone);
  if (profileId) {
    const profileRef = doc(db, FIRESTORE_COLLECTIONS.profiles, profileId);
    const profileSnap = await getDocResilient(profileRef);
    if (profileSnap?.exists()) {
      const profile = profileSnap.data() as FirestoreProfileDoc;
      const approvedPhotoUrls = [...(profile.approvedPhotoUrls ?? profile.photoUrls ?? [])];
      if (status === 'approved') {
        approvedPhotoUrls[current.slot] = current.photoUrl;
      } else {
        approvedPhotoUrls[current.slot] = '';
        const photoUrls = [...(profile.photoUrls ?? [])];
        photoUrls[current.slot] = '';
        await setDoc(profileRef, { photoUrls, updatedAt: now }, { merge: true });
      }

      await setDoc(
        profileRef,
        {
          approvedPhotoUrls,
          primaryPhotoUrl: approvedPhotoUrls.find(Boolean) || profile.primaryPhotoUrl || '',
          'listing.image': approvedPhotoUrls.find(Boolean) || '',
          updatedAt: now,
        },
        { merge: true },
      );
    }
  }
}

export async function countPendingPhotos(): Promise<number> {
  const entries = await listPhotoApprovals('pending');
  return entries.length;
}

export function isPhotoApprovedForProfile(
  profile: FirestoreProfileDoc | Record<string, string>,
  photoUrl: string,
): boolean {
  if (!photoUrl.trim()) {
    return false;
  }

  const approved = 'approvedPhotoUrls' in profile ? profile.approvedPhotoUrls : undefined;
  if (Array.isArray(approved) && approved.includes(photoUrl)) {
    return true;
  }

  if ('photoUrls' in profile && !('approvedPhotoUrls' in profile)) {
    return Boolean(photoUrl.trim());
  }

  return false;
}
