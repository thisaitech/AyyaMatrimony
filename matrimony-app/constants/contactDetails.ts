import { Language } from '@/constants/i18n';
import { ProfileFieldConfig } from '@/constants/formOptions';

export const CONTACT_STEP_ID = '19';

export const CONTACT_PHONE_KEY = 'contactPhone';
export const WHATSAPP_NUMBER_KEY = 'whatsappNumber';
export const FACEBOOK_PROFILE_KEY = 'facebookProfile';
export const INSTAGRAM_PROFILE_KEY = 'instagramProfile';

export type InterestStatus = 'none' | 'sent' | 'received' | 'mutual';

type ContactFieldDefinition = {
  config: ProfileFieldConfig;
  display: Record<Language, { label: string; placeholder: string }>;
};

const contactDetailsFields: ContactFieldDefinition[] = [
  {
    config: { fieldKey: CONTACT_PHONE_KEY, kind: 'text', keyboardType: 'phone-pad', maxLength: 10 },
    display: {
      en: { label: 'Phone Number', placeholder: 'Enter 10 digit number' },
      ta: { label: 'தொலைபேசி எண்', placeholder: '10 இலக்க எண்ணை உள்ளிடவும்' },
    },
  },
  {
    config: {
      fieldKey: WHATSAPP_NUMBER_KEY,
      kind: 'text',
      optional: true,
      keyboardType: 'phone-pad',
      maxLength: 10,
    },
    display: {
      en: { label: 'WhatsApp Number (Optional)', placeholder: 'Enter 10 digit number' },
      ta: { label: 'வாட்ஸ்அப் எண் (விருப்பம்)', placeholder: '10 இலக்க எண்ணை உள்ளிடவும்' },
    },
  },
  {
    config: { fieldKey: FACEBOOK_PROFILE_KEY, kind: 'text', optional: true },
    display: {
      en: { label: 'Facebook Profile (Optional)', placeholder: 'Profile URL or username' },
      ta: { label: 'Facebook சுயவிவரம் (விருப்பம்)', placeholder: 'URL அல்லது பயனர்பெயர்' },
    },
  },
  {
    config: { fieldKey: INSTAGRAM_PROFILE_KEY, kind: 'text', optional: true },
    display: {
      en: { label: 'Instagram Profile (Optional)', placeholder: '@username or profile URL' },
      ta: { label: 'Instagram சுயவிவரம் (விருப்பம்)', placeholder: '@username அல்லது URL' },
    },
  },
];

export function getContactDetailsStepFields(language: Language) {
  return {
    configs: contactDetailsFields.map((field) => field.config),
    fields: contactDetailsFields.map((field) => field.display[language]),
  };
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isValidPhoneNumber(value: string): boolean {
  return /^\d{10}$/.test(normalizePhoneDigits(value));
}

export function maskPhoneNumber(value: string): string {
  const digits = normalizePhoneDigits(value);
  if (digits.length < 4) {
    return '*'.repeat(Math.max(digits.length, 4));
  }
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function canRevealPhoneNumber(status: InterestStatus): boolean {
  return status === 'mutual';
}

export type MemberContactDetails = {
  phoneNumber: string;
  whatsappNumber?: string;
  facebookProfile?: string;
  instagramProfile?: string;
  interestStatus: InterestStatus;
};
