import {
  collection,
  doc,
  setDoc,
} from 'firebase/firestore';
import { PROFILE_ACCESS_PRICE } from '@/constants/subscription';
import { getFirebaseFirestore } from '@/lib/firebase';
import {
  FIRESTORE_COLLECTIONS,
  type FirestoreApprovalDoc,
  type FirestorePaymentDoc,
} from '@/lib/firestore/collections';
import { grantVerifiedPaymentBatch } from '@/lib/firestore/subscriptionService';
import { createAdminNotification } from '@/lib/firestore/adminNotificationService';
import { fetchProfileByPhone } from '@/lib/firestore/profileService';
import { getDocResilient, getDocsResilient } from '@/lib/firestore/readHelpers';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export type AdminPaymentRecord = {
  id: string;
  phone: string;
  memberName: string;
  amount: number;
  method: string;
  referenceNumber: string;
  status: FirestorePaymentDoc['status'];
  submittedAt: string;
  profileApprovalStatus?: FirestoreApprovalDoc['status'] | null;
  paidBatches?: number;
};

function toAdminPaymentRecord(entry: FirestorePaymentDoc): AdminPaymentRecord {
  return {
    id: entry.paymentId,
    phone: entry.phone,
    memberName: entry.memberName,
    amount: entry.amount,
    method: entry.method,
    referenceNumber: entry.referenceNumber ?? '—',
    status: entry.status,
    submittedAt: formatDate(entry.submittedAt),
  };
}

async function enrichPaymentRecords(entries: AdminPaymentRecord[]): Promise<AdminPaymentRecord[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const profile = await fetchProfileByPhone(entry.phone);
      return {
        ...entry,
        profileApprovalStatus: profile?.approvalStatus ?? null,
        paidBatches: profile?.paidBatches ?? 0,
      };
    }),
  );
}

export async function submitPaymentRequest(
  phone: string,
  options: {
    memberName?: string;
    method: string;
    referenceNumber?: string;
  },
): Promise<FirestorePaymentDoc | null> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  const db = await getFirebaseFirestore();
  if (!db) {
    return null;
  }

  const paymentId = `pay_${digits}_${Date.now()}`;
  const now = Date.now();
  const payload: FirestorePaymentDoc = {
    paymentId,
    phone: digits,
    memberName: options.memberName?.trim() || `Member ${digits.slice(-4)}`,
    amount: PROFILE_ACCESS_PRICE,
    method: options.method,
    referenceNumber: options.referenceNumber?.trim(),
    status: 'pending',
    submittedAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, FIRESTORE_COLLECTIONS.payments, paymentId), payload);

  void createAdminNotification({
    title: 'Payment submitted',
    body: `${payload.memberName} submitted ₹${payload.amount} payment for verification.`,
    type: 'payment',
    relatedPhone: digits,
  }).catch(() => undefined);

  return payload;
}

export async function listPayments(
  status?: FirestorePaymentDoc['status'],
): Promise<AdminPaymentRecord[]> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return [];
  }

  let docs: FirestorePaymentDoc[] = await getDocsResilient<FirestorePaymentDoc>(
    db,
    FIRESTORE_COLLECTIONS.payments,
    { orderByField: 'updatedAt', preferServer: true },
  );

  const entries = docs
    .map((entry) => toAdminPaymentRecord(entry))
    .filter((entry) => (status ? entry.status === status : true));

  return enrichPaymentRecords(entries);
}

export async function updatePaymentStatus(
  paymentId: string,
  status: 'verified' | 'rejected',
  options: { verifiedBy?: string; rejectReason?: string } = {},
): Promise<boolean> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return false;
  }

  const docRef = doc(db, FIRESTORE_COLLECTIONS.payments, paymentId);
  const existing = await getDocResilient(docRef);
  if (!existing?.exists()) {
    return false;
  }

  const current = existing.data() as FirestorePaymentDoc;
  const now = Date.now();

  try {
    if (status === 'verified') {
      const batchNumber = await grantVerifiedPaymentBatch(current.phone);
      await setDoc(
        docRef,
        {
          ...current,
          status: 'verified',
          updatedAt: now,
          verifiedAt: now,
          verifiedBy: options.verifiedBy ?? 'admin',
          batchNumber,
        } satisfies FirestorePaymentDoc,
        { merge: true },
      );

      void createAdminNotification({
        title: 'Payment verified',
        body: `₹${current.amount} verified for ${current.memberName}.`,
        type: 'payment',
        relatedPhone: current.phone,
      }).catch(() => undefined);
      return true;
    }

    await setDoc(
      docRef,
      {
        ...current,
        status: 'rejected',
        updatedAt: now,
        rejectReason: options.rejectReason ?? 'Payment could not be verified',
      } satisfies FirestorePaymentDoc,
      { merge: true },
    );
    return true;
  } catch {
    return false;
  }
}

export async function countVerifiedPayments(): Promise<number> {
  const entries = await listPayments('verified');
  return entries.length;
}

export async function sumVerifiedRevenue(): Promise<number> {
  const entries = await listPayments('verified');
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

export async function fetchLatestPaymentStatus(
  phone: string,
): Promise<FirestorePaymentDoc['status'] | null> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  const db = await getFirebaseFirestore();
  if (!db) {
    return null;
  }

  let docs: FirestorePaymentDoc[] = await getDocsResilient<FirestorePaymentDoc>(
    db,
    FIRESTORE_COLLECTIONS.payments,
    { orderByField: 'updatedAt', preferServer: true },
  );

  const match = docs.find((entry) => entry.phone === digits);

  if (!match) {
    return null;
  }

  return match.status;
}

export async function adminGrantPayment(phone: string, memberName?: string): Promise<void> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return;
  }

  const db = await getFirebaseFirestore();
  if (!db) {
    return;
  }

  const paymentId = `pay_admin_${digits}_${Date.now()}`;
  const now = Date.now();
  const batchNumber = await grantVerifiedPaymentBatch(digits);

  await setDoc(doc(db, FIRESTORE_COLLECTIONS.payments, paymentId), {
    paymentId,
    phone: digits,
    memberName: memberName?.trim() || `Member ${digits.slice(-4)}`,
    amount: PROFILE_ACCESS_PRICE,
    method: 'admin_grant',
    status: 'verified',
    submittedAt: now,
    updatedAt: now,
    verifiedAt: now,
    verifiedBy: 'admin',
    batchNumber,
  } satisfies FirestorePaymentDoc);
}
