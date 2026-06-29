import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { getDownloadURL, ref, uploadString, listAll } from 'firebase/storage';
import { getFirebaseStorage } from '@/lib/firebase';
import {
  isPersistableDataPhotoUri,
  isPersistablePhotoUri,
  isRemotePhotoUri,
  MAX_FIRESTORE_DATA_PHOTO_CHARS,
  MAX_PROFILE_PHOTOS,
} from '@/constants/profilePhotos';

const UPLOAD_TIMEOUT_MS = 45000;
const READ_URI_TIMEOUT_MS = 20000;
const WEB_JPEG_MAX_WIDTH = 960;
const WEB_JPEG_QUALITY = 0.72;
const NATIVE_JPEG_MAX_WIDTH = 800;
const NATIVE_JPEG_QUALITY = 0.65;

let cloudPhotoUploadEnabled: boolean | null = null;

/** Upload profile photos to Firebase Storage (native) or Storage with Firestore fallback (web CORS). */
export function shouldAttemptCloudPhotoUpload(): boolean {
  return cloudPhotoUploadEnabled !== false;
}

export function markCloudPhotoUploadUnavailable(): void {
  cloudPhotoUploadEnabled = false;
}

export function resetCloudPhotoUploadAvailability(): void {
  cloudPhotoUploadEnabled = null;
}

function isPermanentStorageError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const firebaseError = error as { code?: string; status_?: number };
  return (
    firebaseError.status_ === 404 ||
    firebaseError.code === 'storage/unauthorized' ||
    firebaseError.code === 'storage/unauthenticated' ||
    firebaseError.code === 'storage/invalid-argument'
  );
}

function isWebStorageCorsError(error: unknown): boolean {
  if (Platform.OS !== 'web') {
    return false;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: string }).message ?? '')
        : String(error ?? '');

  const normalized = message.toLowerCase();
  return (
    normalized.includes('cors') ||
    normalized.includes('network error') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('err_failed')
  );
}

