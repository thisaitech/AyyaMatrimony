import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase';
import {
  FIRESTORE_COLLECTIONS,
  subscriptionDocIdFromPhone,
  type FirestoreSubscriptionDoc,
} from '@/lib/firestore/collections';

export async function fetchSubscription(phone: string): Promise<FirestoreSubscriptionDoc | null> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  const db = await getFirebaseFirestore();
  if (!db) {
    return null;
  }

  const docId = subscriptionDocIdFromPhone(digits);
  const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTIONS.subscriptions, docId));
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as FirestoreSubscriptionDoc;
}

export async function upsertSubscription(
  phone: string,
  patch: Partial<Omit<FirestoreSubscriptionDoc, 'phone'>>,
): Promise<FirestoreSubscriptionDoc> {
  const digits = phone.replace(/\D/g, '');
  const db = await getFirebaseFirestore();
  const docId = subscriptionDocIdFromPhone(digits);
  const now = Date.now();

  const existing = db ? await getDoc(doc(db, FIRESTORE_COLLECTIONS.subscriptions, docId)) : null;
  const current = existing?.exists() ? (existing.data() as FirestoreSubscriptionDoc) : null;

  const next: FirestoreSubscriptionDoc = {
    phone: digits,
    accessMode: patch.accessMode ?? current?.accessMode ?? 'unpaid',
    batchesPaid: patch.batchesPaid ?? current?.batchesPaid ?? 0,
    viewedProfileIds: patch.viewedProfileIds ?? current?.viewedProfileIds ?? [],
    hiddenProfileIds: patch.hiddenProfileIds ?? current?.hiddenProfileIds ?? [],
    updatedAt: now,
  };

  if (db && docId) {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.subscriptions, docId), next, { merge: true });

    const profileId = `phone_${digits}`;
    await setDoc(
      doc(db, FIRESTORE_COLLECTIONS.profiles, profileId),
      { paidBatches: next.batchesPaid, updatedAt: now },
      { merge: true },
    );
  }

  return next;
}

export async function setMemberHiddenProfiles(phone: string, hiddenProfileIds: string[]): Promise<void> {
  await upsertSubscription(phone, { hiddenProfileIds });
}

export async function toggleMemberHiddenProfile(
  phone: string,
  profileId: string,
): Promise<string[]> {
  const current = await fetchSubscription(phone);
  const existing = current?.hiddenProfileIds ?? [];
  const next = existing.includes(profileId)
    ? existing.filter((id) => id !== profileId)
    : [...existing, profileId];
  await upsertSubscription(phone, { hiddenProfileIds: next });
  return next;
}

export async function hideMemberProfile(phone: string, profileId: string): Promise<string[]> {
  const current = await fetchSubscription(phone);
  const existing = current?.hiddenProfileIds ?? [];
  if (existing.includes(profileId)) {
    return existing;
  }
  const next = [...existing, profileId];
  await upsertSubscription(phone, { hiddenProfileIds: next });
  return next;
}

export async function grantVerifiedPaymentBatch(phone: string): Promise<number> {
  const current = await fetchSubscription(phone);
  const batchesPaid = (current?.batchesPaid ?? 0) + 1;
  await upsertSubscription(phone, {
    accessMode: 'paid',
    batchesPaid,
  });
  return batchesPaid;
}

export async function syncSubscriptionViewedProfiles(
  phone: string,
  viewedProfileIds: string[],
): Promise<void> {
  await upsertSubscription(phone, { viewedProfileIds });
}
