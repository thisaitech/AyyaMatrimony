import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
  openLibraryOnMount?: boolean;
  libraryOnly?: boolean;
  showSkip?: boolean;
  compact?: boolean;
  layoutWidth?: number;
};

async function ensurePermission(source: 'camera' | 'library'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }

  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === ImagePicker.PermissionStatus.GRANTED;
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === ImagePicker.PermissionStatus.GRANTED;
}

function cropToAspectRatio(
  sourceCanvas: HTMLCanvasElement,
  aspectWidth: number,
  aspectHeight: number,
): string {
  const sourceWidth = sourceCanvas.width;
  const sourceHeight = sourceCanvas.height;
  const targetAspect = aspectWidth / aspectHeight;
  const sourceAspect = sourceWidth / sourceHeight;

  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (sourceAspect > targetAspect) {
    cropWidth = Math.round(sourceHeight * targetAspect);
    offsetX = Math.round((sourceWidth - cropWidth) / 2);
  } else if (sourceAspect < targetAspect) {
    cropHeight = Math.round(sourceWidth / targetAspect);
    offsetY = Math.round((sourceHeight - cropHeight) / 2);
  }

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = cropWidth;
  outputCanvas.height = cropHeight;
  const context = outputCanvas.getContext('2d');

  if (!context) {
    return sourceCanvas.toDataURL('image/jpeg', 0.85);
  }

  context.drawImage(
    sourceCanvas,
    offsetX,
    offsetY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return outputCanvas.toDataURL('image/jpeg', 0.85);
}

async function compressWebImage(uri: string, maxWidth = 1200): Promise<string> {
  if (Platform.OS !== 'web' || !uri.startsWith('data:')) {
    return uri;
  }

  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width);
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        resolve(uri);
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => resolve(uri);
    image.src = uri;
  });
}

type WebCameraCaptureModalProps = {
  visible: boolean;
  labels: Pick<ProfilePhotoUploadStepLabels, 'camera' | 'cancel' | 'permissionRequired' | 'photoPermissionMessage'>;
  onCapture: (uri: string) => void;
  onClose: () => void;
};

