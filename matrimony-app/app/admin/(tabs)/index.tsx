import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { AdminScreenShell } from '@/components/admin/AdminScreenShell';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { computeAdminDashboardStats, formatRevenue } from '@/constants/adminStats';
import type { AdminUserRecord } from '@/constants/adminMockData';
import { adminColors } from '@/constants/admin';
import { useAdminApprovals } from '@/context/AdminApprovalsContext';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useAdminNotifications } from '@/context/AdminNotificationsContext';
import { useAdminPhotoApprovals } from '@/context/AdminPhotoApprovalsContext';
import { useLanguage } from '@/context/LanguageContext';
import { adminStatusLabelKey } from '@/constants/adminLabels';
import { listAdminUsers } from '@/lib/firestore/adminUserService';
import { getPaymentDashboardStats } from '@/lib/firestore/paymentService';

const ADMIN_DASHBOARD_CACHE_KEY = 'ayya_admin_dashboard_v1';
const DASHBOARD_REFRESH_STALE_MS = 30_000;

type AdminDashboardCache = {
  users: AdminUserRecord[];
  pendingPayments: number;
  verifiedPayments: number;
  totalRevenue: number;
  pendingPhotos: number;
};

async function readDashboardCache(): Promise<AdminDashboardCache | null> {
  const raw = await AsyncStorage.getItem(ADMIN_DASHBOARD_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminDashboardCache;
  } catch {
    return null;
  }
}

async function writeDashboardCache(cache: AdminDashboardCache): Promise<void> {
  await AsyncStorage.setItem(ADMIN_DASHBOARD_CACHE_KEY, JSON.stringify(cache));
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { signOut } = useAdminAuth();
  const { translate, translateFormat } = useLanguage();
  const { items: approvals, refresh: refreshApprovals } = useAdminApprovals();
  const { items: photoApprovals, refresh: refreshPhotoApprovals } = useAdminPhotoApprovals();
  const { unreadCount } = useAdminNotifications();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [verifiedPayments, setVerifiedPayments] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingPhotos, setPendingPhotos] = useState(0);
  const photoPendingCount = useMemo(
    () => photoApprovals.filter((item) => item.status === 'pending').length,
    [photoApprovals],
  );
  const lastRefreshAtRef = useRef(0);
  const cacheHydratedRef = useRef(false);

  useEffect(() => {
    if (cacheHydratedRef.current) {
      return;
    }
    cacheHydratedRef.current = true;

    void (async () => {
      const cached = await readDashboardCache();
      if (!cached) {
        return;
      }

      setUsers(cached.users);
      setPendingPayments(cached.pendingPayments);
      setVerifiedPayments(cached.verifiedPayments);
      setTotalRevenue(cached.totalRevenue);
      setPendingPhotos(cached.pendingPhotos);
    })();
  }, []);

  const refreshUsers = useCallback(async () => {
    const [entries, paymentStats] = await Promise.all([
      listAdminUsers(),
      getPaymentDashboardStats(),
    ]);

    setUsers(entries);
    setPendingPayments(paymentStats.pendingCount);
    setVerifiedPayments(paymentStats.verifiedCount);
    setTotalRevenue(paymentStats.totalRevenue);

    void writeDashboardCache({
      users: entries,
      pendingPayments: paymentStats.pendingCount,
      verifiedPayments: paymentStats.verifiedCount,
      totalRevenue: paymentStats.totalRevenue,
      pendingPhotos: photoPendingCount,
    });
  }, [photoPendingCount]);

  useEffect(() => {
    setPendingPhotos(photoPendingCount);
  }, [photoPendingCount]);

  const refreshDashboard = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastRefreshAtRef.current < DASHBOARD_REFRESH_STALE_MS) {
        return;
      }
      lastRefreshAtRef.current = now;

      await Promise.all([refreshApprovals(), refreshPhotoApprovals(), refreshUsers()]);
    },
    [refreshApprovals, refreshPhotoApprovals, refreshUsers],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard]),
  );

  const stats = useMemo(
    () =>
      computeAdminDashboardStats(users, approvals, {
        unreadCount,
        pendingPayments,
        pendingPhotos,
        verifiedPayments,
        totalRevenue,
        paidMembers: users.filter((user) => (user.paidBatches ?? 0) > 0).length,
      }),
    [approvals, pendingPayments, pendingPhotos, totalRevenue, unreadCount, users, verifiedPayments],
  );

  const handleSignOut = useCallback(() => {
    const performSignOut = async () => {
      await signOut();
      router.replace('/' as Href);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(translate('adminLeaveAdmin'))) {
        void performSignOut();
      }
      return;
    }

    Alert.alert(translate('adminSignOutTitle'), translate('adminSignOutBody'), [
      { text: translate('cancel'), style: 'cancel' },
      { text: translate('logout'), style: 'destructive', onPress: () => void performSignOut() },
    ]);
  }, [router, signOut, translate]);

  return (
    <AdminScreenShell
      title={translate('adminDashboard')}
      showLogo
      showLanguageToggle
      headerRight={
        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => router.push('/admin/notifications')}
            hitSlop={8}
          >
            <View style={styles.notificationIconWrap}>
              <MaterialIcons name="notifications-none" size={24} color={adminColors.text} />
              {stats.unreadCount > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {stats.unreadCount > 9 ? '9+' : stats.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={handleSignOut} hitSlop={8}>
            <MaterialIcons name="logout" size={22} color={adminColors.text} />
          </Pressable>
        </View>
      }
    >
        <View style={styles.statsGrid}>
          <AdminStatCard label={translate('adminTotalUsers')} value={stats.totalUsers} icon="groups" />
          <AdminStatCard
            label={translate('adminTotalRevenue')}
            value={formatRevenue(stats.totalRevenue)}
            icon="payments"
            tone="success"
          />
          <AdminStatCard
            label={translate('adminPendingApprovals')}
            value={stats.pendingApprovals}
            icon="pending-actions"
            tone="warning"
            onPress={() => router.push('/admin/(tabs)/users')}
          />
          <AdminStatCard
            label={translate('adminPendingPayments')}
            value={stats.pendingPayments}
            icon="currency-rupee"
            tone="warning"
            onPress={() => router.push('/admin/(tabs)/payments')}
          />
          <AdminStatCard
            label={translate('adminPhotoReviews')}
            value={stats.pendingPhotos}
            icon="photo-library"
            tone="warning"
            onPress={() => router.push('/admin/(tabs)/users?view=photos' as never)}
          />
          <AdminStatCard label={translate('adminPaidMembers')} value={stats.paidMembers} icon="verified" tone="success" />
          <AdminStatCard label={translate('adminSelfRegistered')} value={stats.selfRegistered} icon="person" />
          <AdminStatCard label={translate('adminAdminAdded')} value={stats.adminAdded} icon="person-add" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translate('adminRecentApprovals')}</Text>
          {approvals.slice(0, 3).map((item) => (
            <AdminListItem
              key={item.id}
              title={item.name}
              meta={translateFormat('adminSubmitted', { date: item.submittedAt })}
              badge={translate(adminStatusLabelKey(item.status))}
              badgeColor={
                item.status === 'pending'
                  ? adminColors.warning
                  : item.status === 'approved'
                    ? adminColors.success
                    : adminColors.danger
              }
              onPress={() => router.push(`/admin/view-profile/${item.phone}` as never)}
            />
          ))}
        </View>
      </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  section: {
    gap: 10,
    marginTop: 4,
  },
  sectionTitle: {
    color: adminColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIconWrap: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: adminColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
});
