import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';

export function useOpenMemberProfile() {
  const router = useRouter();
  const {
    canOpenNewFullProfile,
    canViewFullProfile,
    isPaidMember,
    isReady,
    recordProfileView,
  } = useSubscription();

  const openPayment = useCallback(
    (reason: 'initial' | 'batch') => {
      router.push({
        pathname: '/payment-access',
        params: { reason },
      });
    },
    [router],
  );

  return useCallback(
    (profileId: string) => {
      if (!isReady) {
        return;
      }

      if (!isPaidMember) {
        openPayment('initial');
        return;
      }

      if (!canOpenNewFullProfile(profileId)) {
        openPayment('batch');
        return;
      }

      if (canViewFullProfile(profileId)) {
        void recordProfileView(profileId);
      }

      router.push({ pathname: '/member/[id]', params: { id: profileId } });
    },
    [
      canOpenNewFullProfile,
      canViewFullProfile,
      isPaidMember,
      isReady,
      openPayment,
      recordProfileView,
      router,
    ],
  );
}

export function useRequirePaidContact() {
  const router = useRouter();
  const { isPaidMember, isReady } = useSubscription();

  return useCallback(() => {
    if (!isReady) {
      return false;
    }

    if (!isPaidMember) {
      router.push({
        pathname: '/payment-access',
        params: { reason: 'initial' },
      });
      return false;
    }

    return true;
  }, [isPaidMember, isReady, router]);
}
