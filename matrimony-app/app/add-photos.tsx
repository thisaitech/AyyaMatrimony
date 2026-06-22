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
  mergeUploadedPhotos,
  parseProfilePhotos,
  PHOTO_SKIP_KEY,
  PROFILE_PHOTOS_KEY,
  serializeProfilePhotos,
  serializeRemotePhotoUrls,
} from '@/constants/profilePhotos';
import { colors, spacing, typography } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import { uploadProfilePhotos } from '@/lib/firestore/storageService';
import { upsertProfileFromValues } from '@/lib/firestore/profileService';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { hasCompletedProfile } from '@/constants/profileCompletion';

const PROFILE_STORAGE_KEY = 'user_profile';

export default function AddPhotosScreen() {
  const router = useRouter();
  const { language, translate } = useLanguage();
  const { getValue, setValue, isReady } = useProfileForm();
  const [photos, setPhotos] = useState<string[]>(() => parseProfilePhotos(''));
  const [skipped, setSkipped] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const hydratedRef = useRef(false);
  const uploadVersionRef = useRef(0);

  useEffect(() => {
    if (!isReady || hydratedRef.current) {
      return;
    }

    hydratedRef.current = true;
    setPhotos(parseProfilePhotos(getValue(PROFILE_PHOTOS_KEY)));
    setSkipped(getValue(PHOTO_SKIP_KEY) === 'true');
  }, [getValue, isReady]);

  const handlePhotosChange = useCallback(
    (nextPhotos: string[]) => {
      setPhotos(nextPhotos);
      setSkipped(false);
      setUploadError('');
      setValue(PHOTO_SKIP_KEY, 'false');
      setValue(PROFILE_PHOTOS_KEY, serializeProfilePhotos(nextPhotos));

      const phone = getValue(CONTACT_PHONE_KEY).replace(/\D/g, '');
      if (!phone) {
        return;
      }

      const uploadVersion = uploadVersionRef.current + 1;
      uploadVersionRef.current = uploadVersion;
      setUploading(true);

      void (async () => {
        try {
          const uploaded = await uploadProfilePhotos(phone, nextPhotos);
          if (uploadVersionRef.current !== uploadVersion) {
            return;
          }

          const mergedPhotos = mergeUploadedPhotos(nextPhotos, uploaded);
          const remoteUrls = serializeRemotePhotoUrls(mergedPhotos);
          const mergedSerialized = serializeProfilePhotos(mergedPhotos);

          setPhotos(mergedPhotos);
          setValue(PROFILE_PHOTOS_KEY, mergedSerialized);
          setValue('profilePhotoUrls', remoteUrls);

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
            profilePhotoUrls: remoteUrls,
            [CONTACT_PHONE_KEY]: phone,
          };

          if (hasCompletedProfile(nextValues)) {
            await upsertProfileFromValues(nextValues, 'current-user', {
              published: true,
              uploadPhotos: false,
            }).catch(() => undefined);
          }
        } catch {
          if (uploadVersionRef.current !== uploadVersion) {
            return;
          }
          // Keep the selected local photos; cloud upload retries later.
        } finally {
          if (uploadVersionRef.current === uploadVersion) {
            setUploading(false);
          }
        }
      })();
    },
    [getValue, setValue],
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
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
});
