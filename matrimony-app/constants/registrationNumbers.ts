import type { Language } from '@/constants/i18n';

export type RegistrationReligion = 'hindu' | 'rc-christian' | 'csi-christian';

export const REGISTRATION_SEQUENCE_START = 161;

/** Shared order sequence starts at 161 for every religion. Hindu adds star (01–36) in front. */
export const REGISTRATION_PREFIX: Record<Exclude<RegistrationReligion, 'hindu'>, string> = {
  'rc-christian': String(REGISTRATION_SEQUENCE_START),
  'csi-christian': String(REGISTRATION_SEQUENCE_START),
};

export type HinduRegistrationStar = {
  id: string;
  rasi: string;
  number: number;
  en: string;
  ta: string;
};

/** Red chart numbers 1–36 from the Ayya matrimony rasi / star chart. */
export const HINDU_REGISTRATION_STARS: HinduRegistrationStar[] = [
  { id: 'ashwini', rasi: 'mesham', number: 1, en: 'Ashwini', ta: 'அசுவினி' },
  { id: 'bharani', rasi: 'mesham', number: 2, en: 'Bharani', ta: 'பரணி' },
  { id: 'krittika-1', rasi: 'mesham', number: 3, en: 'Karthigai 1', ta: 'கார்த்திகை 1' },
  { id: 'krittika-2-4', rasi: 'rishabam', number: 4, en: 'Karthigai 2, 3, 4', ta: 'கார்த்திகை 2, 3, 4' },
  { id: 'rohini', rasi: 'rishabam', number: 5, en: 'Rohini', ta: 'ரோகிணி' },
  { id: 'mrigashira-1-2', rasi: 'rishabam', number: 6, en: 'Mrigashiram 1, 2', ta: 'மிருகசீரிடம் 1, 2' },
  { id: 'mrigashira-3-4', rasi: 'mithunam', number: 7, en: 'Mrigashiram 3, 4', ta: 'மிருகசீரிடம் 3, 4' },
  { id: 'ardra', rasi: 'mithunam', number: 8, en: 'Thiruvathirai', ta: 'திருவாதிரை' },
  { id: 'punarvasu-1-3', rasi: 'mithunam', number: 9, en: 'Punarpoosam 1, 2, 3', ta: 'புனர்பூசம் 1, 2, 3' },
  { id: 'punarvasu-4', rasi: 'kadagam', number: 10, en: 'Punarpoosam 4', ta: 'புனர்பூசம் 4' },
  { id: 'pushya', rasi: 'kadagam', number: 11, en: 'Poosam', ta: 'பூசம்' },
  { id: 'ashlesha', rasi: 'kadagam', number: 12, en: 'Ayilyam', ta: 'ஆயில்யம்' },
  { id: 'magha', rasi: 'simham', number: 13, en: 'Magam', ta: 'மகம்' },
  { id: 'purva-phalguni', rasi: 'simham', number: 14, en: 'Pooram', ta: 'பூரம்' },
  { id: 'uttara-phalguni-1', rasi: 'simham', number: 15, en: 'Uthiram 1', ta: 'உத்திரம் 1' },
  { id: 'uttara-phalguni-2-4', rasi: 'kanni', number: 16, en: 'Uthiram 2, 3, 4', ta: 'உத்திரம் 2, 3, 4' },
  { id: 'hasta', rasi: 'kanni', number: 17, en: 'Hastham', ta: 'அஸ்தம்' },
  { id: 'chitra-1-2', rasi: 'kanni', number: 18, en: 'Chithirai 1, 2', ta: 'சித்திரை 1, 2' },
  { id: 'chitra-3-4', rasi: 'thulam', number: 19, en: 'Chithirai 3, 4', ta: 'சித்திரை 3, 4' },
  { id: 'swati', rasi: 'thulam', number: 20, en: 'Swathi', ta: 'சுவாதி' },
  { id: 'vishakha-1-3', rasi: 'thulam', number: 21, en: 'Visakam 1, 2, 3', ta: 'விசாகம் 1, 2, 3' },
  { id: 'vishakha-4', rasi: 'vrischikam', number: 22, en: 'Visakam 4', ta: 'விசாகம் 4' },
  { id: 'anuradha', rasi: 'vrischikam', number: 23, en: 'Anusham', ta: 'அனுஷம்' },
  { id: 'jyeshtha', rasi: 'vrischikam', number: 24, en: 'Kettai', ta: 'கேட்டை' },
  { id: 'mula', rasi: 'dhanusu', number: 25, en: 'Moolam', ta: 'மூலம்' },
  { id: 'purva-ashadha', rasi: 'dhanusu', number: 26, en: 'Pooradam', ta: 'பூராடம்' },
  { id: 'uttara-ashadha-1', rasi: 'dhanusu', number: 27, en: 'Uthiradam 1', ta: 'உத்திராடம் 1' },
  { id: 'uttara-ashadha-2-4', rasi: 'makaram', number: 28, en: 'Uthiradam 2, 3, 4', ta: 'உத்திராடம் 2, 3, 4' },
  { id: 'shravana', rasi: 'makaram', number: 29, en: 'Thiruvonam', ta: 'திருவோணம்' },
  { id: 'dhanishta-1-2', rasi: 'makaram', number: 30, en: 'Avittam 1, 2', ta: 'அவிட்டம் 1, 2' },
  { id: 'dhanishta-3-4', rasi: 'kumbam', number: 31, en: 'Avittam 3, 4', ta: 'அவிட்டம் 3, 4' },
  { id: 'shatabhisha', rasi: 'kumbam', number: 32, en: 'Sathayam', ta: 'சதயம்' },
  { id: 'purva-bhadrapada-1-3', rasi: 'kumbam', number: 33, en: 'Poorattadhi 1, 2, 3', ta: 'பூரட்டாதி 1, 2, 3' },
  { id: 'purva-bhadrapada-4', rasi: 'meenam', number: 34, en: 'Poorattadhi 4', ta: 'பூரட்டாதி 4' },
  { id: 'uttara-bhadrapada', rasi: 'meenam', number: 35, en: 'Uthirattadhi', ta: 'உத்திரட்டாதி' },
  { id: 'revati', rasi: 'meenam', number: 36, en: 'Revathi', ta: 'ரேவதி' },
];

