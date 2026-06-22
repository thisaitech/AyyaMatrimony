export function hasSavedBiodata(values: Record<string, string>): boolean {
  return Boolean(
    values.dateOfBirth?.trim() &&
      (values.fatherName?.trim() || values.motherName?.trim()),
  );
}

export function hasCompletedProfile(values: Record<string, string>): boolean {
  const hasName = Boolean(values.fullName?.trim());
  const hasCommunity = Boolean(values.registrationCommunity?.trim());

  if (!hasName || !hasCommunity) {
    return false;
  }

  if (values.gender === 'male' || values.gender === 'female') {
    return true;
  }

  // Returning users who completed biodata before gender was added.
  return hasSavedBiodata(values);
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