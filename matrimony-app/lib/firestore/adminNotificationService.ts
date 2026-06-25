import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { AdminNotificationRecord } from '@/constants/adminMockData';
import { getFirebaseFirestore } from '@/lib/firebase';
import {
  FIRESTORE_COLLECTIONS,
  type FirestoreAdminNotificationDoc,
} from '@/lib/firestore/collections';
import { getDocsResilient } from '@/lib/firestore/readHelpers';

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function toAdminNotificationRecord(entry: FirestoreAdminNotificationDoc): AdminNotificationRecord {
  return {
    id: entry.notificationId,
    title: entry.title,
    body: entry.body,
    time: formatRelativeTime(entry.createdAt),
    read: entry.read,
  };
}

export async function createAdminNotification(
  input: Omit<FirestoreAdminNotificationDoc, 'notificationId' | 'read' | 'createdAt'>,
): Promise<void> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return;
  }

  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const payload: FirestoreAdminNotificationDoc = {
    notificationId,
    read: false,
    createdAt: Date.now(),
    ...input,
  };

  await setDoc(doc(db, FIRESTORE_COLLECTIONS.adminNotifications, notificationId), payload);
}

export async function listAdminNotifications(): Promise<AdminNotificationRecord[]> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return [];
  }

  const entries = await getDocsResilient<FirestoreAdminNotificationDoc>(
    db,
    FIRESTORE_COLLECTIONS.adminNotifications,
    { orderByField: 'createdAt', preferServer: true },
  );

  return entries.map((entry) => toAdminNotificationRecord(entry));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return;
  }

  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.adminNotifications, notificationId), {
    read: true,
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return;
  }

  const snapshot = await getDocs(collection(db, FIRESTORE_COLLECTIONS.adminNotifications));
  await Promise.all(
    snapshot.docs.map((entry) => updateDoc(entry.ref, { read: true })),
  );
}
