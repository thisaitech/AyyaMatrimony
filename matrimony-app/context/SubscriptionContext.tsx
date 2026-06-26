import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getProfilesAllowed,
  getProfilesRemaining,
  hasActivePaidBatch,
  PROFILE_ACCESS_PRICE,
  PROFILE_BATCH_SIZE,
  SUBSCRIPTION_STORAGE_KEY,
} from '@/constants/subscription';
import { hasCompletedProfile, prepareProfileForPublish } from '@/constants/profileCompletion';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { submitLoginApproval } from '@/lib/firestore/approvalService';
import { fetchLatestPaymentStatus, submitPaymentRequest } from '@/lib/firestore/paymentService';
import { upsertProfileFromValues } from '@/lib/firestore/profileService';
import { fetchSubscription, hideMemberProfile, syncSubscriptionViewedProfiles, upsertSubscription } from '@/lib/firestore/subscriptionService';

const PROFILE_STORAGE_KEY = 'user_profile';

export type AccessMode = 'unpaid' | 'paid';
export type MembershipViewMode = 'regular' | 'prime';

type SubscriptionState = {
  isLoggedIn: boolean;
  hasChosenAccessMode: boolean;
  accessMode: AccessMode;
  batchesPaid: number;
  viewedProfileIds: string[];
  hiddenProfileIds: string[];
};

type SubscriptionContextValue = {
  isReady: boolean;
  isLoggedIn: boolean;
  hasChosenAccessMode: boolean;
  accessMode: AccessMode;
  isPaidMember: boolean;
  hasPaidProfileQuota: boolean;
  batchesPaid: number;
  profilesAllowed: number;
  profilesViewedCount: number;
  profilesRemaining: number;
  viewedProfileIds: string[];
  hiddenProfileIds: string[];
  needsPaymentAccess: boolean;
  /** False until Firestore subscription state is resolved for the logged-in user. */
  isSubscriptionGateReady: boolean;
  canBrowseMemberProfiles: boolean;
  isSubscriptionExhausted: boolean;
  canViewFullProfile: (profileId: string) => boolean;
  canOpenNewFullProfile: (profileId: string) => boolean;
  recordProfileView: (profileId: string) => Promise<boolean>;
  skipProfile: (profileId: string) => Promise<void>;
  login: () => Promise<'home' | 'register'>;
  chooseUnpaidAccess: () => Promise<void>;
  resetPaymentGate: () => Promise<void>;
  submitPaymentRequest: (method: string, referenceNumber?: string) => Promise<void>;
  syncFromFirestore: (phone: string) => Promise<void>;
  pendingPayment: boolean;
  processPayment: () => Promise<void>;
  logout: () => Promise<void>;
  accessPrice: number;
  batchSize: number;
  membershipViewMode: MembershipViewMode;
  isPrimeViewActive: boolean;
  setMembershipViewMode: (mode: MembershipViewMode) => void;
};

const defaultState: SubscriptionState = {
  isLoggedIn: false,
  hasChosenAccessMode: false,
  accessMode: 'unpaid',
  batchesPaid: 0,
  viewedProfileIds: [],
  hiddenProfileIds: [],
};

