import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import {
  parseProfilePhotos,
  PROFILE_PHOTOS_KEY,
  serializePersistedProfilePhotos,
} from '@/constants/profilePhotos';
import { hydrateLocalProfileFromFirestore, upsertProfileFromValues } from '@/lib/firestore/profileService';

const PROFILE_STORAGE_KEY = 'user_profile';

type ProfileFormContextValue = {
  values: Record<string, string>;
  isReady: boolean;
  setValue: (key: string, value: string) => void;
  getValue: (key: string) => string;
  replaceValues: (nextValues: Record<string, string>) => Promise<void>;
  syncProfileToFirestore: (ownerKey?: string, published?: boolean) => Promise<void>;
  clearProfile: () => Promise<void>;
};

const ProfileFormContext = createContext<ProfileFormContextValue | null>(null);

function parseStoredProfile(raw: string | null): Record<string, string> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  } catch {
    return {};
  }
}

export function ProfileFormProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      let nextValues = parseStoredProfile(stored);
      const phone = nextValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';

      if (phone) {
        const remoteProfile = await hydrateLocalProfileFromFirestore(phone).catch(() => null);
        if (remoteProfile) {
          nextValues = {
            ...nextValues,
            ...remoteProfile,
            [CONTACT_PHONE_KEY]: phone,
            whatsappNumber: remoteProfile.whatsappNumber || nextValues.whatsappNumber || phone,
          };
          await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextValues));
        }
      }

      setValues(nextValues);
      setIsReady(true);
    })();
  }, []);

  const persistValues = useCallback(async (nextValues: Record<string, string>) => {
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextValues));
  }, []);

  const setValue = useCallback(
    (key: string, nextValue: string) => {
      setValues((current) => {
        const storedValue =
          key === PROFILE_PHOTOS_KEY
            ? serializePersistedProfilePhotos(parseProfilePhotos(nextValue))
            : nextValue;
        const next = { ...current, [key]: storedValue };
        void persistValues(next).catch(() => undefined);
        return next;
      });
    },
    [persistValues],
  );

  const replaceValues = useCallback(async (nextValues: Record<string, string>) => {
    setValues(nextValues);
    await persistValues(nextValues);
  }, [persistValues]);

  const syncProfileToFirestore = useCallback(
    async (ownerKey = 'current-user', published = true) => {
      await upsertProfileFromValues(values, ownerKey, { published, uploadPhotos: true });
    },
    [values],
  );

  const clearProfile = useCallback(async () => {
    setValues({});
    await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      values,
      isReady,
      setValue,
      getValue: (key: string) => values[key] ?? '',
      replaceValues,
      syncProfileToFirestore,
      clearProfile,
    }),
    [clearProfile, isReady, replaceValues, setValue, syncProfileToFirestore, values],
  );

  return <ProfileFormContext.Provider value={value}>{children}</ProfileFormContext.Provider>;
}

export function useProfileForm() {
  const context = useContext(ProfileFormContext);
  if (!context) {
    throw new Error('useProfileForm must be used within ProfileFormProvider');
  }
  return context;
}
