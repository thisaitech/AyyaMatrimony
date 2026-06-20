import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MembershipToggle } from '@/components/MembershipToggle';
import { ProtectedProfileImage } from '@/components/ProtectedProfileImage';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useMatchActions } from '@/context/MatchActionsContext';
import { useOpenMemberProfile, useRequirePaidContact } from '@/hooks/useOpenMemberProfile';
import { borderRadius, colors, fonts, spacing, typography } from '@/constants/theme';

type DirectionTab = 'received' | 'sent';
type StatusFilter = 'all' | 'pending' | 'accepted' | 'declined';

type InterestItem = {
  id: string;
  name: string;
  image: string;
  summaryLine: string;
  profession: string;
  salary: string;
  location: string;
  interestDate: string;
  direction: DirectionTab;
  filterStatus: StatusFilter;
  pronoun: 'he' | 'she';
};

function formatProfileSummary(age: string, community: string) {
  const parts = age.split(',').map((part) => part.trim());
  const agePart = parts[0]?.replace(/\s*Years?/i, ' yrs') ?? age;
  const heightPart = parts[1];
  const communityShort = community.split(',')[0]?.trim() ?? community;
  return heightPart
    ? `${agePart} · ${heightPart} · ${communityShort} · B.Tech.`
    : `${agePart} · ${communityShort}`;
}

