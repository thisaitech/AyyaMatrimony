import { doc, setDoc } from 'firebase/firestore';
import { createAdminNotification } from '@/lib/firestore/adminNotificationService';
import type { AdminApprovalRecord } from '@/constants/adminMockData';
import { isAdminPhone } from '@/constants/admin';
import { getFirebaseFirestore } from '@/lib/firebase';
import { getDocResilient, getDocsResilient } from '@/lib/firestore/readHelpers';
import {
  approvalDocIdFromPhone,
  FIRESTORE_COLLECTIONS,
  profileDocIdFromPhone,
  type FirestoreApprovalDoc,
  type FirestoreProfileDoc,
} from '@/lib/firestore/collections';

function formatApprovalDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toAdminApprovalRecord(entry: FirestoreApprovalDoc): AdminApprovalRecord {
  return {
    id: entry.approvalId,
    name: entry.name,
    phone: entry.phone,
    submittedAt: formatApprovalDate(entry.submittedAt),
    status: entry.status,
  };
}

export async function submitLoginApproval(
  phone: string,
  options: {
    name?: string;
    profileId?: string;
    registrationCommunity?: string;
    source?: FirestoreApprovalDoc['source'];
  } = {},
): Promise<void> {
  const digits = phone.replace(/\D/g, '');
  if (!digits || isAdminPhone(digits)) {
    return;
  }

  let db = await getFirebaseFirestore();
  if (!db) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    db = await getFirebaseFirestore();
  }
  if (!db) {
    return;
  }

  const approvalId = approvalDocIdFromPhone(digits);
  const docRef = doc(db, FIRESTORE_COLLECTIONS.approvals, approvalId);
  const profileId = profileDocIdFromPhone(digits);
  const [existing, profileSnapshot] = await Promise.all([
    getDocResilient(docRef),
    profileId ? getDocResilient(doc(db, FIRESTORE_COLLECTIONS.profiles, profileId)) : Promise.resolve(null),
  ]);
  const existingData = existing?.exists() ? (existing.data() as FirestoreApprovalDoc) : null;
  const profileData =
    profileSnapshot?.exists() ? (profileSnapshot.data() as FirestoreProfileDoc) : null;

  if (existingData?.status === 'approved' || profileData?.approvalStatus === 'approved') {
    return;
  }

  const now = Date.now();
  const nextName =
    options.name?.trim() ||
    existingData?.name ||
    `Member ${digits.slice(-4)}`;

  const payload: FirestoreApprovalDoc = {
    approvalId,
    phone: digits,
    name: nextName,
    profileId: options.profileId ?? existingData?.profileId,
    registrationCommunity:
      options.registrationCommunity ?? existingData?.registrationCommunity,
    status: 'pending',
    submittedAt: existingData?.status === 'pending' ? existingData.submittedAt : now,
    updatedAt: now,
    source: options.source ?? existingData?.source ?? 'login',
  };

  await setDoc(docRef, payload, { merge: true });

  if (profileId) {
    await setDoc(
      doc(db, FIRESTORE_COLLECTIONS.profiles, profileId),
      {
        approvalStatus: 'pending',
        updatedAt: now,
        ...(profileData ? {} : {
          phone: digits,
          profileId,
          fullName: nextName,
          ownerKey: 'current-user',
          registrationSource: 'self',
        }),
      },
      { merge: true },
    );
  }

  void createAdminNotification({
    title: 'New profile approval',
    body: `${nextName} submitted a profile for review.`,
    type: 'profile',
    relatedPhone: digits,
  }).catch(() => undefined);
}

export async function fetchUserApprovalStatus(
  phone: string,
): Promise<FirestoreApprovalDoc['status'] | null> {
  const digits = phone.replace(/\D/g, '');
  if (!digits || isAdminPhone(digits)) {
    return 'approved';
  }

  const db = await getFirebaseFirestore();
  if (!db) {
    return null;
  }

  const approvalId = approvalDocIdFromPhone(digits);
  const approvalSnapshot = await getDocResilient(doc(db, FIRESTORE_COLLECTIONS.approvals, approvalId));
  if (approvalSnapshot?.exists()) {
    return (approvalSnapshot.data() as FirestoreApprovalDoc).status;
  }

  const profileId = profileDocIdFromPhone(digits);
  if (profileId) {
    const profileSnapshot = await getDocResilient(doc(db, FIRESTORE_COLLECTIONS.profiles, profileId));
    if (profileSnapshot?.exists()) {
      const profile = profileSnapshot.data() as { approvalStatus?: FirestoreApprovalDoc['status'] };
      return profile.approvalStatus ?? null;
    }
  }

  return null;
}

export function resolveUserApprovalStatus(
  ...statuses: Array<FirestoreApprovalDoc['status'] | null | undefined | string>
): FirestoreApprovalDoc['status'] | null {
  const normalized = statuses.filter(
    (status): status is FirestoreApprovalDoc['status'] =>
      status === 'approved' || status === 'pending' || status === 'rejected',
  );

  if (normalized.includes('approved')) {
    return 'approved';
  }
  if (normalized.includes('rejected')) {
    return 'rejected';
  }
  if (normalized.includes('pending')) {
    return 'pending';
  }

  return null;
}

