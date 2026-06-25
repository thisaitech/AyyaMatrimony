export const BIODATA_WIZARD_COMPLETE_KEY = 'biodataWizardComplete';

export function hasSavedBiodata(values: Record<string, string>): boolean {
  return Boolean(
    values.dateOfBirth?.trim() &&
      (values.fatherName?.trim() || values.motherName?.trim()),
  );
}

export function hasCompletedProfile(values: Record<string, string>): boolean {
  const hasName = Boolean(values.fullName?.trim());
  const hasGender = values.gender === 'male' || values.gender === 'female';
  const hasCommunity = Boolean(values.registrationCommunity?.trim());
  const hasDateOfBirth = Boolean(values.dateOfBirth?.trim());
  const wizardCompleted = values[BIODATA_WIZARD_COMPLETE_KEY]?.trim().toLowerCase() === 'true';
  const hasPublishedListing = Boolean(values.memberListingId?.trim());

  if (!hasName || !hasGender || !hasCommunity || !hasDateOfBirth) {
    return false;
  }

  return wizardCompleted || hasPublishedListing;
}

/** Normalize biodata before the first Firestore publish (wizard flag is set at save time). */
export function prepareProfileForPublish(values: Record<string, string>): Record<string, string> {
  let next = applyDefaultRegistrationCommunity(values);

  if (!next.registrationCommunity?.trim()) {
    next = { ...next, registrationCommunity: DEFAULT_REGISTRATION_COMMUNITY };
  }

  return {
    ...next,
    [BIODATA_WIZARD_COMPLETE_KEY]: 'true',
  };
}

export const DEFAULT_REGISTRATION_COMMUNITY = 'rc-christian';

const REGISTRATION_RELIGION_VALUES = new Set(['hindu', 'rc-christian', 'csi-christian']);

export function applyDefaultRegistrationCommunity(values: Record<string, string>): Record<string, string> {
  const religion = values.religion?.trim() ?? '';
  const registrationCommunity = values.registrationCommunity?.trim() ?? '';

  if (REGISTRATION_RELIGION_VALUES.has(religion) && !registrationCommunity) {
    return { ...values, registrationCommunity: religion };
  }

  return { ...values };
}

export type AuthRedirectPath = '/' | '/create-profile' | '/(tabs)';

export function getAuthRedirectPath(
  isLoggedIn: boolean,
  values: Record<string, string>,
): AuthRedirectPath {
  if (!isLoggedIn) return '/';
  if (!hasCompletedProfile(values)) return '/create-profile';
  return '/(tabs)';
}