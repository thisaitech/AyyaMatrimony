import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseStorage } from '@/lib/firebase';
import { isRemotePhotoUri } from '@/constants/profilePhotos';

const UPLOAD_TIMEOUT_MS = 20000;

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

async function uriToBlob(uri: string): Promise<Blob> {
  if (!uri.trim()) {
    return new Blob();
  }

  if (uri.startsWith('data:') || uri.startsWith('blob:') || isRemotePhotoUri(uri)) {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Unable to read selected photo.');
    }
    return response.blob();
  }

  if (Platform.OS !== 'web' && uri.startsWith('file://')) {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: 'image/jpeg' });
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Unable to read selected photo.');
  }
  return response.blob();
}

export async function uploadProfilePhoto(
  phone: string,
  slotIndex: number,
  localUri: string,
): Promise<string> {
  if (!localUri.trim()) {
    return '';
  }

  if (isRemotePhotoUri(localUri)) {
    return localUri;
  }

  const storage = await getFirebaseStorage();
  if (!storage) {
    throw new Error('Photo storage is unavailable.');
  }

  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    throw new Error('Phone number is required to upload photos.');
  }

  const objectRef = ref(storage, `profiles/${digits}/photos/photo_${slotIndex}.jpg`);
  const blob = await uriToBlob(localUri);
  if (!blob.size) {
    throw new Error('Selected photo is empty or unreadable.');
  }

  await withTimeout(
    uploadBytes(objectRef, blob, { contentType: 'image/jpeg' }),
    UPLOAD_TIMEOUT_MS,
    'Photo upload timed out. Please try again.',
  );
  return getDownloadURL(objectRef);
}

export async function uploadProfilePhotos(
  phone: string,
  localUris: string[],
): Promise<string[]> {
  return Promise.all(localUris.map((uri, index) => uploadProfilePhoto(phone, index, uri)));
}