const LEGACY_NAKSHATRA_TO_STAR_ID: Record<string, string[]> = {
  ashwini: ['ashwini'],
  bharani: ['bharani'],
  krittika: ['krittika-1', 'krittika-2-4'],
  rohini: ['rohini'],
  mrigashira: ['mrigashira-1-2', 'mrigashira-3-4'],
  ardra: ['ardra'],
  punarvasu: ['punarvasu-1-3', 'punarvasu-4'],
  pushya: ['pushya'],
  ashlesha: ['ashlesha'],
  magha: ['magha'],
  'purva-phalguni': ['purva-phalguni', 'uttara-phalguni-1'],
  'uttara-phalguni': ['uttara-phalguni-1', 'uttara-phalguni-2-4'],
  hasta: ['hasta'],
  chitra: ['chitra-1-2', 'chitra-3-4'],
  swati: ['swati'],
  vishakha: ['vishakha-1-3', 'vishakha-4'],
  anuradha: ['anuradha'],
  jyeshtha: ['jyeshtha'],
  mula: ['mula'],
  'purva-ashadha': ['purva-ashadha'],
  'uttara-ashadha': ['uttara-ashadha-1', 'uttara-ashadha-2-4'],
  shravana: ['shravana'],
  dhanishta: ['dhanishta-1-2', 'dhanishta-3-4'],
  shatabhisha: ['shatabhisha'],
  'purva-bhadrapada': ['purva-bhadrapada-1-3', 'purva-bhadrapada-4'],
  'uttara-bhadrapada': ['uttara-bhadrapada'],
  revati: ['revati'],
};

export type ParsedRegistrationNumber =
  | { kind: 'christian'; globalSerial: number }
  | { kind: 'hindu'; starNumber: number; globalSerial: number };

export function normalizeRegistrationReligionValue(stored: string): RegistrationReligion | '' {
  const trimmed = stored.trim();
  if (trimmed === 'hindu' || trimmed === 'rc-christian' || trimmed === 'csi-christian') {
    return trimmed;
  }
  return '';
}

export function getRegistrationPrefix(religion: string): string {
  const normalized = normalizeRegistrationReligionValue(religion);
  if (normalized === 'rc-christian') {
    return REGISTRATION_PREFIX['rc-christian'];
  }
  if (normalized === 'csi-christian') {
    return REGISTRATION_PREFIX['csi-christian'];
  }
  return '';
}