export function userNeedsPaymentAccess(state: Pick<SubscriptionState, 'hasChosenAccessMode' | 'accessMode' | 'batchesPaid'>) {
  if (state.accessMode === 'paid' && state.batchesPaid > 0) {
    return false;
  }
  return !state.hasChosenAccessMode;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function parseStoredSubscription(raw: string | null): SubscriptionState {
  if (!raw) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SubscriptionState>;
    const accessMode = parsed.accessMode === 'paid' ? 'paid' : 'unpaid';
    const batchesPaid = typeof parsed.batchesPaid === 'number' ? Math.max(0, parsed.batchesPaid) : 0;
    return {
      isLoggedIn: Boolean(parsed.isLoggedIn),
      hasChosenAccessMode:
        Boolean(parsed.hasChosenAccessMode) || (accessMode === 'paid' && batchesPaid > 0),
      accessMode,
      batchesPaid,
      viewedProfileIds: Array.isArray(parsed.viewedProfileIds)
        ? parsed.viewedProfileIds.filter((id): id is string => typeof id === 'string')
        : [],
      hiddenProfileIds: Array.isArray(parsed.hiddenProfileIds)
        ? parsed.hiddenProfileIds.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    return defaultState;
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>(defaultState);
  const [isReady, setIsReady] = useState(false);
  const [isSubscriptionGateReady, setIsSubscriptionGateReady] = useState(false);
  const [membershipViewMode, setMembershipViewMode] = useState<MembershipViewMode>('regular');
  const [pendingPayment, setPendingPayment] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY),
    ])
      .then(([stored]) => {
        const parsed = parseStoredSubscription(stored);
        setState(parsed);
        setIsSubscriptionGateReady(!parsed.isLoggedIn);
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  const persistState = useCallback(async (nextState: SubscriptionState) => {
    await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(nextState));
  }, []);

  const updateState = useCallback(
    (updater: (current: SubscriptionState) => SubscriptionState) => {
      setState((current) => {
        const next = updater(current);
        void persistState(next);
        return next;
      });
    },
    [persistState],
  );

  const syncFromFirestore = useCallback(
    async (phone: string) => {
      const digits = phone.replace(/\D/g, '');
      if (!digits) {
        return;
      }

      const [remoteSubscription, paymentStatus] = await Promise.all([
        fetchSubscription(digits),
        fetchLatestPaymentStatus(digits),
      ]);

      setPendingPayment(paymentStatus === 'pending');

      const subscription =
        remoteSubscription ??
        (paymentStatus === 'verified' ? await fetchSubscription(digits) : null);

      if (!subscription) {
        return;
      }

      updateState((current) => ({
        ...current,
        accessMode: subscription.accessMode,
        batchesPaid: subscription.batchesPaid,
        viewedProfileIds: subscription.viewedProfileIds,
        hiddenProfileIds: subscription.hiddenProfileIds ?? [],
        hasChosenAccessMode:
          subscription.accessMode === 'paid' && subscription.batchesPaid > 0
            ? true
            : current.hasChosenAccessMode,
        isLoggedIn: true,
      }));

      if (subscription.accessMode === 'paid' && subscription.batchesPaid > 0) {
        setPendingPayment(false);
        setMembershipViewMode('prime');
      }
    },
    [updateState],
  );

  useEffect(() => {
    if (!isReady || !state.isLoggedIn) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const profileRaw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (!profileRaw) {
          return;
        }
        try {
          const profileValues = JSON.parse(profileRaw) as Record<string, string>;
          const phone = profileValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
          if (phone) {
            await syncFromFirestore(phone);
          }
        } catch {
          // ignore malformed profile cache
        }
      } finally {
        if (!cancelled) {
          setIsSubscriptionGateReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, state.isLoggedIn, syncFromFirestore]);

  const profilesAllowed = getProfilesAllowed(state.batchesPaid);
  const profilesViewedCount = state.viewedProfileIds.length;
  const profilesRemaining = getProfilesRemaining(state.batchesPaid, profilesViewedCount);
  const isPaidMember = state.accessMode === 'paid' && state.batchesPaid > 0;
  const hasPaidProfileQuota = hasActivePaidBatch(
    state.accessMode,
    state.batchesPaid,
    profilesViewedCount,
  );
  const isSubscriptionExhausted = isPaidMember && profilesRemaining <= 0;
  const canBrowseMemberProfiles = !isSubscriptionExhausted;
  const isPrimeViewActive = membershipViewMode === 'prime' && isPaidMember;

  useEffect(() => {
    if (!isPaidMember && membershipViewMode === 'prime') {
      setMembershipViewMode('regular');
    }
  }, [isPaidMember, membershipViewMode]);

  const setMembershipViewModeSafe = useCallback(
    (mode: MembershipViewMode) => {
      if (mode === 'prime' && !isPaidMember) {
        return;
      }
      setMembershipViewMode(mode);
    },
    [isPaidMember],
  );

  const canViewFullProfile = useCallback(
    (profileId: string) => {
      if (!isPaidMember || pendingPayment) {
        return false;
      }
      if (state.viewedProfileIds.includes(profileId)) {
        return true;
      }
      return profilesViewedCount < profilesAllowed;
    },
    [isPaidMember, pendingPayment, profilesAllowed, profilesViewedCount, state.viewedProfileIds],
  );

  const canOpenNewFullProfile = useCallback(
    (profileId: string) => {
      if (!isPaidMember) {
        return true;
      }
      if (state.viewedProfileIds.includes(profileId)) {
        return true;
      }
      return profilesViewedCount < profilesAllowed;
    },
    [isPaidMember, profilesAllowed, profilesViewedCount, state.viewedProfileIds],
  );

  const recordProfileView = useCallback(
    async (profileId: string) => {
      let recorded = false;

      updateState((current) => {
        const paid = current.accessMode === 'paid' && current.batchesPaid > 0;
        if (!paid) {
          return current;
        }

        if (current.viewedProfileIds.includes(profileId)) {
          recorded = true;
          return current;
        }

        const allowed = getProfilesAllowed(current.batchesPaid);
        if (current.viewedProfileIds.length >= allowed) {
          return current;
        }

        recorded = true;
        const nextViewed = [...current.viewedProfileIds, profileId];
        void (async () => {
          const profileRaw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
          if (!profileRaw) return;
          try {
            const profileValues = JSON.parse(profileRaw) as Record<string, string>;
            const phone = profileValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
            if (phone) {
              await syncSubscriptionViewedProfiles(phone, nextViewed);
            }
          } catch {
            // ignore
          }
        })();
        return {
          ...current,
          viewedProfileIds: nextViewed,
        };
      });

      return recorded;
    },
    [updateState],
  );

  const skipProfile = useCallback(
    async (profileId: string) => {
      updateState((current) => {
        if (current.hiddenProfileIds.includes(profileId)) {
          return current;
        }
        return {
          ...current,
          hiddenProfileIds: [...current.hiddenProfileIds, profileId],
        };
      });

      const profileRaw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (!profileRaw) {
        return;
      }

      try {
        const profileValues = JSON.parse(profileRaw) as Record<string, string>;
        const phone = profileValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
        if (phone) {
          await hideMemberProfile(phone, profileId);
        }
      } catch {
        // ignore malformed profile cache
      }
    },
    [updateState],
  );

  const login = useCallback(async () => {
    const [stored, profileRaw] = await Promise.all([
      AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY),
      AsyncStorage.getItem(PROFILE_STORAGE_KEY),
    ]);
    const current = parseStoredSubscription(stored);
    let profileValues: Record<string, string> = {};
    if (profileRaw) {
      try {
        profileValues = JSON.parse(profileRaw) as Record<string, string>;
      } catch {
        profileValues = {};
      }
    }
    const profileComplete = hasCompletedProfile(profileValues);
    const phone = profileValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
    const next: SubscriptionState = {
      ...current,
      isLoggedIn: true,
      hasChosenAccessMode:
        current.hasChosenAccessMode || (current.accessMode === 'paid' && current.batchesPaid > 0),
    };
    setState(next);
    await persistState(next);
    if (phone) {
      await syncFromFirestore(phone);
    }
    setIsSubscriptionGateReady(true);
    return profileComplete ? 'home' : 'register';
  }, [persistState, syncFromFirestore]);

  const chooseUnpaidAccess = useCallback(async () => {
    updateState((current) => {
      if (current.accessMode === 'paid' && current.batchesPaid > 0) {
        return {
          ...current,
          isLoggedIn: true,
          hasChosenAccessMode: true,
        };
      }

      return {
        ...current,
        isLoggedIn: true,
        hasChosenAccessMode: true,
        accessMode: 'unpaid',
      };
    });

    const profileRaw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    if (!profileRaw) {
      return;
    }

    try {
      const profileValues = JSON.parse(profileRaw) as Record<string, string>;
      const phone = profileValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
      if (phone) {
        await upsertSubscription(phone, { accessMode: 'unpaid' }).catch(() => undefined);
        const preparedProfile = prepareProfileForPublish(profileValues);
        await upsertProfileFromValues(preparedProfile, 'current-user', {
          published: true,
          uploadPhotos: true,
        }).catch(() => undefined);
        await submitLoginApproval(phone, {
          name: preparedProfile.fullName,
          profileId: preparedProfile.memberListingId,
          registrationCommunity: preparedProfile.registrationCommunity,
          source: 'profile',
        }).catch(() => undefined);
      }
    } catch {
      // ignore malformed profile cache
    }
  }, [updateState]);

  const resetPaymentGate = useCallback(async () => {
    updateState((current) => ({
      ...current,
      hasChosenAccessMode: false,
      accessMode: 'unpaid',
      batchesPaid: 0,
      viewedProfileIds: [],
      hiddenProfileIds: [],
    }));
  }, [updateState]);

  const submitPaymentRequestHandler = useCallback(
    async (method: string, referenceNumber?: string) => {
      const profileRaw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      let phone = '';
      let memberName = '';
      let profileValues: Record<string, string> = {};
      if (profileRaw) {
        try {
          profileValues = JSON.parse(profileRaw) as Record<string, string>;
          phone = profileValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
          memberName = profileValues.fullName ?? '';
        } catch {
          phone = '';
        }
      }

      if (!phone) {
        return;
      }

      await submitPaymentRequest(phone, {
        memberName,
        method,
        referenceNumber: referenceNumber ?? `${method}-${Date.now()}`,
      });

      const preparedProfile = prepareProfileForPublish(profileValues);
      await upsertProfileFromValues(preparedProfile, 'current-user', {
        published: true,
        uploadPhotos: true,
      }).catch(() => undefined);
      await submitLoginApproval(phone, {
        name: preparedProfile.fullName || memberName,
        profileId: preparedProfile.memberListingId,
        registrationCommunity: preparedProfile.registrationCommunity,
        source: 'profile',
      }).catch(() => undefined);

      updateState((current) => ({
        ...current,
        hasChosenAccessMode: true,
      }));
      setPendingPayment(true);
    },
    [updateState],
  );

  const processPayment = useCallback(async () => {
    let persistedState: SubscriptionState = defaultState;

    setState((current) => {
      persistedState = {
        ...current,
        isLoggedIn: true,
        hasChosenAccessMode: true,
        accessMode: 'paid',
        batchesPaid: current.batchesPaid + 1,
      };
      return persistedState;
    });

    setMembershipViewMode('prime');
    await persistState(persistedState);
  }, [persistState]);

  const logout = useCallback(async () => {
    setState((current) => {
      const next = { ...current, isLoggedIn: false };
      void persistState(next);
      return next;
    });
    setMembershipViewMode('regular');
    setIsSubscriptionGateReady(true);
  }, [persistState]);

  const needsPaymentAccess = userNeedsPaymentAccess(state);

  const value = useMemo(
    () => ({
      isReady,
      isLoggedIn: state.isLoggedIn,
      hasChosenAccessMode: state.hasChosenAccessMode,
      accessMode: state.accessMode,
      isPaidMember,
      hasPaidProfileQuota,
      batchesPaid: state.batchesPaid,
      profilesAllowed,
      profilesViewedCount,
      profilesRemaining,
      viewedProfileIds: state.viewedProfileIds,
      hiddenProfileIds: state.hiddenProfileIds,
      needsPaymentAccess,
      isSubscriptionGateReady,
      canBrowseMemberProfiles,
      isSubscriptionExhausted,
      canViewFullProfile,
      canOpenNewFullProfile,
      recordProfileView,
      skipProfile,
      login,
      chooseUnpaidAccess,
      resetPaymentGate,
      submitPaymentRequest: submitPaymentRequestHandler,
      syncFromFirestore,
      pendingPayment,
      processPayment,
      logout,
      accessPrice: PROFILE_ACCESS_PRICE,
      batchSize: PROFILE_BATCH_SIZE,
      membershipViewMode,
      isPrimeViewActive,
      setMembershipViewMode: setMembershipViewModeSafe,
    }),
    [
      canOpenNewFullProfile,
      canViewFullProfile,
      chooseUnpaidAccess,
      resetPaymentGate,
      hasPaidProfileQuota,
      isPaidMember,
      isSubscriptionExhausted,
      canBrowseMemberProfiles,
      isSubscriptionGateReady,
      isPrimeViewActive,
      isReady,
      login,
      logout,
      membershipViewMode,
      pendingPayment,
      processPayment,
      profilesAllowed,
      profilesRemaining,
      profilesViewedCount,
      recordProfileView,
      skipProfile,
      setMembershipViewModeSafe,
      state.accessMode,
      state.batchesPaid,
      state.hasChosenAccessMode,
      state.hiddenProfileIds,
      state.isLoggedIn,
      state.viewedProfileIds,
      needsPaymentAccess,
      submitPaymentRequestHandler,
      syncFromFirestore,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}