function WebCameraCaptureModal({ visible, labels, onCapture, onClose }: WebCameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') {
      return;
    }

    let cancelled = false;

    async function startCamera() {
      setErrorMessage(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage(labels.photoPermissionMessage);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(labels.photoPermissionMessage);
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [labels.photoPermissionMessage, visible]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(cropToAspectRatio(canvas, 3, 4));
  }, [onCapture]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.cameraModalBackdrop}>
        <View style={styles.cameraModalCard}>
          <Text style={styles.modalTitle}>{labels.camera}</Text>
          {errorMessage ? (
            <Text style={styles.cameraErrorText}>{errorMessage}</Text>
          ) : (
            <View style={styles.cameraPreviewFrame}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 12,
                  transform: 'scaleX(-1)',
                }}
              />
            </View>
          )}
          <View style={styles.cameraActions}>
            <Pressable style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>{labels.cancel}</Text>
            </Pressable>
            {!errorMessage ? (
              <Pressable style={styles.cameraCaptureButton} onPress={handleCapture}>
                <MaterialIcons name="photo-camera" size={20} color={colors.onPrimary} />
                <Text style={styles.cameraCaptureText}>{labels.camera}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const DEFAULT_SLOT_SIZE = Platform.OS === 'web' ? 108 : 100;
const COMPACT_SLOT_MIN = 48;
const COMPACT_SLOT_MAX = 72;
const COMPACT_SLOT_GAP = 12;
/** Compact biodata step uses nearly-square slots to save vertical space; uploads still crop to 3:4. */
const COMPACT_HEIGHT_RATIO = 1.05;

function resolveCompactSlotSize(layoutWidth: number): number {
  const sidePadding = 24;
  const gaps = COMPACT_SLOT_GAP * 2;
  const available = Math.max(layoutWidth - sidePadding, 180);
  return Math.max(
    COMPACT_SLOT_MIN,
    Math.min(COMPACT_SLOT_MAX, Math.floor((available - gaps) / 3)),
  );
}

export function ProfilePhotoUploadStep({
  photos,
  skipped,
  labels,
  onChange,
  onSkip,
  openLibraryOnMount = false,
  libraryOnly = false,
  showSkip = true,
  compact = false,
  layoutWidth,
}: ProfilePhotoUploadStepProps) {
  const { width: windowWidth } = useWindowDimensions();
  const baseWidth = layoutWidth ?? windowWidth;
  const [sourcePickerSlot, setSourcePickerSlot] = useState<number | null>(null);
  const [webCameraSlot, setWebCameraSlot] = useState<number | null>(null);
  const openedLibraryOnMountRef = useRef(false);

  const applyPhotoToSlot = useCallback(
    (slotIndex: number, uri: string) => {
      const nextPhotos = Array.from({ length: MAX_PROFILE_PHOTOS }, (_, index) => photos[index] ?? '');
      nextPhotos[slotIndex] = uri;
      onChange(nextPhotos);
    },
    [onChange, photos],
  );

  const pickPhoto = useCallback(
    async (slotIndex: number, source: 'camera' | 'library') => {
      if (Platform.OS !== 'web') {
        const granted = await ensurePermission(source);
        if (!granted) {
          Alert.alert(labels.permissionRequired, labels.photoPermissionMessage, [
            { text: labels.cancel },
          ]);
          return;
        }
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: Platform.OS !== 'web',
        aspect: [3, 4],
        quality: 0.85,
      };

      try {
        const result =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync(pickerOptions)
            : await ImagePicker.launchImageLibraryAsync(pickerOptions);

        if (result.canceled || !result.assets[0]?.uri) {
          return;
        }

        const uri =
          Platform.OS === 'web'
            ? await compressWebImage(result.assets[0].uri)
            : result.assets[0].uri;
        applyPhotoToSlot(slotIndex, uri);
      } catch {
        if (Platform.OS === 'web') {
          window.alert(labels.photoPermissionMessage);
        } else {
          Alert.alert(labels.permissionRequired, labels.photoPermissionMessage, [
            { text: labels.cancel },
          ]);
        }
      }
    },
    [applyPhotoToSlot, labels],
  );

  const openPicker = useCallback(
    (slotIndex: number) => {
      if (libraryOnly) {
        void pickPhoto(slotIndex, 'library');
        return;
      }
      setSourcePickerSlot(slotIndex);
    },
    [libraryOnly, pickPhoto],
  );

  const closePicker = useCallback(() => {
    setSourcePickerSlot(null);
  }, []);

  useEffect(() => {
    if (!openLibraryOnMount || openedLibraryOnMountRef.current) {
      return;
    }

    openedLibraryOnMountRef.current = true;
    const firstEmptySlot = photos.findIndex((photo) => photo.length === 0);
    const slotIndex = firstEmptySlot >= 0 ? firstEmptySlot : 0;
    void pickPhoto(slotIndex, 'library');
  }, [openLibraryOnMount, photos, pickPhoto]);

  const handleSourceSelect = useCallback(
    (source: 'camera' | 'library') => {
      const slotIndex = sourcePickerSlot;
      if (slotIndex === null) {
        return;
      }

      closePicker();

      if (Platform.OS === 'web' && source === 'camera') {
        setWebCameraSlot(slotIndex);
        return;
      }

      void pickPhoto(slotIndex, source);
    },
    [closePicker, pickPhoto, sourcePickerSlot],
  );

  const closeWebCamera = useCallback(() => {
    setWebCameraSlot(null);
  }, []);

  const handleWebCameraCapture = useCallback(
    (uri: string) => {
      if (webCameraSlot === null) {
        return;
      }

      applyPhotoToSlot(webCameraSlot, uri);
      setWebCameraSlot(null);
    },
    [applyPhotoToSlot, webCameraSlot],
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
  const slotSize = compact ? resolveCompactSlotSize(baseWidth) : DEFAULT_SLOT_SIZE;
  const slotHeight = compact
    ? Math.round(slotSize * COMPACT_HEIGHT_RATIO)
    : Math.round(slotSize * (4 / 3));

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.grid, compact && styles.gridCompact]}>
        {slots.map((uri, index) => (
          <View
            key={`photo-slot-${index}`}
            style={[
              styles.slotWrap,
              compact ? styles.slotWrapFlex : styles.slotWrapRow,
              compact && { width: slotSize, height: slotHeight, flexBasis: slotSize, maxWidth: slotSize },
            ]}
          >
            {uri ? (
              <View style={[styles.filledSlot, compact && styles.filledSlotCompact]}>
                <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                <Pressable
                  style={[styles.removeButton, compact && styles.removeButtonCompact]}
                  onPress={() => removePhoto(index)}
                >
                  <MaterialIcons name="close" size={compact ? 14 : 16} color={colors.onPrimary} />
                </Pressable>
                <Pressable
                  style={[styles.replaceOverlay, compact && styles.replaceOverlayCompact]}
                  onPress={() => openPicker(index)}
                >
                  <MaterialIcons name="edit" size={compact ? 14 : 18} color={colors.onPrimary} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.emptySlot, compact && styles.emptySlotCompact]}
                onPress={() => openPicker(index)}
              >
                <View style={[styles.iconCircle, compact && styles.iconCircleCompact]}>
                  <MaterialIcons name="add-a-photo" size={compact ? 18 : 28} color={colors.primary} />
                </View>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {!showSkip || skipped || photos.some((photo) => photo.length > 0) ? null : (
        <Pressable onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>{labels.skipForNow}</Text>
        </Pressable>
      )}

      <Modal
        visible={sourcePickerSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <Pressable style={styles.modalBackdrop} onPress={closePicker}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>{labels.choosePhotoSource}</Text>
            <Pressable style={styles.modalOption} onPress={() => handleSourceSelect('library')}>
              <MaterialIcons name="photo-library" size={22} color={colors.primary} />
              <Text style={styles.modalOptionText}>{labels.photoLibrary}</Text>
            </Pressable>
            <Pressable style={styles.modalOption} onPress={() => handleSourceSelect('camera')}>
              <MaterialIcons name="photo-camera" size={22} color={colors.primary} />
              <Text style={styles.modalOptionText}>{labels.camera}</Text>
            </Pressable>
            <Pressable style={styles.modalCancel} onPress={closePicker}>
              <Text style={styles.modalCancelText}>{labels.cancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {Platform.OS === 'web' ? (
        <WebCameraCaptureModal
          visible={webCameraSlot !== null}
          labels={labels}
          onCapture={handleWebCameraCapture}
          onClose={closeWebCamera}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  containerCompact: {
    gap: 0,
    paddingBottom: 0,
    marginBottom: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  gridCompact: {
    flexWrap: 'nowrap',
    justifyContent: 'center',
    gap: COMPACT_SLOT_GAP,
    width: '100%',
    minWidth: 0,
  },
  slotWrap: {},
  slotWrapRow: {
    flex: 1,
    minWidth: 0,
    maxWidth: DEFAULT_SLOT_SIZE,
    aspectRatio: 3 / 4,
  },
  slotWrapFlex: {
    flexGrow: 0,
    flexShrink: 0,
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.3)',
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  emptySlotCompact: {
    borderRadius: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  filledSlot: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filledSlotCompact: {
    borderRadius: 8,
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
  removeButtonCompact: {
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
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
  replaceOverlayCompact: {
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 29, 35, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
  },
  modalOptionText: {
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  modalCancelText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  cameraModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 29, 35, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  cameraModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cameraPreviewFrame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  cameraErrorText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  cameraActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cameraCaptureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cameraCaptureText: {
    ...typography.labelLg,
    color: colors.onPrimary,
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