function InterestCard({ item, locked }: { item: InterestItem; locked: boolean }) {
  const openProfile = useOpenMemberProfile();
  const requirePaidContact = useRequirePaidContact();
  const { translate } = useLanguage();

  return (
    <View style={styles.interestCard}>
      <View style={styles.cardTopRow}>
        <Pressable onPress={() => openProfile(item.id)}>
          <ProtectedProfileImage
            imageUri={item.image}
            locked={locked}
            style={styles.cardAvatar}
            imageStyle={styles.cardAvatar}
          />
        </Pressable>

        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Pressable onPress={() => openProfile(item.id)} style={styles.namePressable}>
              <Text style={styles.cardName}>{item.name}</Text>
            </Pressable>
            <Pressable hitSlop={8} style={styles.cardMenuBtn}>
              <MaterialIcons name="more-vert" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <Text style={styles.summaryLine}>
            {locked ? translate('detailsLocked') : item.summaryLine}
          </Text>
          {locked ? null : (
            <>
              <Text style={styles.detailLine}>{item.profession}</Text>
              <Text style={styles.detailLine}>{item.salary}</Text>
            </>
          )}
          <Text style={styles.detailLine}>{item.location}</Text>
        </View>
      </View>

      {item.direction === 'received' && item.filterStatus === 'pending' ? (
        <View style={styles.cardActions}>
          <Pressable
            style={styles.declineBtn}
            onPress={() => {
              if (!requirePaidContact()) {
                return;
              }
            }}
          >
            <MaterialIcons name="thumb-down-alt" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.declineText}>{translate('decline')}</Text>
          </Pressable>
          <Pressable
            style={styles.acceptBtn}
            onPress={() => {
              if (!requirePaidContact()) {
                return;
              }
            }}
          >
            <MaterialIcons name="thumb-up-alt" size={18} color={colors.onPrimary} />
            <Text style={styles.acceptText}>{translate('acceptInterest')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function InterestsScreen() {
  const { direction } = useLocalSearchParams<{ direction?: string | string[] }>();
  const { translate } = useLanguage();
  const { canViewFullProfile } = useSubscription();
  const { sentInterests } = useMatchActions();
  const [directionTab, setDirectionTab] = useState<DirectionTab>('received');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  useEffect(() => {
    const requestedDirection = Array.isArray(direction) ? direction[0] : direction;
    if (requestedDirection === 'sent') {
      setDirectionTab('sent');
      setStatusFilter('all');
    }
  }, [direction]);

  const allInterests: InterestItem[] = useMemo(
    () =>
      sentInterests.map((entry) => ({
        id: entry.memberId,
        name: entry.memberName,
        image: entry.memberImage,
        summaryLine: formatProfileSummary(entry.age, entry.community),
        profession: '—',
        salary: '—',
        location: entry.location,
        interestDate: entry.sentAt,
        direction: 'sent' as const,
        filterStatus: entry.status,
        pronoun: 'he' as const,
      })),
    [sentInterests],
  );

  const directionInterests = useMemo(
    () => allInterests.filter((item) => item.direction === directionTab),
    [allInterests, directionTab],
  );

  const filterCounts = useMemo(
    () => ({
      all: directionInterests.length,
      pending: directionInterests.filter((item) => item.filterStatus === 'pending').length,
      accepted: directionInterests.filter((item) => item.filterStatus === 'accepted').length,
      declined: directionInterests.filter((item) => item.filterStatus === 'declined').length,
    }),
    [directionInterests],
  );

  const visibleInterests = useMemo(() => {
    if (statusFilter === 'all') {
      return directionInterests;
    }
    return directionInterests.filter((item) => item.filterStatus === statusFilter);
  }, [directionInterests, statusFilter]);

  const statusFilters: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: translate('allTab'), count: filterCounts.all },
    { key: 'pending', label: translate('pending'), count: filterCounts.pending },
    { key: 'accepted', label: translate('acceptedReplied'), count: filterCounts.accepted },
    { key: 'declined', label: translate('declined'), count: filterCounts.declined },
  ];

  const directionTabs: { key: DirectionTab; label: string; dot?: boolean }[] = [
    { key: 'received', label: translate('interestsReceived'), dot: true },
    { key: 'sent', label: translate('interestsSent') },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.topUtilityRow}>
          <MembershipToggle variant="outlined" />
        </View>

        <View style={styles.tabsRow}>
          {directionTabs.map((tab) => {
            const isActive = directionTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={styles.tabItem}
                onPress={() => {
                  setDirectionTab(tab.key);
                  setStatusFilter(tab.key === 'received' ? 'pending' : 'all');
                }}
              >
                <View style={styles.tabLabelRow}>
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                  {tab.dot && isActive ? <View style={styles.tabDot} /> : null}
                </View>
                {isActive ? <View style={styles.tabIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionDivider} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {statusFilters.map((chip) => {
            const isActive = statusFilter === chip.key;
            const label = `${chip.label} (${chip.count})`;

            return isActive ? (
              <Pressable key={chip.key} onPress={() => setStatusFilter(chip.key)}>
                <LinearGradient
                  colors={[colorsLocal.chipGradientStart, colorsLocal.chipGradientEnd]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.filterChipActive}
                >
                  <Text style={styles.filterChipTextActive}>{label}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                key={chip.key}
                style={styles.filterChip}
                onPress={() => setStatusFilter(chip.key)}
              >
                <Text style={styles.filterChipText}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {visibleInterests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="favorite-border" size={40} color={colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>{translate('noInterestsInFilter')}</Text>
          </View>
        ) : (
          visibleInterests.map((item) => (
            <InterestCard key={item.id} item={item} locked={!canViewFullProfile(item.id)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const colorsLocal = {
  tabActive: '#00897B',
  chipBorder: '#D9D9D9',
  chipGradientStart: '#00897B',
  chipGradientEnd: '#26A69A',
  cardTint: '#EEF3F8',
  ctaOrange: '#F57C00',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  header: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.sm,
  },
  topUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    marginBottom: spacing.md,
  },
  membershipToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colorsLocal.chipBorder,
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  togglePillActive: {
    borderWidth: 1,
    borderColor: colorsLocal.ctaOrange,
    backgroundColor: colors.surfaceContainerLowest,
  },
  toggleText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontSize: 12,
  },
  toggleTextActive: {
    color: colorsLocal.ctaOrange,
    fontFamily: fonts.interSemi,
  },
  primeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
  },
  tabText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    fontSize: 13,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colorsLocal.tabActive,
    fontFamily: fonts.interSemi,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colorsLocal.ctaOrange,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.sm,
    right: spacing.sm,
    height: 3,
    borderRadius: 2,
    backgroundColor: colorsLocal.tabActive,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colorsLocal.chipBorder,
    marginVertical: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colorsLocal.chipBorder,
    backgroundColor: '#FFF8F0',
  },
  filterChipActive: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  filterChipText: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontSize: 13,
  },
  filterChipTextActive: {
    ...typography.labelLg,
    color: '#fff',
    fontSize: 13,
    fontFamily: fonts.interSemi,
  },
  listScroll: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
  },
  listContent: {
    padding: spacing.containerMargin,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  interestCard: {
    backgroundColor: colorsLocal.cardTint,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#D6E4F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardAvatar: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainerHigh,
  },
  cardInfo: {
    flex: 1,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  namePressable: {
    flex: 1,
  },
  cardName: {
    ...typography.titleLg,
    fontSize: 16,
    color: colors.onSurface,
    fontFamily: fonts.interSemi,
  },
  cardMenuBtn: {
    padding: 2,
  },
  summaryLine: {
    ...typography.bodyMd,
    color: colors.onSurface,
    marginTop: 4,
    fontSize: 13,
  },
  detailLine: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    fontSize: 13,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colorsLocal.chipBorder,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colorsLocal.chipBorder,
    backgroundColor: colors.surfaceContainerLowest,
  },
  declineText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  acceptBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colorsLocal.ctaOrange,
  },
  acceptText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontSize: 13,
    fontFamily: fonts.interSemi,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
