import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import {
  formatRegistrationNumber,
  getGlobalSerialFromRegistrationNumber,
  getHinduRegistrationStarNumber,
  normalizeRegistrationNumber,
  normalizeRegistrationReligionValue,
  parseRegistrationNumberParts,
  REGISTRATION_SEQUENCE_START,
  type RegistrationReligion,
} from '@/constants/registrationNumbers';
import { getFirebaseFirestore } from '@/lib/firebase';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';

const COUNTERS_DOC_ID = 'global';
const LOCAL_COUNTERS_KEY = 'ayya_registration_counters_v2';
const FIRESTORE_ALLOCATION_TIMEOUT_MS = 800;

type RegistrationCountersDoc = {
  /** Last assigned shared order number (161, 162, 163, …). */
  globalSerial: number;
};

const DEFAULT_COUNTERS: RegistrationCountersDoc = {
  globalSerial: REGISTRATION_SEQUENCE_START - 1,
};

async function readLocalCounters(): Promise<RegistrationCountersDoc> {
  const raw = await AsyncStorage.getItem(LOCAL_COUNTERS_KEY);
  if (!raw) {
    return { ...DEFAULT_COUNTERS };
  }

  try {
    const parsed = JSON.parse(raw) as RegistrationCountersDoc;
    return {
      globalSerial: parsed.globalSerial ?? REGISTRATION_SEQUENCE_START - 1,
    };
  } catch {
    return { ...DEFAULT_COUNTERS };
  }
}

async function writeLocalCounters(counters: RegistrationCountersDoc): Promise<void> {
  await AsyncStorage.setItem(LOCAL_COUNTERS_KEY, JSON.stringify(counters));
}

function bumpGlobalCounter(counters: RegistrationCountersDoc): {
  counters: RegistrationCountersDoc;
  globalSerial: number;
} {
  const globalSerial = Math.max(
    REGISTRATION_SEQUENCE_START,
    (counters.globalSerial ?? REGISTRATION_SEQUENCE_START - 1) + 1,
  );
  return { counters: { globalSerial }, globalSerial };
}

async function allocateFromLocal(
  religion: RegistrationReligion,
  starNumber?: number,
): Promise<string> {
  const current = await readLocalCounters();
  const { counters, globalSerial } = bumpGlobalCounter(current);
  await writeLocalCounters(counters);
  return formatRegistrationNumber(religion, globalSerial, starNumber);
}

async function readFirestoreGlobalSerial(): Promise<number | null> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return null;
  }

  try {
    const counterRef = doc(db, FIRESTORE_COLLECTIONS.registrationCounters, COUNTERS_DOC_ID);
    const snapshot = await getDoc(counterRef);
    if (!snapshot.exists()) {
      return REGISTRATION_SEQUENCE_START - 1;
    }
    const data = snapshot.data() as RegistrationCountersDoc;
    return data.globalSerial ?? REGISTRATION_SEQUENCE_START - 1;
  } catch {
    return null;
  }
}

function nextSerialFromCounters(currentSerial: number): number {
  return Math.max(REGISTRATION_SEQUENCE_START, currentSerial + 1);
}

/** Show the next number immediately without reserving it. */
export async function previewRegistrationNumber(
  religion: string,
  rasi = '',
  natchathiram = '',
): Promise<string> {
  const normalized = normalizeRegistrationReligionValue(religion);
  if (!normalized) {
    return '';
  }

  let starNumber: number | undefined;
  if (normalized === 'hindu') {
    const resolvedStar = getHinduRegistrationStarNumber(natchathiram, rasi);
    if (resolvedStar != null) {
      starNumber = resolvedStar;
    }
  }

  const local = await readLocalCounters();
  let baseSerial = local.globalSerial ?? REGISTRATION_SEQUENCE_START - 1;

  try {
    const remoteSerial = await Promise.race([
      readFirestoreGlobalSerial(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), FIRESTORE_ALLOCATION_TIMEOUT_MS)),
    ]);
    if (remoteSerial != null) {
      baseSerial = Math.max(baseSerial, remoteSerial);
    }
  } catch {
    // Use local counter only.
  }

  const nextSerial = nextSerialFromCounters(baseSerial);
  if (normalized === 'hindu' && starNumber != null) {
    return formatRegistrationNumber('hindu', nextSerial, starNumber);
  }
  return formatRegistrationNumber(normalized === 'hindu' ? 'rc-christian' : normalized, nextSerial);
}

