export type RegistrationCommunityId = 'hindu' | 'rc-christian' | 'csi-christian';

export type RegistrationCommunityOption = {
  id: RegistrationCommunityId;
  religion: 'hindu' | 'christian';
  labelKey: string;
};

export const REGISTRATION_COMMUNITIES: RegistrationCommunityOption[] = [
  { id: 'hindu', religion: 'hindu', labelKey: 'registerCommunityHindu' },
  { id: 'rc-christian', religion: 'christian', labelKey: 'registerCommunityRcChristian' },
  { id: 'csi-christian', religion: 'christian', labelKey: 'registerCommunityCsiChristian' },
];

export function isChristianRegistration(community: string, religion = ''): boolean {
  if (religion === 'hindu') {
    return false;
  }
  if (religion === 'christian') {
    return true;
  }

  if (community === 'rc-christian' || community === 'csi-christian') {
    return true;
  }

  if (!community && religion === 'christian') {
    return true;
  }

  return false;
}

export function normalizeRegistrationCommunity(community: string): RegistrationCommunityId | '' {
  if (community === 'hindu' || community === 'rc-christian' || community === 'csi-christian') {
    return community;
  }
  return '';
}

export function matchesRegistrationCommunity(
  memberCommunity: string,
  userCommunity: string,
): boolean {
  const normalizedUser = normalizeRegistrationCommunity(userCommunity);
  if (!normalizedUser) {
    return true;
  }

  const normalizedMember = normalizeRegistrationCommunity(memberCommunity);
  if (!normalizedMember) {
    return false;
  }

  return normalizedMember === normalizedUser;
}
