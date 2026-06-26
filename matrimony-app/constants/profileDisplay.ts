import { ImageSourcePropType, Platform } from 'react-native';
import { getOptionLabel } from '@/constants/formOptions';
import { Language } from '@/constants/i18n';
import { images } from '@/constants/images';
import {
  firstDisplayablePhotoUri,
  mergeEditableProfilePhotos,
  parseApprovedProfilePhotoUrls,
  parseProfilePhotos,
  parseRemotePhotoUrls,
  PROFILE_PHOTOS_DRAFT_KEY,
  PROFILE_PHOTOS_KEY,
  resolveDisplayPhotoUri,
} from '@/constants/profilePhotos';

const displayPlatform = Platform.OS === 'web' ? 'web' : 'native';

export function getProfileFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function getProfileAvatarUri(
  values: Record<string, string>,
  options: { includePendingUploads?: boolean } = {},
): string {
  const approvedPhotos = parseApprovedProfilePhotoUrls(values.approvedProfilePhotoUrls);
  const approvedUri = firstDisplayablePhotoUri(approvedPhotos, displayPlatform);
  if (approvedUri) {
    return approvedUri;
  }

  if (!options.includePendingUploads) {
    const listingImage = resolveDisplayPhotoUri(values.listingImage ?? '', displayPlatform);
    return listingImage;
  }

  const uploadedPhotos = parseRemotePhotoUrls(values.profilePhotoUrls);
  for (let index = 0; index < uploadedPhotos.length; index += 1) {
    const uploaded = uploadedPhotos[index]?.trim() ?? '';
    const approved = approvedPhotos[index]?.trim() ?? '';
    if (uploaded && uploaded !== approved) {
      const resolved = resolveDisplayPhotoUri(uploaded, displayPlatform);
      if (resolved) {
        return resolved;
      }
    }
  }

  const editablePhotos = mergeEditableProfilePhotos(
    values[PROFILE_PHOTOS_DRAFT_KEY] ?? '',
    values[PROFILE_PHOTOS_KEY] ?? '',
    values.profilePhotoUrls ?? '',
  );
  const draftUri = firstDisplayablePhotoUri(editablePhotos, displayPlatform);
  if (draftUri) {
    return draftUri;
  }

  return resolveDisplayPhotoUri(values.listingImage ?? '', displayPlatform);
}

export function hasPendingProfilePhoto(values: Record<string, string>): boolean {
  const approvedPhotos = parseApprovedProfilePhotoUrls(values.approvedProfilePhotoUrls);
  const uploadedPhotos = parseRemotePhotoUrls(values.profilePhotoUrls);
  const hasPendingRemote = uploadedPhotos.some((uploaded, index) => {
    const normalized = uploaded?.trim() ?? '';
    const approved = approvedPhotos[index]?.trim() ?? '';
    return Boolean(normalized) && normalized !== approved;
  });
  if (hasPendingRemote) {
    return true;
  }

  const editablePhotos = mergeEditableProfilePhotos(
    values[PROFILE_PHOTOS_DRAFT_KEY] ?? '',
    values[PROFILE_PHOTOS_KEY] ?? '',
    values.profilePhotoUrls ?? '',
  );
  return editablePhotos.some((photo, index) => {
    const normalized = photo?.trim() ?? '';
    if (!normalized) {
      return false;
    }
    const approved = approvedPhotos[index]?.trim() ?? '';
    return normalized !== approved;
  });
}

export function getProfileAvatarSource(
  values: Record<string, string>,
  options: { includePendingUploads?: boolean } = {},
): ImageSourcePropType {
  const uri = getProfileAvatarUri(values, options);
  return uri ? { uri } : images.logo;
}

export function getProfileMetaLine(values: Record<string, string>, language: Language): string {
  const locationParts = [
    values.nativeDistrict
      ? getOptionLabel('district', values.nativeDistrict, language)
      : values.nativePlace?.trim(),
    values.nativeState ? getOptionLabel('indianState', values.nativeState, language) : '',
  ].filter(Boolean);

  const community = values.caste
    ? getOptionLabel('community', values.caste, language)
    : values.subCaste
      ? getOptionLabel('subCaste', values.subCaste, language)
      : '';

  if (locationParts.length > 0 && community) {
    return `${locationParts.join(', ')} • ${community}`;
  }

  return locationParts.join(', ') || community;
}

export function getProfileCompletionPercent(values: Record<string, string>): number {
  if (values.fullName?.trim() && values.partnerPreferredLocation) {
    return 100;
  }

  const trackedKeys = [
    'profileFor',
    'fullName',
    'gender',
    'religion',
    'caste',
    'dateOfBirth',
    'maritalStatus',
    'education',
    'occupation',
    'workType',
    'monthlyIncome',
    'nativePlace',
    'nativeDistrict',
    'nativeState',
    'partnerAgeFrom',
    'partnerAgeTo',
    'partnerEducation',
    'partnerPreferredLocation',
    PROFILE_PHOTOS_KEY,
  ];

  const filledCount = trackedKeys.filter((key) => Boolean(values[key]?.trim())).length;
  return Math.min(100, Math.round((filledCount / trackedKeys.length) * 100));
}
