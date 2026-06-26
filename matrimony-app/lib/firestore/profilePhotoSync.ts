import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { hasCompletedProfile } from '@/constants/profileCompletion';
import {
  APPROVED_PROFILE_PHOTO_URLS_KEY,
  isLocalPhotoUri,
  isRemotePhotoUri,
  mergeUploadedPhotos,
  PROFILE_PHOTOS_DRAFT_KEY,
  PROFILE_PHOTOS_KEY,
  parseApprovedProfilePhotoUrls,
  resolvePortableListingPhotoUri,
  serializeProfilePhotos,
  serializeRemotePhotoUrls,
} from '@/constants/profilePhotos';
import {
  syncUploadedPhotosToProfile,
  upsertPartialProfilePhotos,
  upsertProfileFromValues,
} from '@/lib/firestore/profileService';
import {
  markCloudPhotoUploadUnavailable,
  shouldAttemptCloudPhotoUpload,
  uploadProfilePhotos,
} from '@/lib/firestore/storageService';

const PROFILE_STORAGE_KEY = 'user_profile';

export type ProfilePhotoSyncCallbacks = {
  setValue: (key: string, value: string) => void;
  getPhone: () => string;
  getMemberName: () => string;
  getProfileValues: () => Record<string, string>;
};

export type ProfilePhotoSyncResult = {
  photos: string[];
  uploaded: boolean;
  error?: 'no_phone' | 'upload_failed' | 'no_cloud' | 'no_remote_urls';
};

export async function uploadAndSyncProfilePhotosForApproval(
  nextPhotos: string[],
  options: {
    ownerKey?: string;
  } & ProfilePhotoSyncCallbacks,
): Promise<ProfilePhotoSyncResult> {
  const phone = options.getPhone().replace(/\D/g, '');
  if (!phone) {
    return { photos: nextPhotos, uploaded: false, error: 'no_phone' };
  }

  const hasLocalPhoto = nextPhotos.some(isLocalPhotoUri);
  if (!hasLocalPhoto) {
    return { photos: nextPhotos, uploaded: false };
  }

  if (!shouldAttemptCloudPhotoUpload()) {
    return { photos: nextPhotos, uploaded: false, error: 'no_cloud' };
  }

  const ownerKey = options.ownerKey ?? 'current-user';
  const autoApprove = ownerKey.startsWith('admin-');

  try {
    const uploaded = await uploadProfilePhotos(phone, nextPhotos);
    const mergedPhotos = mergeUploadedPhotos(nextPhotos, uploaded);
    const remoteUrls = serializeRemotePhotoUrls(mergedPhotos);
    if (!remoteUrls) {
      throw new Error('Cloud upload returned no photo URLs.');
    }

    const preservedApproved = serializeRemotePhotoUrls(
      parseApprovedProfilePhotoUrls(options.getProfileValues()[APPROVED_PROFILE_PHOTO_URLS_KEY]),
    );

    options.setValue(PROFILE_PHOTOS_KEY, serializeProfilePhotos(autoApprove ? mergedPhotos : []));
    options.setValue(PROFILE_PHOTOS_DRAFT_KEY, '');
    options.setValue('profilePhotoUrls', remoteUrls);
    if (autoApprove) {
      options.setValue(APPROVED_PROFILE_PHOTO_URLS_KEY, remoteUrls);
      options.setValue('listingImage', resolvePortableListingPhotoUri(mergedPhotos));
    } else if (!preservedApproved) {
      options.setValue(APPROVED_PROFILE_PHOTO_URLS_KEY, '');
      options.setValue('listingImage', '');
    }

    const currentValues = {
      ...options.getProfileValues(),
      [CONTACT_PHONE_KEY]: phone,
      [PROFILE_PHOTOS_KEY]: serializeProfilePhotos(autoApprove ? mergedPhotos : []),
      [PROFILE_PHOTOS_DRAFT_KEY]: '',
      profilePhotoUrls: remoteUrls,
      ...(autoApprove
        ? {
            [APPROVED_PROFILE_PHOTO_URLS_KEY]: remoteUrls,
            listingImage: resolvePortableListingPhotoUri(mergedPhotos),
          }
        : {
            [APPROVED_PROFILE_PHOTO_URLS_KEY]: preservedApproved,
          }),
      fullName: options.getMemberName() || options.getProfileValues().fullName,
    };

    await syncUploadedPhotosToProfile(currentValues, ownerKey);

    const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    let storedValues: Record<string, string> = currentValues;
    if (raw) {
      try {
        storedValues = { ...(JSON.parse(raw) as Record<string, string>), ...currentValues };
      } catch {
        storedValues = currentValues;
      }
    }

    if (hasCompletedProfile(storedValues)) {
      await upsertProfileFromValues(storedValues, ownerKey, {
        published: true,
        uploadPhotos: false,
        autoApprovePhotos: autoApprove,
      });
    } else {
      await upsertPartialProfilePhotos(storedValues, ownerKey).catch(() => undefined);
    }

    return { photos: mergedPhotos, uploaded: true };
  } catch {
    markCloudPhotoUploadUnavailable();
    return { photos: nextPhotos, uploaded: false, error: 'upload_failed' };
  }
}
