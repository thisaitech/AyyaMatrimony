import { getOptionLabel } from '@/constants/formOptions';
import { Language, TranslationKey } from '@/constants/i18n';

export const PROPERTY_OPTION_IDS = [
  'own-house',
  'rental-house',
  'own-land',
  'agricultural-land',
  'residential-plot',
  'commercial-property',
  'car-owner',
  'bike-owner',
  'no-property',
] as const;

export type PropertyOptionId = (typeof PROPERTY_OPTION_IDS)[number];
export type LandUnit = 'cent' | 'acre';

export type PropertySelectionItem = {
  id: PropertyOptionId;
  houseCount?: string;
  landSize?: string;
  landUnit?: LandUnit;
  commercialType?: string;
};

export type PropertySelectionState = {
  selections: PropertySelectionItem[];
};

export const PROPERTY_OPTIONS: { id: PropertyOptionId; labelKey: TranslationKey }[] = [
  { id: 'own-house', labelKey: 'propertyOptionOwnHouse' },
  { id: 'rental-house', labelKey: 'propertyOptionRentalHouse' },
  { id: 'own-land', labelKey: 'propertyOptionOwnLand' },
  { id: 'agricultural-land', labelKey: 'propertyOptionAgriculturalLand' },
  { id: 'residential-plot', labelKey: 'propertyOptionResidentialPlot' },
  { id: 'commercial-property', labelKey: 'propertyOptionCommercialProperty' },
  { id: 'car-owner', labelKey: 'propertyOptionCarOwner' },
  { id: 'bike-owner', labelKey: 'propertyOptionBikeOwner' },
  { id: 'no-property', labelKey: 'propertyOptionNoProperty' },
];

const LAND_OPTION_IDS: PropertyOptionId[] = ['own-land', 'agricultural-land', 'residential-plot'];

export function needsHouseCount(id: PropertyOptionId): boolean {
  return id === 'own-house' || id === 'rental-house' || id === 'car-owner' || id === 'bike-owner';
}

export function needsLandFields(id: PropertyOptionId): boolean {
  return LAND_OPTION_IDS.includes(id);
}

export function needsCommercialType(id: PropertyOptionId): boolean {
  return id === 'commercial-property';
}

export function getPropertyCountLabelKey(id: PropertyOptionId): TranslationKey {
  switch (id) {
    case 'rental-house':
      return 'propertyRentalCount';
    case 'car-owner':
      return 'propertyCarCount';
    case 'bike-owner':
      return 'propertyBikeCount';
    default:
      return 'propertyHouseCount';
  }
}

export function getPropertyCountValidationKey(id: PropertyOptionId): TranslationKey {
  switch (id) {
    case 'rental-house':
      return 'propertyValidationRentalCount';
    case 'car-owner':
      return 'propertyValidationCarCount';
    case 'bike-owner':
      return 'propertyValidationBikeCount';
    default:
      return 'propertyValidationHouseCount';
  }
}

export function isSimplePropertyOption(id: PropertyOptionId): boolean {
  return !needsHouseCount(id) && !needsLandFields(id) && !needsCommercialType(id);
}

export function createEmptyPropertySelectionState(): PropertySelectionState {
  return { selections: [] };
}

function migrateLegacyProperty(
  houseType: string,
  houseCount: string,
): PropertySelectionState {
  if (!houseType || !houseCount) {
    return createEmptyPropertySelectionState();
  }

  const id: PropertyOptionId = houseType === 'rental' ? 'rental-house' : 'own-house';
  return {
    selections: [
      {
        id,
        houseCount: houseCount || undefined,
      },
    ],
  };
}

export function parsePropertyDetails(
  raw: string,
  legacyHouseType = '',
  legacyHouseCount = '',
): PropertySelectionState {
  if (!raw.trim()) {
    return migrateLegacyProperty(legacyHouseType, legacyHouseCount);
  }

  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as Partial<PropertySelectionState>;
      if (Array.isArray(parsed.selections)) {
        return {
          selections: parsed.selections
            .filter((item): item is PropertySelectionItem => Boolean(item?.id))
            .map((item) => ({
              id: item.id,
              houseCount: item.houseCount ?? '',
              landSize: item.landSize ?? '',
              landUnit: item.landUnit === 'acre' ? 'acre' : item.landUnit === 'cent' ? 'cent' : undefined,
              commercialType: item.commercialType ?? '',
            })),
        };
      }
    } catch {
      return { selections: [] };
    }
  }

  return { selections: [] };
}

