import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { MemberProfile, getMemberProfileById } from '@/constants/images';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { getMockMemberBiodata } from '@/constants/memberBiodata';
import { filterByRecommendedGender, resolveUserGender, type MatchGender } from '@/constants/matchFilters';
import { PROFILE_PHOTOS_KEY, parseApprovedProfilePhotoUrls, resolveDisplayPhotoUri, resolvePortableListingPhotoUri, serializePersistablePhotoUrls, serializeProfilePhotos } from '@/constants/profilePhotos';
import { hasCompletedProfile, applyDefaultRegistrationCommunity, prepareProfileForPublish } from '@/constants/profileCompletion';
import { matchesRegistrationCommunity, normalizeRegistrationCommunity } from '@/constants/registrationCommunities';
import {
  listPublishedProfiles,
  publishedMemberFromProfileDoc,
  resolveProfilePhoneForStorage,
  upsertProfileFromValues,
} from '@/lib/firestore/profileService';
import { upsertSubscription } from '@/lib/firestore/subscriptionService';

const MEMBER_DIRECTORY_KEY = 'member_directory';

export type PublishedMember = MemberProfile & {
  biodata: Record<string, string>;
  ownerKey: string;
};

type StoredDirectory = {
  ownerKey: string;
  member: MemberProfile;
  biodata: Record<string, string>;
};