export function parseRegistrationNumberParts(digits: string): ParsedRegistrationNumber | null {
  const normalized = digits.replace(/\D/g, '');
  if (!normalized) {
    return null;
  }

  if (normalized.length >= 5) {
    const starNumber = Number.parseInt(normalized.slice(0, 2), 10);
    const globalSerial = Number.parseInt(normalized.slice(2), 10);
    if (
      starNumber >= 1 &&
      starNumber <= 36 &&
      Number.isFinite(globalSerial) &&
      globalSerial >= REGISTRATION_SEQUENCE_START
    ) {
      return { kind: 'hindu', starNumber, globalSerial };
    }
  }

  const globalSerial = Number.parseInt(normalized, 10);
  if (Number.isFinite(globalSerial) && globalSerial >= REGISTRATION_SEQUENCE_START) {
    return { kind: 'christian', globalSerial };
  }

  return null;
}

/** RC / CSI: the shared order number only (161, 162, 163, …). Hindu: star (01–36) + shared order. */
export function formatRegistrationNumber(
  religion: RegistrationReligion,
  globalSerial: number,
  starNumber?: number,
): string {
  if (religion === 'hindu' && starNumber != null) {
    return `${String(starNumber).padStart(2, '0')}${String(globalSerial)}`;
  }
  return String(globalSerial);
}

export function getGlobalSerialFromRegistrationNumber(number: string): number | null {
  const parts = parseRegistrationNumberParts(number);
  return parts?.globalSerial ?? null;
}

export function findHinduRegistrationStar(
  natchathiram: string,
  rasi = '',
): HinduRegistrationStar | undefined {
  const trimmedStar = natchathiram.trim();
  const trimmedRasi = rasi.trim();
  if (!trimmedStar) {
    return undefined;
  }

  const direct = HINDU_REGISTRATION_STARS.find(
    (entry) =>
      entry.id === trimmedStar && (!trimmedRasi || entry.rasi === trimmedRasi),
  );
  if (direct) {
    return direct;
  }

  const legacyIds = LEGACY_NAKSHATRA_TO_STAR_ID[trimmedStar] ?? [];
  for (const legacyId of legacyIds) {
    const match = HINDU_REGISTRATION_STARS.find(
      (entry) => entry.id === legacyId && (!trimmedRasi || entry.rasi === trimmedRasi),
    );
    if (match) {
      return match;
    }
  }

  if (legacyIds.length === 1) {
    return HINDU_REGISTRATION_STARS.find((entry) => entry.id === legacyIds[0]);
  }

  return undefined;
}

export function getHinduRegistrationStarNumber(natchathiram: string, rasi = ''): number | null {
  const star = findHinduRegistrationStar(natchathiram, rasi);
  return star?.number ?? null;
}

export function getRegistrationNatchathiramOptions(
  language: Language,
  rasi = '',
): Array<{ value: string; label: string }> {
  const trimmedRasi = rasi.trim();
  const entries = trimmedRasi
    ? HINDU_REGISTRATION_STARS.filter((entry) => entry.rasi === trimmedRasi)
    : HINDU_REGISTRATION_STARS;

  return entries.map((entry) => ({
    value: entry.id,
    label: language === 'ta' ? entry.ta : entry.en,
  }));
}

export function getRegistrationNatchathiramLabel(
  natchathiram: string,
  language: Language,
  rasi = '',
): string {
  const star = findHinduRegistrationStar(natchathiram, rasi);
  if (!star) {
    return natchathiram;
  }
  return language === 'ta' ? star.ta : star.en;
}

export function normalizeRegistrationNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function sanitizeRegistrationInput(text: string): string {
  return text.replace(/\D/g, '').slice(0, 7);
}

export function registrationNumberMatchesReligion(number: string, religion: string): boolean {
  const parts = parseRegistrationNumberParts(number);
  if (!parts) {
    return false;
  }

  const normalized = normalizeRegistrationReligionValue(religion);
  if (normalized === 'hindu') {
    return parts.kind === 'hindu';
  }
  if (normalized === 'rc-christian' || normalized === 'csi-christian') {
    return parts.kind === 'christian';
  }
  return false;
}

export function registrationNumberMatchesHinduStar(
  number: string,
  natchathiram: string,
  rasi = '',
): boolean {
  const starNumber = getHinduRegistrationStarNumber(natchathiram, rasi);
  if (starNumber == null) {
    return true;
  }

  const parts = parseRegistrationNumberParts(number);
  return parts?.kind === 'hindu' && parts.starNumber === starNumber;
}