function shouldUseFirestorePhotoFallback(error: unknown): boolean {
  if (isPermanentStorageError(error)) {
    return false;
  }

  if (Platform.OS === 'web') {
    return isWebStorageCorsError(error) || !isPermanentStorageError(error);
  }

  return true;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function normalizeLocalPhotoUri(uri: string): Promise<string> {
  if (Platform.OS === 'web' || uri.startsWith('file://')) {
    return uri;
  }

  if (uri.startsWith('content://')) {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      throw new Error('Unable to access photo cache.');
    }

    const destination = `${cacheDir}profile_upload_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  }

  return uri;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Unable to read selected photo.'));
    reader.readAsDataURL(blob);
  });
}

/** Resize/compress phone gallery photos so Storage + Firestore can accept them. */
export async function compressNativePhotoUri(uri: string): Promise<{ uri: string; base64: string }> {
  const normalized = await withTimeout(
    normalizeLocalPhotoUri(uri),
    READ_URI_TIMEOUT_MS,
    'Timed out while preparing the selected photo.',
  );

  try {
    let quality = NATIVE_JPEG_QUALITY;
    let width = NATIVE_JPEG_MAX_WIDTH;
    let lastResult: ImageManipulator.ImageResult | null = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const result = await ImageManipulator.manipulateAsync(
        normalized,
        [{ resize: { width } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      lastResult = result;
      const base64 = result.base64 ?? '';
      if (!base64) {
        break;
      }

      const dataUrl = `data:image/jpeg;base64,${base64}`;
      if (isPersistableDataPhotoUri(dataUrl) || attempt === 5) {
        return { uri: result.uri, base64 };
      }

      quality = Math.max(0.35, quality - 0.08);
      width = Math.max(480, Math.round(width * 0.85));
    }

    if (lastResult?.base64) {
      return { uri: lastResult.uri, base64: lastResult.base64 };
    }
  } catch {
    // Fall back when native image module is unavailable in a release build.
  }

  const base64 = await withTimeout(
    FileSystem.readAsStringAsync(normalized, {
      encoding: FileSystem.EncodingType.Base64,
    }),
    READ_URI_TIMEOUT_MS,
    'Timed out while reading the selected photo.',
  );

  if (!base64) {
    throw new Error('Selected photo is empty or unreadable.');
  }

  return { uri: normalized, base64 };
}

async function readNativePhotoBase64(uri: string): Promise<string> {
  if (Platform.OS !== 'web' && !uri.startsWith('data:')) {
    const compressed = await compressNativePhotoUri(uri);
    return compressed.base64;
  }

  const localUri = await withTimeout(
    normalizeLocalPhotoUri(uri),
    READ_URI_TIMEOUT_MS,
    'Timed out while preparing the selected photo.',
  );
  const base64 = await withTimeout(
    FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    }),
    READ_URI_TIMEOUT_MS,
    'Timed out while reading the selected photo.',
  );

  if (!base64) {
    throw new Error('Selected photo is empty or unreadable.');
  }

  return base64;
}

async function uriToBlob(uri: string): Promise<Blob> {
  if (!uri.trim()) {
    return new Blob();
  }

  if (uri.startsWith('data:') || uri.startsWith('blob:') || isRemotePhotoUri(uri)) {
    const response = await withTimeout(
      fetch(uri),
      READ_URI_TIMEOUT_MS,
      'Timed out while reading the selected photo.',
    );
    if (!response.ok) {
      throw new Error('Unable to read selected photo.');
    }
    return response.blob();
  }

  if (Platform.OS !== 'web') {
    const base64 = await readNativePhotoBase64(uri);
    const binary = globalThis.atob?.(base64);
    if (!binary) {
      throw new Error('Unable to read selected photo.');
    }
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: 'image/jpeg' });
  }

  const response = await withTimeout(
    fetch(uri),
    READ_URI_TIMEOUT_MS,
    'Timed out while reading the selected photo.',
  );
  if (!response.ok) {
    throw new Error('Unable to read selected photo.');
  }
  return response.blob();
}

async function compressBlobForFirestore(blob: Blob): Promise<string> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    const dataUrl = await blobToDataUrl(blob);
    if (!isPersistableDataPhotoUri(dataUrl)) {
      throw new Error('Photo is too large. Please choose a smaller image.');
    }
    return dataUrl;
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to read selected photo.'));
      element.src = objectUrl;
    });

    const scale = Math.min(1, WEB_JPEG_MAX_WIDTH / Math.max(image.width, 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to prepare photo for upload.');
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = WEB_JPEG_QUALITY;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > MAX_FIRESTORE_DATA_PHOTO_CHARS && quality > 0.35) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    if (!isPersistableDataPhotoUri(dataUrl)) {
      throw new Error('Photo is too large after compression. Please choose a smaller image.');
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function nativePhotoDataUrlForFirestore(uri: string): Promise<string> {
  const { base64 } = await compressNativePhotoUri(uri);
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  if (!isPersistableDataPhotoUri(dataUrl)) {
    throw new Error('Photo is too large. Please choose a smaller image.');
  }
  return dataUrl;
}

async function uploadProfilePhotoViaFirestoreFallback(localUri: string): Promise<string> {
  if (Platform.OS !== 'web') {
    return nativePhotoDataUrlForFirestore(localUri);
  }

  const blob = await uriToBlob(localUri);
  if (!blob.size) {
    throw new Error('Selected photo is empty or unreadable.');
  }

  return compressBlobForFirestore(blob);
}

async function uploadProfilePhotoToStorage(
  phone: string,
  slotIndex: number,
  localUri: string,
): Promise<string> {
  const storage = await getFirebaseStorage();
  if (!storage) {
    throw new Error('Photo storage is unavailable.');
  }

  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Phone number is required to upload photos.');
  }

  const objectRef = ref(storage, `profiles/${digits}/photos/photo_${slotIndex}.jpg`);

  if (localUri.startsWith('data:image/')) {
    await withTimeout(
      uploadString(objectRef, localUri, 'data_url', { contentType: 'image/jpeg' }),
      UPLOAD_TIMEOUT_MS,
      'Photo upload timed out. Please try again.',
    );
    cloudPhotoUploadEnabled = true;
    return getDownloadURL(objectRef);
  }

  if (Platform.OS === 'web') {
    const blob = await uriToBlob(localUri);
    if (!blob.size) {
      throw new Error('Selected photo is empty or unreadable.');
    }

    const dataUrl = await blobToDataUrl(blob);
    await withTimeout(
      uploadString(objectRef, dataUrl, 'data_url', { contentType: 'image/jpeg' }),
      UPLOAD_TIMEOUT_MS,
      'Photo upload timed out. Please try again.',
    );
  } else {
    const { base64 } = await compressNativePhotoUri(localUri);
    await withTimeout(
      uploadString(objectRef, base64, 'base64', { contentType: 'image/jpeg' }),
      UPLOAD_TIMEOUT_MS,
      'Photo upload timed out. Please try again.',
    );
  }

  cloudPhotoUploadEnabled = true;
  return getDownloadURL(objectRef);
}

export async function uploadProfilePhoto(
  phone: string,
  slotIndex: number,
  localUri: string,
): Promise<string> {
  if (!localUri.trim()) {
    return '';
  }

  if (isPersistablePhotoUri(localUri)) {
    return localUri;
  }

  if (!shouldAttemptCloudPhotoUpload()) {
    return uploadProfilePhotoViaFirestoreFallback(localUri);
  }

  try {
    return await uploadProfilePhotoToStorage(phone, slotIndex, localUri);
  } catch (error) {
    if (isPermanentStorageError(error)) {
      markCloudPhotoUploadUnavailable();
    }

    if (!shouldUseFirestorePhotoFallback(error)) {
      throw error instanceof Error ? error : new Error('Photo upload failed.');
    }

    try {
      return await uploadProfilePhotoViaFirestoreFallback(localUri);
    } catch (fallbackError) {
      throw fallbackError instanceof Error
        ? fallbackError
        : new Error('Photo upload failed. Please try a smaller image.');
    }
  }
}

export async function uploadProfilePhotos(
  phone: string,
  localUris: string[],
): Promise<string[]> {
  const results: string[] = [];
  for (let index = 0; index < localUris.length; index += 1) {
    const uri = localUris[index] ?? '';
    if (!uri.trim()) {
      results[index] = '';
      continue;
    }

    if (isPersistablePhotoUri(uri)) {
      results[index] = uri;
      continue;
    }

    try {
      results[index] = await uploadProfilePhoto(phone, index, uri);
    } catch {
      try {
        results[index] = await uploadProfilePhotoViaFirestoreFallback(uri);
      } catch {
        results[index] = '';
      }
    }
  }

  return results;
}

/** Read cloud photo URLs from Storage — used on native when Firestore still has stale blob paths. */
export async function fetchStoredProfilePhotoUrls(phone: string): Promise<string[]> {
  if (Platform.OS === 'web') {
    return Array.from({ length: MAX_PROFILE_PHOTOS }, () => '');
  }

  const storage = await getFirebaseStorage();
  const digits = phone.replace(/\D/g, '');
  if (!storage || !digits) {
    return Array.from({ length: MAX_PROFILE_PHOTOS }, () => '');
  }

  const slots = Array.from({ length: MAX_PROFILE_PHOTOS }, () => '');
  try {
    const listing = await listAll(ref(storage, `profiles/${digits}/photos`));
    await Promise.all(
      listing.items.map(async (item) => {
        const slotMatch = /^photo_(\d+)\.jpg$/i.exec(item.name);
        if (!slotMatch) {
          return;
        }

        const slot = Number(slotMatch[1]);
        if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_PROFILE_PHOTOS) {
          return;
        }

        try {
          slots[slot] = await getDownloadURL(item);
        } catch {
          // Ignore unreadable storage objects.
        }
      }),
    );
  } catch {
    return slots;
  }

  return slots;
}
