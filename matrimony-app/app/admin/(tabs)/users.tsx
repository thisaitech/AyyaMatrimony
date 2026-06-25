import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminListItem } from '@/components/admin/AdminListItem';
import { AdminScreenShell } from '@/components/admin/AdminScreenShell';
import type { AdminApprovalRecord } from '@/constants/adminMockData';
import { adminColors } from '@/constants/admin';
import { adminFilterLabelKeys, adminStatusLabelKey } from '@/constants/adminLabels';
import { useAdminApprovals } from '@/context/AdminApprovalsContext';
import { useAdminPhotoApprovals } from '@/context/AdminPhotoApprovalsContext';
import { useLanguage } from '@/context/LanguageContext';

type ApprovalFilter = 'pending' | 'approved' | 'rejected' | 'all';
type ApprovalSection = 'profiles' | 'photos';

const approvalFilters: ApprovalFilter[] = ['pending', 'approved', 'rejected', 'all'];

export default function AdminUsersScreen() {
  const router = useRouter();
  const { translate, translateFormat } = useLanguage();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [section, setSection] = useState<ApprovalSection>(view === 'photos' ? 'photos' : 'profiles');
  const [filter, setFilter] = useState<ApprovalFilter>(
    view === 'approved' ? 'approved' : view === 'rejected' ? 'rejected' : 'pending',
  );
  const { items: approvals, updateStatus, refresh: refreshApprovals } = useAdminApprovals();
  const {
    items: photoItems,
    updateStatus: updatePhotoStatus,
    refresh: refreshPhotos,
    isReady: photosReady,
  } = useAdminPhotoApprovals();
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.allSettled([refreshApprovals(), refreshPhotos()]);
    } finally {
      setIsLoading(false);
    }
  }, [refreshApprovals, refreshPhotos]);

  useFocusEffect(
    useCallback(() => {
      if (view === 'photos') {
        setSection('photos');
      }
      void refresh();
    }, [refresh, view]),
  );

  const filteredApprovals = useMemo(() => {
    if (filter === 'all') {
      return approvals;
    }
    return approvals.filter((item) => item.status === filter);
  }, [approvals, filter]);

  const filteredPhotos = useMemo(() => {
    if (filter === 'all') {
      return photoItems;
    }
    return photoItems.filter((item) => item.status === filter);
  }, [filter, photoItems]);

  const pendingProfileCount = useMemo(
    () => approvals.filter((item) => item.status === 'pending').length,
    [approvals],
  );

  const pendingPhotoCount = useMemo(
    () => photoItems.filter((item) => item.status === 'pending').length,
    [photoItems],
  );

  const updateItemStatus = (id: string, status: AdminApprovalRecord['status']) => {
    void updateStatus(id, status).then(() => {
      Alert.alert(
        translate('adminProfileUpdated'),
        translateFormat('adminProfileUpdatedBody', {
          status: translate(adminStatusLabelKey(status)),
        }),
      );
      void refresh();
    });
  };

  const openProfile = (phone: string) => {
    router.push(`/admin/view-profile/${phone}` as never);
  };

  const handlePhotoApprove = (item: (typeof photoItems)[number]) => {
    void updatePhotoStatus(item.id, 'approved').then(() => void refresh());
  };

  const handlePhotoReject = (item: (typeof photoItems)[number]) => {
    Alert.alert(translate('adminRejectPhotoTitle'), translate('adminRejectPhotoBody'), [
      { text: translate('cancel'), style: 'cancel' },
      {
        text: translate('adminReject'),
        style: 'destructive',
        onPress: () => {
          void updatePhotoStatus(item.id, 'rejected', {
            rejectReason: translate('adminPhotoRejectReason'),
          }).then(() => void refresh());
        },
      },
    ]);
  };

  const activeItems = section === 'profiles' ? filteredApprovals : filteredPhotos;

  return (
    <AdminScreenShell
      title={translate('adminApprovals')}
      showLanguageToggle
    >
      <View style={styles.sectionToggle}>
        <Pressable
          style={[styles.sectionChip, section === 'profiles' && styles.sectionChipActive]}
          onPress={() => setSection('profiles')}
        >
          <Text style={[styles.sectionChipText, section === 'profiles' && styles.sectionChipTextActive]}>
            {translate('adminApprovalProfiles')}
            {pendingProfileCount > 0 ? ` (${pendingProfileCount})` : ''}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.sectionChip, section === 'photos' && styles.sectionChipActive]}
          onPress={() => setSection('photos')}
        >
          <Text style={[styles.sectionChipText, section === 'photos' && styles.sectionChipTextActive]}>
            {translate('adminApprovalPhotos')}
            {pendingPhotoCount > 0 ? ` (${pendingPhotoCount})` : ''}
          </Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {approvalFilters.map((item) => {
          const active = filter === item;
          const count =
            item === 'all'
              ? section === 'profiles'
                ? approvals.length
                : photoItems.length
              : (section === 'profiles' ? approvals : photoItems).filter(
                  (entry) => entry.status === item,
                ).length;
          return (
            <Pressable
              key={item}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {translate(adminFilterLabelKeys[item])}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading || (section === 'photos' && !photosReady) ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={adminColors.primary} />
        </View>
      ) : activeItems.length === 0 ? (
        <AdminEmptyState
          icon={section === 'profiles' ? 'fact-check' : 'photo-library'}
          title={
            filter === 'pending'
              ? section === 'profiles'
                ? translate('adminNoPendingApprovals')
                : translate('adminNoPendingPhotoApprovals')
              : section === 'profiles'
                ? translate('adminNoApprovalRecords')
                : translate('adminNoPhotoApprovalRecords')
          }
          message={
            filter === 'pending'
              ? section === 'profiles'
                ? translate('adminNoApprovalPendingMessage')
                : translate('adminNoPhotoApprovalPendingMessage')
              : translateFormat('adminNoApprovalFilterMessage', {
                  status: translate(adminFilterLabelKeys[filter === 'all' ? 'pending' : filter]),
                })
          }
        />
      ) : section === 'profiles' ? (
        <View style={styles.list}>
          {filteredApprovals.map((item) => (
            <View key={item.id} style={styles.approvalCard}>
              <AdminListItem
                title={item.name}
                subtitle={item.phone}
                meta={translateFormat('adminSubmitted', { date: item.submittedAt })}
                badge={translate(adminStatusLabelKey(item.status))}
                badgeColor={
                  item.status === 'pending'
                    ? adminColors.warning
                    : item.status === 'approved'
                      ? adminColors.success
                      : adminColors.danger
                }
                onPress={() => openProfile(item.phone)}
              />
              {item.status === 'pending' ? (
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => openProfile(item.phone)}
                  >
                    <Text style={styles.viewText}>{translate('adminViewProfile')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => updateItemStatus(item.id, 'approved')}
                  >
                    <Text style={styles.approveText}>{translate('adminApprove')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => updateItemStatus(item.id, 'rejected')}
                  >
                    <Text style={styles.rejectText}>{translate('adminReject')}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.actionButton, styles.viewButton, styles.viewButtonSolo]}
                  onPress={() => openProfile(item.phone)}
                >
                  <Text style={styles.viewText}>{translate('adminViewProfile')}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {filteredPhotos.map((item) => (
            <View key={item.id} style={styles.photoCard}>
              <Image source={{ uri: item.photoUrl }} style={styles.photo} resizeMode="cover" />
              <AdminListItem
                title={item.memberName}
                subtitle={item.phone}
                meta={`${translateFormat('adminPhotoSlot', { slot: item.slot + 1 })} · ${item.submittedAt}`}
                badge={translate(adminStatusLabelKey(item.status))}
                badgeColor={
                  item.status === 'approved'
                    ? adminColors.success
                    : item.status === 'pending'
                      ? adminColors.warning
                      : adminColors.danger
                }
                onPress={() => openProfile(item.phone)}
              />
              {item.status === 'pending' ? (
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => openProfile(item.phone)}
                  >
                    <Text style={styles.viewText}>{translate('adminViewProfile')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handlePhotoApprove(item)}
                  >
                    <Text style={styles.approveText}>{translate('adminApprove')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handlePhotoReject(item)}
                  >
                    <Text style={styles.rejectText}>{translate('adminReject')}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.actionButton, styles.viewButton, styles.viewButtonSolo]}
                  onPress={() => openProfile(item.phone)}
                >
                  <Text style={styles.viewText}>{translate('adminViewProfile')}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  sectionToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: adminColors.surface,
    borderWidth: 1,
    borderColor: adminColors.border,
  },
  sectionChipActive: {
    backgroundColor: adminColors.primary,
    borderColor: adminColors.primary,
  },
  sectionChipText: {
    color: adminColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionChipTextActive: {
    color: '#fff',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: adminColors.surface,
    borderWidth: 1,
    borderColor: adminColors.border,
  },
  chipActive: {
    backgroundColor: adminColors.primary,
    borderColor: adminColors.primary,
  },
  chipText: {
    color: adminColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  loading: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  list: {
    gap: 10,
    marginTop: 4,
  },
  approvalCard: {
    gap: 8,
  },
  photoCard: {
    gap: 8,
    backgroundColor: adminColors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: adminColors.border,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: adminColors.border,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  viewButton: {
    backgroundColor: adminColors.surface,
    borderColor: adminColors.border,
  },
  viewButtonSolo: {
    flex: 0,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
  },
  approveButton: {
    backgroundColor: `${adminColors.success}14`,
    borderColor: `${adminColors.success}55`,
  },
  rejectButton: {
    backgroundColor: `${adminColors.danger}10`,
    borderColor: `${adminColors.danger}44`,
  },
  viewText: {
    color: adminColors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  approveText: {
    color: adminColors.success,
    fontWeight: '700',
    fontSize: 12,
  },
  rejectText: {
    color: adminColors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
});
