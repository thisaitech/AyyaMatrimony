import { MaterialIcons } from '@expo/vector-icons';
import { Language } from '@/constants/i18n';

export type ProfileStep = {
  id: string;
  step: number;
  total: number;
  title: string;
  subtitle: string;
  options?: { label: string; icon: keyof typeof MaterialIcons.glyphMap; wide?: boolean }[];
  fields?: { label: string; placeholder: string; type?: 'text' | 'select' | 'readonly' }[];
};

type StepContent = {
  title: string;
  subtitle: string;
  options?: { key: string; icon: keyof typeof MaterialIcons.glyphMap; wide?: boolean }[];
  fields?: { label: string; placeholder: string; type?: 'text' | 'select' | 'readonly' }[];
};

const stepContent: Record<Language, Record<string, StepContent>> = {
  en: {
    '1': {
      title: 'Who are you creating this profile for?',
      subtitle: '',
      options: [
        { key: 'Myself', icon: 'person' },
        { key: 'Son', icon: 'face' },
        { key: 'Daughter', icon: 'face' },
        { key: 'Brother', icon: 'boy' },
        { key: 'Sister', icon: 'girl' },
        { key: 'Relative', icon: 'groups' },
        { key: 'Friend', icon: 'people', wide: true },
      ],
    },
    '2': {
      title: '',
      subtitle: '',
      fields: [
        { label: 'Full Name', placeholder: 'Enter full name' },
        { label: 'Gender', placeholder: 'Select gender', type: 'select' },
        { label: 'Religion', placeholder: 'Select religion', type: 'select' },
        { label: 'Caste', placeholder: 'Nadar', type: 'readonly' },
        { label: 'Sub-Caste (Optional)', placeholder: 'Select sub-caste', type: 'select' },
      ],
    },
    '3': {
      title: '',
      subtitle: '',
      fields: [{ label: 'Date of Birth', placeholder: 'DD / MM / YYYY' }],
    },
    '4': {
      title: 'Marital Status',
      subtitle: '',
      options: [
        { key: 'Never Married', icon: 'favorite' },
        { key: 'Widowed', icon: 'heart-broken' },
        { key: 'Divorced', icon: 'splitscreen' },
        { key: 'Awaiting Divorce', icon: 'hourglass-empty' },
      ],
    },
    '13': {
      title: 'Horoscope Details',
      subtitle: 'Optional. You can skip this step and continue.',
      fields: [],
    },
    '7': {
      title: 'Education',
      subtitle: '',
      fields: [{ label: 'Education', placeholder: 'Select education', type: 'select' }],
    },
    '8': {
      title: 'Occupation',
      subtitle: '',
      fields: [
        { label: 'Occupation', placeholder: 'Select occupation', type: 'select' },
        { label: 'Work Type', placeholder: 'Select work type', type: 'select' },
      ],
    },
    '9': {
      title: 'Income Details',
      subtitle: '',
      fields: [
        { label: 'Monthly Income', placeholder: 'Select range', type: 'select' },
        { label: 'Annual Income (Optional)', placeholder: 'Select range', type: 'select' },
      ],
    },
    '16': {
      title: 'Property Details',
      subtitle: 'Optional. You can skip this step and continue.',
      fields: [],
    },
    '10': {
      title: 'Location Details',
      subtitle: '',
      fields: [
        { label: 'Native Place', placeholder: 'Enter native place' },
        { label: 'District', placeholder: 'Select district', type: 'select' },
        { label: 'State', placeholder: 'Select state', type: 'select' },
        { label: 'Country', placeholder: 'Select country', type: 'select' },
      ],
    },
    '11': {
      title: 'Family Information',
      subtitle: '',
      fields: [],
    },
    '12': {
      title: 'Parent & Sibling Details',
      subtitle: '',
      fields: [],
    },
    '18': {
      title: 'Physical Details',
      subtitle: '',
      fields: [],
    },
    '19': {
      title: 'Contact Details',
      subtitle: 'Optional. You can skip this step and continue.',
      fields: [],
    },
    photos: {
      title: 'Upload Photos',
      subtitle: '',
      fields: [],
    },
    final: {
      title: 'Partner Preferences',
      subtitle: '',
      fields: [
        { label: 'From Age', placeholder: 'Select from age', type: 'select' },
        { label: 'To Age', placeholder: 'Select to age', type: 'select' },
        { label: 'Education', placeholder: 'Select education', type: 'select' },
        { label: 'Preferred Location', placeholder: 'Select location', type: 'select' },
      ],
    },
  },
  ta: {
    '1': {
      title: 'இந்த சுயவிவரத்தை யாருக்காக உருவாக்குகிறீர்கள்?',
      subtitle: '',
      options: [
        { key: 'எனக்கே', icon: 'person' },
        { key: 'மகன்', icon: 'face' },
        { key: 'மகள்', icon: 'face' },
        { key: 'சகோதரன்', icon: 'boy' },
        { key: 'சகோதரி', icon: 'girl' },
        { key: 'உறவினர்', icon: 'groups' },
        { key: 'நண்பர்', icon: 'people', wide: true },
      ],
    },
    '2': {
      title: '',
      subtitle: '',
      fields: [
        { label: 'முழு பெயர்', placeholder: 'முழு பெயரை உள்ளிடவும்' },
        { label: 'பாலினம்', placeholder: 'பாலினத்தைத் தேர்ந்தெடுக்கவும்', type: 'select' },
        { label: 'மதம்', placeholder: 'மதத்தைத் தேர்ந்தெடுக்கவும்', type: 'select' },
        { label: 'சாதி', placeholder: 'நாடார்', type: 'readonly' },
        { label: 'உட்சாதி (விருப்பம்)', placeholder: 'உட்சாதியைத் தேர்ந்தெடுக்கவும்', type: 'select' },
      ],
    },
    '3': {
      title: '',
      subtitle: '',
      fields: [{ label: 'பிறந்த தேதி', placeholder: 'நாள் / மாதம் / ஆண்டு' }],
    },
    '4': {
      title: 'திருமண நிலை',
      subtitle: '',
      options: [
        { key: 'திருமணமாகாதவர்', icon: 'favorite' },
        { key: 'விதவை/விதவர்', icon: 'heart-broken' },
        { key: 'விவாகரத்து பெற்றவர்', icon: 'splitscreen' },
        { key: 'விவாகரத்துக்காக காத்திருப்பவர்', icon: 'hourglass-empty' },
      ],
    },
    '13': {
      title: 'ஜாதக விவரங்கள்',
      subtitle: 'விருப்பம். இந்தப் படியைத் தவிர்த்து தொடரலாம்.',
      fields: [],
    },
    '7': {
      title: 'கல்வி',
      subtitle: '',
      fields: [{ label: 'கல்வி', placeholder: 'கல்வியைத் தேர்ந்தெடுக்கவும்', type: 'select' }],
    },
    '8': {
      title: 'தொழில்',
      subtitle: '',
      fields: [
        { label: 'தொழில்', placeholder: 'தொழிலைத் தேர்ந்தெடுக்கவும்', type: 'select' },
        { label: 'வேலை வகை', placeholder: 'வேலை வகையைத் தேர்ந்தெடுக்கவும்', type: 'select' },
      ],
    },
    '9': {
      title: 'வருமான விவரங்கள்',
      subtitle: '',
      fields: [
        { label: 'மாத வருமானம்', placeholder: 'வரம்பைத் தேர்ந்தெடுக்கவும்', type: 'select' },
        { label: 'ஆண்டு வருமானம் (விருப்பம்)', placeholder: 'வரம்பைத் தேர்ந்தெடுக்கவும்', type: 'select' },
      ],
    },
    '16': {
      title: 'சொத்து விவரங்கள்',
      subtitle: 'விருப்பம். இந்தப் படியைத் தவிர்த்து தொடரலாம்.',
      fields: [],
    },
    '10': {
      title: 'இட விவரங்கள்',
      subtitle: '',
      fields: [
        { label: 'சொந்த ஊர்', placeholder: 'சொந்த ஊரை உள்ளிடவும்' },
        { label: 'மாவட்டம்', placeholder: 'மாவட்டத்தைத் தேர்ந்தெடுக்கவும்', type: 'select' },
        { label: 'மாநிலம்', placeholder: 'மாநிலத்தைத் தேர்ந்தெடுக்கவும்', type: 'select' },
        { label: 'நாடு', placeholder: 'நாட்டைத் தேர்ந்தெடுக்கவும்', type: 'select' },
      ],
    },
    '11': {
      title: 'குடும்பத் தகவல்',
      subtitle: '',
      fields: [],
    },
    '12': {
      title: 'பெற்றோர் & சகோதரர் விவரங்கள்',
      subtitle: '',
      fields: [],
    },
    '18': {
      title: 'உடல் விவரங்கள்',
      subtitle: '',
      fields: [],
    },
    '19': {
      title: 'தொடர்பு விவரங்கள்',
      subtitle: 'விருப்பம். இந்தப் படியைத் தவிர்த்து தொடரலாம்.',
      fields: [],
    },
    photos: {
      title: 'புகைப்படங்களைப் பதிவேற்று',
      subtitle: '',
      fields: [],
    },
    final: {
      title: 'இணை விருப்பங்கள்',
      subtitle: '',
      fields: [
        { label: 'தொடக்க வயது', placeholder: 'தொடக்க வயதைத் தேர்ந்தெடுக்கவும்', type: 'select' },
        { label: 'முடிவு வயது', placeholder: 'முடிவு வயதைத் தேர்ந்தெடுக்கவும்', type: 'select' },
        { label: 'கல்வி', placeholder: 'கல்வியைத் தேர்ந்தெடுக்கவும்', type: 'select' },
        { label: 'விருப்பமான இடம்', placeholder: 'இடத்தைத் தேர்ந்தெடுக்கவும்', type: 'select' },
      ],
    },
  },
};

