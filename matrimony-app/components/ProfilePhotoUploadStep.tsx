import { useCallback } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { MAX_PROFILE_PHOTOS } from '@/constants/profilePhotos';
import { Language } from '@/constants/i18n';
import { colors, spacing, typography } from '@/constants/theme';

type ProfilePhotoUploadStepLabels = {
  choosePhotoSource: string;
  camera: string;
  photoLibrary: string;
  cancel: string;
  skipForNow: string;
  permissionRequired: string;
  photoPermissionMessage: string;
};

type ProfilePhotoUploadStepProps = {
  photos: string[];
  skipped: boolean;
  language: Language;
  labels: ProfilePhotoUploadStepLabels;
  onChange: (photos: string[]) => void;
  onSkip: () => void;
};

async function ensurePermission(source: 'camera' | 'library'): Promise<boolean> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === ImagePicker.PermissionStatus.GRANTED;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === ImagePicker.PermissionStatus.GRANTED;
}

export function ProfilePhotoUploadStep({
  photos,
  skipped,
  labels,
  onChange,
  onSkip,
}: ProfilePhotoUploadStepProps) {
  const pickPhoto = useCallback(
    async (slotIndex: number, source: 'camera' | 'library') => {
      const granted = await ensurePermission(source);
      if (!granted) {
        Alert.alert(labels.permissionRequired, labels.photoPermissionMessage, [
          { text: labels.cancel },
        ]);
        return;
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const nextPhotos = Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => photos[index] ?? '');
      nextPhotos[slotIndex] = result.assets[0].uri;
      onChange(nextPhotos);
    },
    [labels, onChange, photos],
  );

  const openPicker = useCallback(
    (slotIndex: number) => {
      Alert.alert(labels.choosePhotoSource, undefined, [
        { text: labels.camera, onPress: () => void pickPhoto(slotIndex, 'camera') },
        { text: labels.photoLibrary, onPress: () => void pickPhoto(slotIndex, 'library') },
        { text: labels.cancel, style: 'cancel' },
      ]);
    },
    [labels, pickPhoto],
  );

  const removePhoto = useCallback(
    (slotIndex: number) => {
      const nextPhotos = Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => photos[index] ?? '');
      nextPhotos[slotIndex] = '';
      onChange(nextPhotos);
    },
    [onChange, photos],
  );

  const slots = Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => photos[index] ?? '');

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {slots.map((uri, index) => (
          <View key={`photo-slot-${index}`} style={styles.slotWrap}>
            {uri ? (
              <View style={styles.filledSlot}>
                <Image source={{ uri }} style={styles.photo} />
                <Pressable style={styles.removeButton} onPress={() => removePhoto(index)}>
                  <MaterialIcons name="close" size={16} color={colors.onPrimary} />
                </Pressable>
                <Pressable style={styles.replaceOverlay} onPress={() => openPicker(index)}>
                  <MaterialIcons name="edit" size={18} color={colors.onPrimary} />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.emptySlot} onPress={() => openPicker(index)}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="add-a-photo" size={28} color={colors.primary} />
                </View>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {!skipped && !photos.some((photo) => photo.length > 0) ? (
        <Pressable onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>{labels.skipForNow}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const slotSize = Platform.OS === 'web' ? 108 : 100;

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  slotWrap: {
    width: slotSize,
    height: Math.round(slotSize * (4 / 3)),
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.3)',
    borderRadius: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledSlot: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replaceOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});

export function getPhotoUploadStepLabels(language: Language) {
  if (language === 'ta') {
    return {
      choosePhotoSource: 'புகைப்படத்தைச் சேர்க்க',
      camera: 'கேமரா',
      photoLibrary: 'புகைப்படங்கள்',
      cancel: 'ரத்து',
      skipForNow: 'இப்போது தவிர்',
      permissionRequired: 'அனுமதி தேவை',
      photoPermissionMessage: 'புகைப்படம் சேர்க்க கேமரா அல்லது புகைப்பட அணுகலை அனுமதிக்கவும்.',
    };
  }

  return {
    choosePhotoSource: 'Add a photo',
    camera: 'Camera',
    photoLibrary: 'Photo Library',
    cancel: 'Cancel',
    skipForNow: 'Skip for Now',
    permissionRequired: 'Permission required',
    photoPermissionMessage: 'Allow camera or photo library access to add your profile photos.',
  };
}
