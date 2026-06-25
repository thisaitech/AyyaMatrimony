import {
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  collection,
  getDoc,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  orderBy,
  query,
  type Query,
  type QueryConstraint,
} from 'firebase/firestore';

export function isNetworkOnline(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

export function isFirestoreTransientError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code: string }).code)
      : '';
  return ['unavailable', 'deadline-exceeded', 'failed-precondition'].includes(code);
}

export async function getDocResilient(
  docRef: DocumentReference,
): Promise<DocumentSnapshot | null> {
  if (!isNetworkOnline()) {
    try {
      return await getDocFromCache(docRef);
    } catch {
      return null;
    }
  }

  try {
    return await getDoc(docRef);
  } catch (error) {
    if (!isFirestoreTransientError(error)) {
      throw error;
    }
    try {
      return await getDocFromCache(docRef);
    } catch {
      return null;
    }
  }
}

function sortDocsByField<T extends { updatedAt?: number; createdAt?: number; submittedAt?: number }>(
  docs: Array<{ data: () => T }>,
  field: 'updatedAt' | 'createdAt' | 'submittedAt',
): Array<{ data: () => T }> {
  return [...docs].sort((left, right) => {
    const leftValue = left.data()[field] ?? 0;
    const rightValue = right.data()[field] ?? 0;
    return rightValue - leftValue;
  });
}

async function fetchQuerySnapshot(q: Query, preferServer: boolean) {
  if (preferServer && isNetworkOnline()) {
    try {
      return await getDocsFromServer(q);
    } catch {
      return getDocs(q);
    }
  }
  return getDocs(q);
}

/** Read a collection with optional orderBy; falls back to unordered fetch + client sort. */
export async function getDocsResilient<T extends Record<string, unknown>>(
  db: Firestore,
  collectionName: string,
  options: {
    orderByField?: 'updatedAt' | 'createdAt' | 'submittedAt';
    constraints?: QueryConstraint[];
    /** Admin dashboards should read from server to avoid stale offline cache. */
    preferServer?: boolean;
  } = {},
): Promise<T[]> {
  const constraints = options.constraints ?? [];
  const orderField = options.orderByField;
  const preferServer = options.preferServer ?? false;

  const mapDocs = (snapshot: { docs: Array<{ data: () => T }> }) => {
    const docs = orderField ? sortDocsByField(snapshot.docs, orderField) : snapshot.docs;
    return docs.map((entry) => entry.data());
  };

  const runQuery = async (ordered: boolean) => {
    const q = ordered && orderField
      ? query(collection(db, collectionName), ...constraints, orderBy(orderField, 'desc'))
      : query(collection(db, collectionName), ...constraints);
    return fetchQuerySnapshot(q, preferServer);
  };

  if (!isNetworkOnline()) {
    try {
      const cached = await getDocsFromCache(collection(db, collectionName));
      return mapDocs(cached);
    } catch {
      return [];
    }
  }

  try {
    const snapshot = orderField
      ? await runQuery(true).catch(() => runQuery(false))
      : await runQuery(false);
    return mapDocs(snapshot);
  } catch (error) {
    if (orderField) {
      try {
        const snapshot = await runQuery(false);
        return mapDocs(snapshot);
      } catch {
        // Fall through to cache / plain collection read.
      }
    }

    try {
      const cached = await getDocsFromCache(collection(db, collectionName));
      return mapDocs(cached);
    } catch {
      try {
        const snapshot = preferServer && isNetworkOnline()
          ? await getDocsFromServer(collection(db, collectionName)).catch(() =>
              getDocs(collection(db, collectionName)),
            )
          : await getDocs(collection(db, collectionName));
        return mapDocs(snapshot);
      } catch {
        return [];
      }
    }
  }
}
