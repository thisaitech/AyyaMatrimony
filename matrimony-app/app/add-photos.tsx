import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import {
  getPhotoUploadStepLabels,
  ProfilePhotoUploadStep,
} from '@/components/ProfilePhotoUploadStep';
import {
  isLocalPhotoUri,
  mergeDraftProfilePhotos,
  mergeUploadedPhotos,
  parseProfilePhotos,
  PHOTO_SKIP_KEY,
  PROFILE_PHOTOS_DRAFT_KEY,
  PROFILE_PHOTOS_KEY,
  serializeProfilePhotos,
  serializeRemotePhotoUrls,
} from '@/constants/profilePhotos';
import { colors, spacing, typography } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import {
  markCloudPhotoUploadUnavailable,
  resetCloudPhotoUploadAvailability,
  shouldAttemptCloudPhotoUpload,
  uploadProfilePhotos,
} from '@/lib/firestore/storageService';
import { upsertProfileFromValues } from '@/lib/firestore/profileService';
import { queueUploadedPhotosForApproval } from '@/lib/firestore/photoApprovalService';
import { getFirebaseFirestore, getFirebaseStorage } from '@/lib/firebase';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { hasCompletedProfile } from '@/constants/profileCompletion';

const PROFILE_STORAGE_KEY = 'user_profile';

function hasSavedLocalPhotos(photos: string[]): boolean {
  return photos.some((photo) => photo.trim().length > 0);
}

export default function AddPhotosScreen() {
  const router = useRouter();
  const { language, translate } = useLanguage();
  const { getValue, setValue, isReady } = useProfileForm();
  const [photos, setPhotos] = useState<string[]>(() => parseProfilePhotos(''));
  const [skipped, setSkipped] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');
  const hydratedRef = useRef(false);
  const uploadVersionRef = useRef(0);

  useEffect(() => {
    resetCloudPhotoUploadAvailability();
    void getFirebaseFirestore();
    void getFirebaseStorage();
  }, []);

  useEffect(() => {
    if (!isReady || hydratedRef.current) {
      return;
    }

    hydratedRef.current = true;
    setPhotos(
      mergeDraftProfilePhotos(
        getValue(PROFILE_PHOTOS_DRAFT_KEY),
        getValue(PROFILE_PHOTOS_KEY),
      ),
    );
    setSkipped(getValue(PHOTO_SKIP_KEY) === 'true');
  }, [getValue, isReady]);

  const handlePhotosChange = useCallback(
    (nextPhotos: string[]) => {
      const serialized = serializeProfilePhotos(nextPhotos);
      setPhotos(nextPhotos);
      setSkipped(false);
      setUploadError('');
      setUploadNotice('');
      setValue(PHOTO_SKIP_KEY, 'false');
      setValue(PROFILE_PHOTOS_DRAFT_KEY, serialized);
      setValue(PROFILE_PHOTOS_KEY, serialized);

      if (!hasSavedLocalPhotos(nextPhotos)) {
        setUploading(false);
        return;
      }

      const hasLocalPhoto = nextPhotos.some(isLocalPhotoUri);
      if (!hasLocalPhoto) {
        setUploadNotice(translate('photoAdded'));
        setUploading(false);
        return;
      }

      const phone = getValue(CONTACT_PHONE_KEY).replace(/\D/g, '');
      if (!phone) {
        setUploadNotice(translate('photoSavedLocally'));
        return;
      }

      if (!shouldAttemptCloudPhotoUpload()) {
        setUploadNotice(translate('photoAdded'));
        return;
      }

      const uploadVersion = uploadVersionRef.current + 1;
      uploadVersionRef.current = uploadVersion;
      setUploading(true);

      void (async () => {
        let mergedPhotos = nextPhotos;
        let mergedSerialized = serialized;
        let remoteUrls = '';
        let cloudUploadSucceeded = false;

        try {
          await getFirebaseFirestore();
          await getFirebaseStorage();
          const uploaded = await uploadProfilePhotos(phone, nextPhotos);
          if (uploadVersionRef.current !== uploadVersion) {
            return;
          }

          mergedPhotos = mergeUploadedPhotos(nextPhotos, uploaded);
          remoteUrls = serializeRemotePhotoUrls(mergedPhotos);
          if (!remoteUrls) {
            throw new Error('Cloud upload returned no photo URLs.');
          }

          mergedSerialized = serializeProfilePhotos(mergedPhotos);
          cloudUploadSucceeded = true;

          setPhotos(mergedPhotos);
          setValue(PROFILE_PHOTOS_KEY, mergedSerialized);
          setValue(PROFILE_PHOTOS_DRAFT_KEY, '');
          setValue('profilePhotoUrls', remoteUrls);
          setValue('listingImage', '');
          setUploadNotice(translate('photoPendingReview'));
        } catch {
          if (uploadVersionRef.current !== uploadVersion) {
            return;
          }

          markCloudPhotoUploadUnavailable();

          if (hasSavedLocalPhotos(nextPhotos)) {
            setUploadNotice(translate('photoSavedLocally'));
          } else {
            setUploadError(translate('photoUploadFailed'));
          }
        } finally {
          if (uploadVersionRef.current === uploadVersion) {
            setUploading(false);
          }
        }

        if (uploadVersionRef.current !== uploadVersion || !cloudUploadSucceeded) {
          return;
        }

        try {
          const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
          let currentValues: Record<string, string> = {};
          if (raw) {
            try {
              currentValues = JSON.parse(raw) as Record<string, string>;
            } catch {
              currentValues = {};
            }
          }

          const nextValues = {
            ...currentValues,
            [PROFILE_PHOTOS_KEY]: mergedSerialized,
            [PROFILE_PHOTOS_DRAFT_KEY]: '',
            profilePhotoUrls: remoteUrls,
            [CONTACT_PHONE_KEY]: phone,
          };

          try {
            await queueUploadedPhotosForApproval(phone, mergedPhotos, {
              memberName: nextValues.fullName || currentValues.fullName,
              autoApprove: false,
            });
          } catch {
            // Approval queue can retry on next profile sync.
          }

          if (hasCompletedProfile(nextValues)) {
            await upsertProfileFromValues(nextValues, 'current-user', {
              published: true,
              uploadPhotos: true,
              autoApprovePhotos: false,
            }).catch(() => undefined);
          }
        } catch {
          // Local photos are already saved; cloud profile sync can retry later.
        }
      })();
    },
    [getValue, setValue, translate],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <AppHeader
        title={translate('addPhotos')}
        showBack
        showTamil={false}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.hint}>{translate('addPhotosHint')}</Text>
        {uploading ? (
          <View style={styles.uploadRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadText}>{translate('photoUploading')}</Text>
          </View>
        ) : null}
        {uploadNotice ? <Text style={styles.noticeText}>{uploadNotice}</Text> : null}
        {uploadError ? <Text style={styles.errorText}>{uploadError}</Text> : null}
        <ProfilePhotoUploadStep
          photos={photos}
          skipped={skipped}
          language={language}
          labels={getPhotoUploadStepLabels(language)}
          onChange={handlePhotosChange}
          onSkip={() => router.back()}
          openLibraryOnMount
          libraryOnly
          showSkip={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingTop: 72,
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  hint: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  uploadText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  noticeText: {
    ...typography.bodyMd,
    color: colors.primary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
});
