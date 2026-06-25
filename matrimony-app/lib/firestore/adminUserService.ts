import { collection, getDocs, getDocsFromServer, orderBy, query } from 'firebase/firestore';
import type { AdminUserRecord } from '@/constants/adminMockData';
import { isAdminPhone } from '@/constants/admin';
import { getFirebaseFirestore } from '@/lib/firebase';
import { isNetworkOnline } from '@/lib/firestore/readHelpers';
import { resolveUserApprovalStatus } from '@/lib/firestore/approvalService';
import {
  FIRESTORE_COLLECTIONS,
  type FirestoreApprovalDoc,
  type FirestoreProfileDoc,
} from '@/lib/firestore/collections';
import { fetchSubscription } from '@/lib/firestore/subscriptionService';

function formatRegisteredDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function mapApprovalToUserStatus(
  status: FirestoreApprovalDoc['status'] | null,
  accountStatus?: FirestoreProfileDoc['accountStatus'],
): AdminUserRecord['status'] {
  if (accountStatus === 'blocked') {
    return 'blocked';
  }
  if (status === 'approved') {
    return 'active';
  }
  if (status === 'rejected') {
    return 'blocked';
  }
  return 'pending';
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return [];
  }

  const profilesRef = collection(db, FIRESTORE_COLLECTIONS.profiles);
  const profileSnapshot = isNetworkOnline()
    ? await getDocsFromServer(profilesRef).catch(() => getDocs(profilesRef))
    : await getDocs(profilesRef);
  let approvalDocs: FirestoreApprovalDoc[] = [];
  try {
    const approvalsRef = collection(db, FIRESTORE_COLLECTIONS.approvals);
    const approvalSnapshot = isNetworkOnline()
      ? await getDocsFromServer(
          query(approvalsRef, orderBy('updatedAt', 'desc')),
        ).catch(() => getDocs(query(approvalsRef, orderBy('updatedAt', 'desc'))))
      : await getDocs(query(approvalsRef, orderBy('updatedAt', 'desc')));
    approvalDocs = approvalSnapshot.docs.map((entry) => entry.data() as FirestoreApprovalDoc);
  } catch {
    const approvalsRef = collection(db, FIRESTORE_COLLECTIONS.approvals);
    const approvalSnapshot = isNetworkOnline()
      ? await getDocsFromServer(approvalsRef).catch(() => getDocs(approvalsRef))
      : await getDocs(approvalsRef);
    approvalDocs = approvalSnapshot.docs
      .map((entry) => entry.data() as FirestoreApprovalDoc)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  const approvalsByPhone = new Map<string, FirestoreApprovalDoc>();
  for (const data of approvalDocs) {
    const phone = data.phone?.replace(/\D/g, '') ?? '';
    if (phone && !isAdminPhone(phone)) {
      approvalsByPhone.set(phone, { ...data, phone });
    }
  }

  const usersByPhone = new Map<string, AdminUserRecord & { sortTime: number }>();

  for (const entry of profileSnapshot.docs) {
    const profile = entry.data() as FirestoreProfileDoc;
    const phone = profile.phone?.replace(/\D/g, '') ?? '';
    if (!phone || isAdminPhone(phone) || profile.accountStatus === 'deleted') {
      continue;
    }

    const approval = approvalsByPhone.get(phone);
    const approvalStatus = resolveUserApprovalStatus(approval?.status, profile.approvalStatus);
    const subscription = await fetchSubscription(phone).catch(() => null);

    usersByPhone.set(phone, {
      id: profile.profileId,
      name: profile.fullName?.trim() || profile.listing?.name?.trim() || `Member ${phone.slice(-4)}`,
      phone,
      status: mapApprovalToUserStatus(approvalStatus, profile.accountStatus),
      registeredAt: formatRegisteredDate(profile.createdAt),
      paidBatches: subscription?.batchesPaid ?? profile.paidBatches ?? 0,
      registrationSource: profile.registrationSource ?? (profile.ownerKey.startsWith('admin-') ? 'admin' : 'self'),
      sortTime: profile.createdAt,
    });
  }

  for (const approval of approvalsByPhone.values()) {
    if (usersByPhone.has(approval.phone)) {
      continue;
    }

    usersByPhone.set(approval.phone, {
      id: approval.approvalId,
      name: approval.name?.trim() || `Member ${approval.phone.slice(-4)}`,
      phone: approval.phone,
      status: mapApprovalToUserStatus(approval.status),
      registeredAt: formatRegisteredDate(approval.submittedAt),
      paidBatches: 0,
      registrationSource: 'self',
      sortTime: approval.submittedAt,
    });
  }

  return Array.from(usersByPhone.values())
    .sort((left, right) => right.sortTime - left.sortTime)
    .map(({ sortTime: _sortTime, ...user }) => user);
}