function reformatWithExistingSerial(
  religion: RegistrationReligion,
  globalSerial: number,
  rasi: string,
  natchathiram: string,
): string {
  if (religion === 'hindu') {
    const starNumber = getHinduRegistrationStarNumber(natchathiram, rasi);
    if (starNumber == null) {
      return '';
    }
    return formatRegistrationNumber('hindu', globalSerial, starNumber);
  }
  return formatRegistrationNumber(religion, globalSerial);
}

async function allocateFromFirestore(
  religion: RegistrationReligion,
  starNumber?: number,
): Promise<string | null> {
  const db = await getFirebaseFirestore();
  if (!db) {
    return null;
  }

  const counterRef = doc(db, FIRESTORE_COLLECTIONS.registrationCounters, COUNTERS_DOC_ID);

  const globalSerial = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const current = snapshot.exists()
      ? ({ ...DEFAULT_COUNTERS, ...(snapshot.data() as RegistrationCountersDoc) } as RegistrationCountersDoc)
      : { ...DEFAULT_COUNTERS };

    const { counters, globalSerial: nextSerial } = bumpGlobalCounter(current);
    transaction.set(counterRef, counters, { merge: true });
    return nextSerial;
  });

  return formatRegistrationNumber(religion, globalSerial, starNumber);
}

export async function allocateRegistrationNumber(
  religion: string,
  rasi = '',
  natchathiram = '',
): Promise<string> {
  const normalized = normalizeRegistrationReligionValue(religion);
  if (!normalized) {
    return '';
  }

  let starNumber: number | undefined;
  if (normalized === 'hindu') {
    const resolvedStar = getHinduRegistrationStarNumber(natchathiram, rasi);
    if (resolvedStar == null) {
      return '';
    }
    starNumber = resolvedStar;
  }

  try {
    const remote = await Promise.race([
      allocateFromFirestore(normalized, starNumber),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), FIRESTORE_ALLOCATION_TIMEOUT_MS)),
    ]);
    if (remote) {
      return remote;
    }
  } catch {
    // Fall back to local sequential counter when Firestore is unavailable.
  }

  return allocateFromLocal(normalized, starNumber);
}

export async function resolveRegistrationNumber(
  params: {
    religion: string;
    rasi?: string;
    natchathiram?: string;
    existingNumber?: string;
  },
  options: { localOnly?: boolean } = {},
): Promise<string> {
  const religion = normalizeRegistrationReligionValue(params.religion);
  let existing = normalizeRegistrationNumber(params.existingNumber ?? '');

  if (existing && !parseRegistrationNumberParts(existing)) {
    existing = '';
  }

  if (
    existing &&
    religion &&
    shouldKeepRegistrationNumber(
      existing,
      religion,
      params.rasi ?? '',
      params.natchathiram ?? '',
    )
  ) {
    return existing;
  }

  if (!religion) {
    return existing;
  }

  const reservedSerial = getGlobalSerialFromRegistrationNumber(existing);
  if (reservedSerial != null) {
    const reformatted = reformatWithExistingSerial(
      religion,
      reservedSerial,
      params.rasi ?? '',
      params.natchathiram ?? '',
    );
    if (reformatted) {
      return reformatted;
    }
  }

  if (religion === 'hindu') {
    const starNumber = getHinduRegistrationStarNumber(params.natchathiram ?? '', params.rasi ?? '');
    if (starNumber == null) {
      if (options.localOnly) {
        return allocateFromLocal('rc-christian');
      }
      return allocateRegistrationNumber('rc-christian', '', '');
    }
  }

  if (options.localOnly) {
    if (religion === 'hindu') {
      const starNumber = getHinduRegistrationStarNumber(params.natchathiram ?? '', params.rasi ?? '');
      if (starNumber == null) {
        return '';
      }
      return allocateFromLocal('hindu', starNumber);
    }
    return allocateFromLocal(religion);
  }

  return allocateRegistrationNumber(religion, params.rasi ?? '', params.natchathiram ?? '');
}

/** Keep an already-assigned number when religion / star still match. */
export function shouldKeepRegistrationNumber(
  existingNumber: string,
  religion: string,
  rasi = '',
  natchathiram = '',
): boolean {
  const digits = normalizeRegistrationNumber(existingNumber);
  if (!digits) {
    return false;
  }

  const normalized = normalizeRegistrationReligionValue(religion);
  if (!normalized) {
    return false;
  }

  const parts = parseRegistrationNumberParts(digits);
  if (!parts) {
    return false;
  }

  if (normalized === 'hindu') {
    const starNumber = getHinduRegistrationStarNumber(natchathiram, rasi);
    if (starNumber == null) {
      return parts.kind === 'christian';
    }
    return parts.kind === 'hindu' && parts.starNumber === starNumber;
  }

  return parts.kind === 'christian';
}