export function canUserBrowseProfiles(status: FirestoreApprovalDoc['status'] | null): boolean {
  return status === 'approved';
}

function isSelfRegisteredProfile(profile: FirestoreProfileDoc): boolean {
  if (profile.registrationSource === 'admin' || profile.ownerKey?.startsWith('admin-')) {
    return false;
  }
  return true;
}

function mergeApprovalRecords(
  approvalDocs: FirestoreApprovalDoc[],
  profiles: FirestoreProfileDoc[],
): AdminApprovalRecord[] {
  const records = new Map<string, { record: AdminApprovalRecord; sortTime: number }>();

  for (const entry of approvalDocs) {
    const phone = entry.phone.replace(/\D/g, '');
    if (!phone || isAdminPhone(phone)) {
      continue;
    }
    records.set(phone, {
      record: toAdminApprovalRecord(entry),
      sortTime: entry.updatedAt,
    });
  }

  for (const profile of profiles) {
    const phone = profile.phone?.replace(/\D/g, '') ?? '';
    if (!phone || isAdminPhone(phone) || records.has(phone) || !isSelfRegisteredProfile(profile)) {
      continue;
    }

    const status = resolveUserApprovalStatus(profile.approvalStatus);
    if (status === 'approved') {
      continue;
    }

    const hasProfileContent = Boolean(
      profile.fullName?.trim() ||
        profile.listing?.name?.trim() ||
        profile.biodata?.fullName?.trim(),
    );
    if (!hasProfileContent && status !== 'pending' && status !== 'rejected') {
      continue;
    }

    const resolvedStatus: FirestoreApprovalDoc['status'] = status ?? 'pending';
    records.set(phone, {
      record: {
        id: approvalDocIdFromPhone(phone),
        name:
          profile.fullName?.trim() ||
          profile.listing?.name?.trim() ||
          `Member ${phone.slice(-4)}`,
        phone,
        submittedAt: formatApprovalDate(profile.updatedAt ?? profile.createdAt ?? Date.now()),
        status: resolvedStatus,
      },
      sortTime: profile.updatedAt ?? profile.createdAt ?? 0,
    });
  }

  return Array.from(records.values())
    .sort((left, right) => right.sortTime - left.sortTime)
    .map(({ record }) => record);
}

export async function listApprovals(): Promise<AdminApprovalRecord[]> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return [];
  }

  const approvalDocs = await getDocsResilient<FirestoreApprovalDoc>(
    db,
    FIRESTORE_COLLECTIONS.approvals,
    { orderByField: 'updatedAt', preferServer: true },
  );
  const profiles = await getDocsResilient<FirestoreProfileDoc>(
    db,
    FIRESTORE_COLLECTIONS.profiles,
    { orderByField: 'updatedAt', preferServer: true },
  ).then((entries) => entries.filter((profile) => profile.accountStatus !== 'deleted'));

  return mergeApprovalRecords(approvalDocs, profiles);
}

export async function updateApprovalStatus(
  approvalId: string,
  status: AdminApprovalRecord['status'],
): Promise<void> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return;
  }

  const docRef = doc(db, FIRESTORE_COLLECTIONS.approvals, approvalId);
  const existing = await getDocResilient(docRef);
  const now = Date.now();
  let phone = '';

  if (!existing?.exists()) {
    phone = approvalId.startsWith('phone_') ? approvalId.slice('phone_'.length) : '';
    if (!phone) {
      return;
    }

    const profileId = profileDocIdFromPhone(phone);
    if (!profileId) {
      return;
    }

    const profileSnapshot = await getDocResilient(doc(db, FIRESTORE_COLLECTIONS.profiles, profileId));
    if (!profileSnapshot?.exists()) {
      return;
    }

    const profile = profileSnapshot.data() as FirestoreProfileDoc;
    phone = profile.phone?.replace(/\D/g, '') || phone;
    const payload: FirestoreApprovalDoc = {
      approvalId,
      phone,
      name:
        profile.fullName?.trim() ||
        profile.listing?.name?.trim() ||
        `Member ${phone.slice(-4)}`,
      profileId: profile.profileId,
      registrationCommunity: profile.registrationCommunity,
      status,
      submittedAt: profile.createdAt ?? now,
      updatedAt: now,
      source: 'profile',
    };
    await setDoc(docRef, payload, { merge: true });
  } else {
    const current = existing.data() as FirestoreApprovalDoc;
    phone = current.phone.replace(/\D/g, '');
    await setDoc(
      docRef,
      {
        ...current,
        status,
        updatedAt: now,
      } satisfies FirestoreApprovalDoc,
      { merge: true },
    );
  }

  const profileId = profileDocIdFromPhone(phone);
  if (profileId) {
    await setDoc(
      doc(db, FIRESTORE_COLLECTIONS.profiles, profileId),
      {
        approvalStatus: status,
        updatedAt: now,
      },
      { merge: true },
    );
  }
}
