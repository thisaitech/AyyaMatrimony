import AsyncStorage from '@react-native-async-storage/async-storage';
import { MemberProfile, getMemberProfileById } from '@/constants/images';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { getMockMemberBiodata } from '@/constants/memberBiodata';
import { filterByRecommendedGender, resolveUserGender, type MatchGender } from '@/constants/matchFilters';
import { parseProfilePhotos, PROFILE_PHOTOS_KEY, isRemotePhotoUri, serializeProfilePhotos } from '@/constants/profilePhotos';
import { hasCompletedProfile } from '@/constants/profileCompletion';
import { matchesRegistrationCommunity } from '@/constants/registrationCommunities';
import {
  listPublishedProfiles,
  publishedMemberFromProfileDoc,
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

function listingIdFromValues(values: Record<string, string>): string {
  const registration = values.registrationNumber?.trim();
  if (registration) {
    return registration.replace(/\s+/g, '-').toLowerCase();
  }
  return `member-${Date.now()}`;
}

function memberFromValues(values: Record<string, string>, id: string): MemberProfile {
  const remotePhotos = values.profilePhotoUrls?.split('|').filter(isRemotePhotoUri) ?? [];
  const localPhotos = parseProfilePhotos(values[PROFILE_PHOTOS_KEY] ?? values.profilePhotos ?? '');
  const image =
    remotePhotos[0] ??
    localPhotos.find((photo) => isRemotePhotoUri(photo)) ??
    localPhotos.find(Boolean) ??
    '';
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
  try {
    const remoteProfiles = await listPublishedProfiles();
    if (remoteProfiles.length > 0) {
      const published = remoteProfiles.map(publishedMemberFromProfileDoc);
      const stored: StoredDirectory[] = published.map((entry) => ({
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
      }));
      await AsyncStorage.setItem(MEMBER_DIRECTORY_KEY, JSON.stringify(stored));
      return published;
    }
  } catch {
    // Fall back to local cache when Firestore is unavailable.
  }

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
): Promise<PublishedMember | null> {
  if (!hasCompletedProfile(values)) {
    return null;
  }

  const id = listingIdFromValues(values);
  const member = memberFromValues(values, id);
  const biodata = { ...values, memberListingId: id };
  const nextEntry: StoredDirectory = {
    ownerKey,
    member,
    biodata,
  };

  const existing = await readPublishedMembers();
  const withoutOwner = existing.filter((entry) => entry.ownerKey !== ownerKey);
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
    approvalStatus: ownerKey.startsWith('admin-') ? 'approved' : 'pending',
  };

  const remoteProfile = await upsertProfileFromValues(biodataWithApproval, ownerKey, {
    published: true,
    uploadPhotos: true,
  });

  const syncedBiodata = remoteProfile
    ? {
        ...biodataWithApproval,
        approvalStatus: remoteProfile.approvalStatus ?? biodataWithApproval.approvalStatus,
        profilePhotoUrls: (remoteProfile.photoUrls ?? []).join('|'),
        [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(remoteProfile.photoUrls ?? []),
      }
    : biodataWithApproval;

  await AsyncStorage.setItem('user_profile', JSON.stringify(syncedBiodata));

  const phone = biodata[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
  if (phone && !ownerKey.startsWith('admin-')) {
    await upsertSubscription(phone, { accessMode: 'unpaid', batchesPaid: 0 }).catch(() => undefined);
  }

  return { ...member, biodata: syncedBiodata, ownerKey };
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
  const biodataCommunity = publishedEntry?.biodata?.registrationCommunity?.trim() ?? '';
  if (biodataCommunity) {
    return biodataCommunity;
  }

  const biodata = getMemberBiodataValues(memberId, published);
  return biodata?.registrationCommunity?.trim() ?? '';
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