export function serializePropertyDetails(state: PropertySelectionState): string {
  if (!state.selections.length) {
    return '';
  }
  return JSON.stringify(state);
}

function formatHouseCountLabel(count: string, language: Language): string {
  if (!count) {
    return '';
  }
  if (count === '3-plus' || count === '4-plus' || count === '5-plus') {
    return '3+';
  }
  const ownLabel = getOptionLabel('propertyOwnHouseCount', count, language, '');
  if (ownLabel && ownLabel !== '—') {
    return ownLabel;
  }
  return getOptionLabel('propertyHouseCount', count, language, count);
}

function formatLandSuffix(item: PropertySelectionItem, language: Language): string {
  if (!item.landSize?.trim()) {
    return '';
  }
  const unitLabel =
    item.landUnit === 'acre'
      ? language === 'ta'
        ? 'ஏக்கர்'
        : 'Acre'
      : language === 'ta'
        ? 'செண்ட்'
        : 'Cent';
  return `${item.landSize.trim()} ${unitLabel}`;
}

export function formatPropertyDetailsSummary(
  state: PropertySelectionState,
  language: Language,
  translate: (key: TranslationKey) => string,
): string {
  if (!state.selections.length) {
    return '';
  }

  return state.selections
    .map((item) => {
      const option = PROPERTY_OPTIONS.find((entry) => entry.id === item.id);
      const label = option ? translate(option.labelKey) : item.id;

      if (needsHouseCount(item.id) && item.houseCount) {
        return `${label} (${formatHouseCountLabel(item.houseCount, language)})`;
      }

      if (needsLandFields(item.id)) {
        const landSuffix = formatLandSuffix(item, language);
        return landSuffix ? `${label} (${landSuffix})` : label;
      }

      if (needsCommercialType(item.id) && item.commercialType) {
        const typeLabel = getOptionLabel('propertyType', item.commercialType, language, item.commercialType);
        return typeLabel && typeLabel !== '—' ? `${label} (${typeLabel})` : label;
      }

      return label;
    })
    .join(' • ');
}

export function validatePropertySelections(
  state: PropertySelectionState,
  translate: (key: TranslationKey) => string,
): string | null {
  if (!state.selections.length) {
    return null;
  }

  for (const item of state.selections) {
    if (needsHouseCount(item.id) && !item.houseCount) {
      return translate(getPropertyCountValidationKey(item.id));
    }
    if (needsLandFields(item.id) && (!item.landSize?.trim() || !item.landUnit)) {
      return translate('propertyValidationLandSize');
    }
    if (needsCommercialType(item.id) && !item.commercialType) {
      return translate('propertyValidationCommercialType');
    }
  }

  return null;
}

export function getPropertyDisplayValue(
  raw: string,
  language: Language,
  translate: (key: TranslationKey) => string,
  legacyHouseType = '',
  legacyHouseCount = '',
): string {
  const state = parsePropertyDetails(raw, legacyHouseType, legacyHouseCount);
  const summary = formatPropertyDetailsSummary(state, language, translate);
  if (summary) {
    return summary;
  }
  if (raw.trim() && !raw.trim().startsWith('{')) {
    return raw.trim();
  }
  return '';
}

// Legacy helpers kept for any remaining imports
export type PropertyHouseType = 'own' | 'rental' | '';

export function formatPropertySummary(
  houseType: PropertyHouseType,
  houseCount: string,
  language: Language,
): string {
  if (!houseType || !houseCount) {
    return '';
  }
  const state = migrateLegacyProperty(houseType, houseCount);
  return formatPropertyDetailsSummary(state, language, (key) => key as string);
}

export function isPropertyEntryComplete(houseType: PropertyHouseType, houseCount: string): boolean {
  return Boolean(houseType && houseCount);
}