const stepIds = ['1', '2', '3', '4', '13', '7', '8', '9', '16', '10', '11', '12', '18', '19', 'photos', 'final'];

function buildStep(id: string, language: Language, index: number, total: number): ProfileStep {
  const content = stepContent[language][id];
  return {
    id,
    step: index + 1,
    total,
    title: content.title,
    subtitle: content.subtitle,
    options: content.options?.map((option) => ({
      label: option.key,
      icon: option.icon,
      wide: option.wide,
    })),
    fields: content.fields,
  };
}

export function getProfileSteps(language: Language): ProfileStep[] {
  const total = stepIds.length;
  return stepIds.map((id, index) => buildStep(id, language, index, total));
}

export function getProfileStep(id: string, language: Language): ProfileStep | undefined {
  return getProfileSteps(language).find((step) => step.id === id);
}

export function getNextStepId(id: string, language: Language): string | null {
  const steps = getProfileSteps(language);
  const index = steps.findIndex((step) => step.id === id);
  if (index === -1 || index === steps.length - 1) return null;
  return steps[index + 1].id;
}

export function getPreviousStepId(id: string, language: Language): string | null {
  const steps = getProfileSteps(language);
  const index = steps.findIndex((step) => step.id === id);
  if (index <= 0) return null;
  return steps[index - 1].id;
}
