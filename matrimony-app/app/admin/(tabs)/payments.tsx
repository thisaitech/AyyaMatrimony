import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { AdminScreenShell } from '@/components/admin/AdminScreenShell';
import { adminColors } from '@/constants/admin';
import { adminFilterLabelKeys, adminStatusLabelKey } from '@/constants/adminLabels';
import { useLanguage } from '@/context/LanguageContext';
import { updateApprovalStatus } from '@/lib/firestore/approvalService';
import { approvalDocIdFromPhone } from '@/lib/firestore/collections';
import {
  listPayments,
  updatePaymentStatus,
  type AdminPaymentRecord,
} from '@/lib/firestore/paymentService';

const paymentFilters: Array<'all' | AdminPaymentRecord['status']> = [
  'pending',
  'verified',
  'rejected',
  'all',
];

function filterEmptyMessageKey(filter: 'all' | AdminPaymentRecord['status']) {
  if (filter === 'pending') {
    return 'adminNoPaymentsMessage' as const;
  }
  return 'adminNoPaymentsFilterMessage' as const;
}

export default function AdminPaymentsScreen() {
  const router = useRouter();
  const { translate, translateFormat } = useLanguage();
  const [items, setItems] = useState<AdminPaymentRecord[]>([]);
  const [filter, setFilter] = useState<'all' | AdminPaymentRecord['status']>('pending');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries = await listPayments(filter === 'all' ? undefined : filter);
      setItems(entries);
    } catch {
      // Keep the last loaded payment list if Firestore is temporarily unavailable.
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const showSuccess = useCallback(
    (message: string) => {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert(message);
        }
        return;
      }
      Alert.alert(translate('adminPaymentGranted'), message);
    },
    [translate],
  );

  const showError = useCallback(
    (message: string) => {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert(message);
        }
        return;
      }
      Alert.alert(translate('adminPaymentVerifyFailed'), message);
    },
    [translate],
  );

  const runVerify = useCallback(
    async (item: AdminPaymentRecord) => {
      const ok = await updatePaymentStatus(item.id, 'verified');
      if (!ok) {
        showError(translate('adminPaymentVerifyFailed'));
        return;
      }
      setFilter('verified');
      showSuccess(translate('adminPaymentVerifiedSuccess'));
    },
    [showError, showSuccess, translate],
  );

  const handleVerify = (item: AdminPaymentRecord) => {
    const title = translate('adminVerifyPaymentTitle');
    const body = translateFormat('adminVerifyPaymentBody', { amount: item.amount, name: item.memberName });

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${body}`)) {
        void runVerify(item);
      }
      return;
    }

    Alert.alert(title, body, [
      { text: translate('cancel'), style: 'cancel' },
      { text: translate('adminApprove'), onPress: () => void runVerify(item) },
    ]);
  };

  const handleReject = (item: AdminPaymentRecord) => {
    const title = translate('adminRejectPaymentTitle');
    const body = translateFormat('adminRejectPaymentBody', { name: item.memberName });

    const confirmReject = async () => {
      const ok = await updatePaymentStatus(item.id, 'rejected');
      if (!ok) {
        showError(translate('adminPaymentVerifyFailed'));
        return;
      }
      void refresh();
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${body}`)) {
        void confirmReject();
      }
      return;
    }

    Alert.alert(title, body, [
      { text: translate('cancel'), style: 'cancel' },
      {
        text: translate('adminReject'),
        style: 'destructive',
        onPress: () => void confirmReject(),
      },
    ]);
  };

  const handleApproveProfile = async (phone: string) => {
    await updateApprovalStatus(approvalDocIdFromPhone(phone), 'approved');
    void refresh();
  };

  const openProfile = (phone: string) => {
    router.push(`/admin/view-profile/${phone}` as never);
  };

  const emptyMessage = useMemo(() => {
    const key = filterEmptyMessageKey(filter);
    if (key === 'adminNoPaymentsMessage') {
      return translate(key);
    }
    const statusKey =
      filter === 'verified'
        ? 'adminFilterVerified'
        : filter === 'rejected'
          ? 'adminFilterRejected'
          : 'adminFilterAll';
    return translateFormat('adminNoPaymentsFilterMessage', {
      status: translate(statusKey),
    });
  }, [filter, translate]);

  const filterBar = (
    <View style={styles.filters}>
      {paymentFilters.map((key) => {
        const active = filter === key;
        return (
          <Pressable
            key={key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setFilter(key)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {translate(adminFilterLabelKeys[key])}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <AdminScreenShell
      title={translate('adminPaymentVerification')}
      showLanguageToggle
      pinnedContent={filterBar}
    >
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={adminColors.primary} />
        </View>
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon="payments"
          title={translate('adminNoPaymentsTitle')}
          message={emptyMessage}
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const profilePending =
              item.status === 'verified' &&
              (item.profileApprovalStatus === 'pending' || !item.profileApprovalStatus);

            return (
              <View key={item.id} style={styles.card}>
                <AdminListItem
                  title={item.memberName}
                  subtitle={item.phone}
                  meta={`${item.method} · ${item.referenceNumber} · ${item.submittedAt}`}
                  badge={translate(adminStatusLabelKey(item.status))}
                  badgeColor={
                    item.status === 'verified'
                      ? adminColors.success
                      : item.status === 'pending'
                        ? adminColors.warning
                        : adminColors.danger
                  }
                  onPress={() => openProfile(item.phone)}
                />

                <Text style={styles.amount}>₹{item.amount.toLocaleString('en-IN')}</Text>

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.btn, styles.outlineBtn]}
                    onPress={() => openProfile(item.phone)}
                    hitSlop={4}
                  >
                    <Text style={styles.outlineText}>{translate('adminViewMemberProfile')}</Text>
                  </Pressable>

                  {item.status === 'pending' ? (
                    <>
                      <Pressable
                        style={[styles.btn, styles.verifyBtn]}
                        onPress={() => handleVerify(item)}
                        hitSlop={4}
                      >
                        <Text style={styles.verifyText}>{translate('adminVerify2000')}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.btn, styles.rejectBtn]}
                        onPress={() => handleReject(item)}
                        hitSlop={4}
                      >
                        <Text style={styles.rejectText}>{translate('adminReject')}</Text>
                      </Pressable>
                    </>
                  ) : null}

                  {profilePending ? (
                    <Pressable
                      style={[styles.btn, styles.approveBtn]}
                      onPress={() => void handleApproveProfile(item.phone)}
                      hitSlop={4}
                    >
                      <Text style={styles.approveText}>{translate('adminPaymentApproveProfile')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: adminColors.surface,
    borderWidth: 1,
    borderColor: adminColors.border,
    minHeight: 34,
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  chipActive: { backgroundColor: adminColors.primary, borderColor: adminColors.primary },
  chipText: { color: adminColors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  loading: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 12 },
  card: { gap: 8 },
  amount: { color: adminColors.primary, fontSize: 18, fontWeight: '700', marginLeft: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 120,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  outlineBtn: { backgroundColor: adminColors.surface, borderColor: adminColors.border },
  outlineText: { color: adminColors.text, fontWeight: '700', fontSize: 13 },
  verifyBtn: { backgroundColor: `${adminColors.success}14`, borderColor: `${adminColors.success}55` },
  rejectBtn: { backgroundColor: `${adminColors.danger}10`, borderColor: `${adminColors.danger}44` },
  approveBtn: { backgroundColor: `${adminColors.primary}12`, borderColor: `${adminColors.primary}55` },
  verifyText: { color: adminColors.success, fontWeight: '700', fontSize: 13 },
  rejectText: { color: adminColors.danger, fontWeight: '700', fontSize: 13 },
  approveText: { color: adminColors.primary, fontWeight: '700', fontSize: 13 },
});
