export type PropertyEntry = {
  id: string;
  propertyType: string;
  location: string;
  ownershipStatus: string;
  estimatedValue: string;
  monthlyRentalIncome: string;
};

export const PROPERTIES_FORM_KEY = 'properties';

export function createEmptyProperty(): PropertyEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    propertyType: '',
    location: '',
    ownershipStatus: '',
    estimatedValue: '',
    monthlyRentalIncome: '',
  };
}

export function parseProperties(raw: string): PropertyEntry[] {
  if (!raw) {
    return [createEmptyProperty()];
  }

  try {
    const parsed = JSON.parse(raw) as PropertyEntry[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((entry) => ({
        ...createEmptyProperty(),
        ...entry,
        id: entry.id || createEmptyProperty().id,
      }));
    }
  } catch {
    // Fall back to a fresh property form.
  }

  return [createEmptyProperty()];
}

export function isPropertyComplete(property: PropertyEntry): boolean {
  return Boolean(
    property.propertyType &&
      property.location.trim() &&
      property.ownershipStatus &&
      property.estimatedValue,
  );
}

export function arePropertiesComplete(properties: PropertyEntry[]): boolean {
  return properties.length > 0 && properties.every(isPropertyComplete);
}