function publishedMemberKey(entry: PublishedMember): string {
  const phone =
    entry.biodata?.[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ||
    entry.biodata?.phoneNumber?.replace(/\D/g, '') ||
    entry.phoneNumber?.replace(/\D/g, '') ||
    '';
  return phone || entry.id;
}

function mergePublishedMemberLists(
  local: PublishedMember[],
  remote: PublishedMember[],
): PublishedMember[] {
  const byKey = new Map<string, PublishedMember>();
  for (const entry of local) {
    byKey.set(publishedMemberKey(entry), entry);
  }
  for (const entry of remote) {
    byKey.set(publishedMemberKey(entry), entry);
  }
  return Array.from(byKey.values());
}

function toStoredDirectory(entry: PublishedMember): StoredDirectory {
  return {
    ownerKey: entry.ownerKey,
    member: {
      id: entry.id,
      name: entry.name,
      age: entry.age,
      community: entry.community,
      location: entry.location,
      image: entry.image,
      gender: entry.gender,
      badge: entry.badge,
      verified: entry.verified,
      phoneNumber: entry.phoneNumber,
      whatsappNumber: entry.whatsappNumber,
      facebookProfile: entry.facebookProfile,
      instagramProfile: entry.instagramProfile,
      interestStatus: entry.interestStatus,
    },
    biodata: entry.biodata,
  };
}

async function readLocalPublishedMembers(): Promise<PublishedMember[]> {
  const raw = await AsyncStorage.getItem(MEMBER_DIRECTORY_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredDirectory[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((entry) => ({
      ...entry.member,
      biodata: entry.biodata,
      ownerKey: entry.ownerKey,
    }));
  } catch {
    return [];
  }
}

function listingIdFromValues(values: Record<string, string>): string {
  const registration = values.registrationNumber?.trim();
  if (registration) {
    return registration.replace(/\s+/g, '-').toLowerCase();
  }
  return `member-${Date.now()}`;
}

function memberFromValues(values: Record<string, string>, id: string): MemberProfile {
  const approvedPhotos = parseApprovedProfilePhotoUrls(values.approvedProfilePhotoUrls);
  const portableImage = resolvePortableListingPhotoUri(approvedPhotos);
  const image = resolveDisplayPhotoUri(portableImage, Platform.OS === 'web' ? 'web' : 'native');
  const heightLabel = values.height ? values.height.replace('ft', "'") : '';
  const ageYear = values.dateOfBirth?.match(/(\d{4})/)?.[1];
  const age = ageYear
    ? `${new Date().getFullYear() - Number(ageYear)} Years${heightLabel ? `, ${heightLabel}` : ''}`
    : '—';

  return {
    id,
    name: values.fullName?.trim() || 'Member',
    age,
    community: values.caste?.trim() || values.registrationCommunity || '—',
    location: values.nativePlace?.trim() || values.irupidam?.trim() || 'Tamil Nadu',
    image,
    gender: (values.gender === 'female' || values.gender === 'male'
      ? values.gender
      : '') as MatchGender,
    phoneNumber: values.phoneNumber?.trim() || '—',
    interestStatus: 'none',
    verified: true,
  };
}

export async function readPublishedMembers(): Promise<PublishedMember[]> {
  const local = await readLocalPublishedMembers();

  try {
    const remoteProfiles = await listPublishedProfiles();
    const remote = remoteProfiles.map(publishedMemberFromProfileDoc);

    const merged = remote.length > 0
      ? local.length > 0
        ? mergePublishedMemberLists(local, remote)
        : remote
      : local;

    if (remote.length > 0) {
      await AsyncStorage.setItem(
        MEMBER_DIRECTORY_KEY,
        JSON.stringify(merged.map(toStoredDirectory)),
      );
    }

    return merged;
  } catch {
    return local;
  }
}

export async function publishCurrentUserFromStorage(ownerKey = 'current-user'): Promise<PublishedMember | null> {
  const raw = await AsyncStorage.getItem('user_profile');
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return publishProfileFromValues(parsed, ownerKey);
  } catch {
    return null;
  }
}

export async function publishProfileFromValues(
  values: Record<string, string>,
  ownerKey = 'current-user',
  options: { autoApprovePhotos?: boolean } = {},
): Promise<PublishedMember | null> {
  const preparedValues = resolveProfilePhoneForStorage(
    prepareProfileForPublish(values),
    ownerKey,
  );
  if (!hasCompletedProfile(preparedValues)) {
    return null;
  }

  const resolvedOwnerKey = ownerKey.startsWith('admin-')
    ? `admin-${preparedValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') || ownerKey.replace(/^admin-/, '')}`
    : ownerKey;

  const id = listingIdFromValues(preparedValues);
  const member = memberFromValues(preparedValues, id);
  const biodata = { ...preparedValues, memberListingId: id };
  const nextEntry: StoredDirectory = {
    ownerKey: resolvedOwnerKey,
    member,
    biodata,
  };

  const existing = await readPublishedMembers();
  const publishedPhone = preparedValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
  const withoutOwner = existing.filter((entry) => {
    if (entry.ownerKey === resolvedOwnerKey) {
      return false;
    }
    const entryPhone =
      entry.biodata?.[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ||
      entry.phoneNumber?.replace(/\D/g, '') ||
      '';
    return !publishedPhone || entryPhone !== publishedPhone;
  });
  const stored: StoredDirectory[] = [
    ...withoutOwner.map((entry) => ({
      ownerKey: entry.ownerKey,
      member: {
        id: entry.id,
        name: entry.name,
        age: entry.age,
        community: entry.community,
        location: entry.location,
        image: entry.image,
        gender: entry.gender,
        badge: entry.badge,
        verified: entry.verified,
        phoneNumber: entry.phoneNumber,
        whatsappNumber: entry.whatsappNumber,
        facebookProfile: entry.facebookProfile,
        instagramProfile: entry.instagramProfile,
        interestStatus: entry.interestStatus,
      },
      biodata: entry.biodata,
    })),
    nextEntry,
  ];

  await AsyncStorage.setItem(MEMBER_DIRECTORY_KEY, JSON.stringify(stored));

  const biodataWithApproval = {
    ...biodata,
    approvalStatus: resolvedOwnerKey.startsWith('admin-') ? 'approved' : 'pending',
  };

  const remoteProfile = await upsertProfileFromValues(biodataWithApproval, resolvedOwnerKey, {
    published: true,
    uploadPhotos: true,
    autoApprovePhotos: options.autoApprovePhotos ?? resolvedOwnerKey.startsWith('admin-'),
  }).catch(() => null);

  const syncedBiodata = remoteProfile
    ? {
        ...biodataWithApproval,
        approvalStatus: remoteProfile.approvalStatus ?? biodataWithApproval.approvalStatus,
        profilePhotoUrls: serializePersistablePhotoUrls(remoteProfile.photoUrls ?? []),
        approvedProfilePhotoUrls: serializePersistablePhotoUrls(remoteProfile.approvedPhotoUrls ?? []),
        [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(
          resolvedOwnerKey.startsWith('admin-')
            ? (remoteProfile.photoUrls ?? [])
            : (remoteProfile.approvedPhotoUrls ?? []),
        ),
        listingImage: resolvePortableListingPhotoUri(
          resolvedOwnerKey.startsWith('admin-')
            ? (remoteProfile.photoUrls ?? [])
            : (remoteProfile.approvedPhotoUrls ?? []),
        ),
        _profileUpdatedAt: String(remoteProfile.updatedAt ?? Date.now()),
      }
    : {
        ...biodataWithApproval,
        _profileUpdatedAt: String(Date.now()),
      };

  await AsyncStorage.setItem('user_profile', JSON.stringify(syncedBiodata));

  const phone = biodata[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
  if (phone && !resolvedOwnerKey.startsWith('admin-')) {
    await upsertSubscription(phone, { accessMode: 'unpaid', batchesPaid: 0 }).catch(() => undefined);
  }

  return { ...member, biodata: syncedBiodata, ownerKey: resolvedOwnerKey };
}

export function getStaticMemberListing(id: string): MemberProfile | undefined {
  return getMemberProfileById(id);
}

export function resolveMemberListing(
  id: string,
  published: PublishedMember[] = [],
): MemberProfile | undefined {
  const publishedEntry = published.find((entry) => entry.id === id);
  if (publishedEntry) {
    const { biodata: _biodata, ownerKey: _ownerKey, ...member } = publishedEntry;
    return member;
  }

  return getMemberProfileById(id);
}

export function getMemberBiodataValues(
  id: string,
  published: PublishedMember[] = [],
): Record<string, string> | undefined {
  const publishedEntry = published.find((entry) => entry.id === id);
  if (publishedEntry) {
    return publishedEntry.biodata;
  }

  return getMockMemberBiodata(id);
}

export function getAllBrowsableMembers(
  published: PublishedMember[],
  excludeOwnerKey = 'current-user',
): MemberProfile[] {
  return published
    .filter((entry) => entry.ownerKey !== excludeOwnerKey)
    .map(({ biodata: _biodata, ownerKey: _ownerKey, ...member }) => member);
}

export function getMemberRegistrationCommunity(
  memberId: string,
  published: PublishedMember[] = [],
): string {
  const publishedEntry = published.find((entry) => entry.id === memberId);
  if (publishedEntry?.biodata) {
    const community = applyDefaultRegistrationCommunity(publishedEntry.biodata).registrationCommunity?.trim() ?? '';
    if (community) {
      return community;
    }
  }

  if (publishedEntry) {
    const listingCommunity = publishedEntry.community?.trim() ?? '';
    const normalizedListing = normalizeRegistrationCommunity(listingCommunity);
    if (normalizedListing) {
      return normalizedListing;
    }
  }

  const biodata = getMemberBiodataValues(memberId, published);
  return applyDefaultRegistrationCommunity(biodata ?? {}).registrationCommunity?.trim() ?? '';
}

export function getBrowsableMembersForUser(
  published: PublishedMember[],
  userValues: Pick<Record<string, string>, 'registrationCommunity' | 'gender'>,
  excludeOwnerKey = 'current-user',
  canBrowse = true,
  hiddenProfileIds: string[] = [],
): MemberProfile[] {
  if (!canBrowse) {
    return [];
  }

  const userCommunity = userValues.registrationCommunity?.trim() ?? '';
  const userGender = resolveUserGender(userValues as Record<string, string>);

  if (!userCommunity || !userGender) {
    return [];
  }

  const hidden = new Set(hiddenProfileIds);
  const members = getAllBrowsableMembers(published, excludeOwnerKey).filter(
    (member) => !hidden.has(member.id),
  );
  const byGender = filterByRecommendedGender(members, userGender);

  return byGender.filter((member) =>
    matchesRegistrationCommunity(
      getMemberRegistrationCommunity(member.id, published),
      userCommunity,
    ),
  );
}
