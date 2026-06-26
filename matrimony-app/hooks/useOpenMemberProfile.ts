import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';
import { useMemberAccess } from '@/hooks/useMemberAccess';

export function useOpenMemberProfile() {
  const router = useRouter();
  const {
    canOpenNewFullProfile,
    isPaidMember,
    isReady,
    recordProfileView,
  } = useSubscription();
  const { canSeeMemberProfiles, canViewFullProfile } = useMemberAccess();

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
      if (!isReady || !canSeeMemberProfiles) {
        return;
      }

      if (isPaidMember && !canOpenNewFullProfile(profileId)) {
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
      canSeeMemberProfiles,
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
  const { isPaidMember, isReady, pendingPayment, needsPaymentAccess } = useSubscription();
  const { isProfileApproved, hasVerifiedPayment } = useMemberAccess();

  return useCallback(() => {
    if (!isReady) {
      return false;
    }

    if (!isProfileApproved) {
      return false;
    }

    if (!hasVerifiedPayment || pendingPayment || !isPaidMember) {
      if (needsPaymentAccess) {
        router.push({
          pathname: '/payment-access',
          params: { reason: 'initial' },
        });
      } else {
        router.push('/upgrade');
      }
      return false;
    }

    return true;
  }, [hasVerifiedPayment, isPaidMember, isProfileApproved, isReady, needsPaymentAccess, pendingPayment, router]);
}

export function useOpenChat() {
  const router = useRouter();
  const { isPaidMember, isReady, pendingPayment, needsPaymentAccess } = useSubscription();
  const { isProfileApproved, hasVerifiedPayment } = useMemberAccess();

  return useCallback(
    (memberId: string, memberName: string, memberImage: string) => {
      if (!isReady || !memberId.trim()) {
        return;
      }

      if (!isProfileApproved) {
        return;
      }

      if (!hasVerifiedPayment || pendingPayment || !isPaidMember) {
        if (needsPaymentAccess) {
          router.push({
            pathname: '/payment-access',
            params: { reason: 'initial' },
          });
        } else {
          router.push('/upgrade');
        }
        return;
      }

      router.push({
        pathname: '/conversation/[id]',
        params: {
          id: memberId,
          name: memberName,
          image: memberImage,
        },
      });
    },
    [
      hasVerifiedPayment,
      isPaidMember,
      isProfileApproved,
      isReady,
      needsPaymentAccess,
      pendingPayment,
      router,
    ],
  );
}
