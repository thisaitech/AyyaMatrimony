import { useCallback, useMemo } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApprovalStatusBanner } from '@/components/ApprovalStatusBanner';
import { PendingPaymentBanner } from '@/components/PendingPaymentBanner';
import { ProtectedProfileImage } from '@/components/ProtectedProfileImage';
import { UpgradePrimeBanner } from '@/components/UpgradePrimeBanner';
import { ProfileQuickActionsRow } from '@/components/ProfileQuickActionsRow';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import { useMemberDirectory } from '@/context/MemberDirectoryContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useUserApproval } from '@/context/UserApprovalContext';
import { useMatchActions } from '@/context/MatchActionsContext';
import { useOpenMemberProfile, useRequirePaidContact } from '@/hooks/useOpenMemberProfile';
import {
  getProfileAvatarSource,
  getProfileFirstName,
} from '@/constants/profileDisplay';
import { useBrowsableMembers } from '@/hooks/useBrowsableMembers';
import { useMemberAccess } from '@/hooks/useMemberAccess';
import { borderRadius, colors, fonts, spacing, typography } from '@/constants/theme';

type HomeMatch = ReturnType<typeof useBrowsableMembers>[number];

export default function HomeScreen() {
  const router = useRouter();
  const { translate, translateFormat, toggleLanguage, language } = useLanguage();
  const { values, refreshFromFirestore } = useProfileForm();
  const { refresh: refreshDirectory } = useMemberDirectory();
  const { isPaidMember, isPrimeViewActive, membershipViewMode, setMembershipViewMode, profilesAllowed } =
    useSubscription();
  const { canSeeMemberProfiles, canViewFullProfile } = useMemberAccess();
  const { refresh: refreshApproval } = useUserApproval();
  const recommendedMatches = useBrowsableMembers();
  const profileName = getProfileFirstName(values.fullName ?? '') || translate('profile');
  const avatarSource = getProfileAvatarSource(values);
  const homeMatches = useMemo(() => {
    if (!isPaidMember) {
      return recommendedMatches;
    }
    return recommendedMatches.slice(0, profilesAllowed);
  }, [isPaidMember, profilesAllowed, recommendedMatches]);

  const notificationCount = 0;

  useFocusEffect(
    useCallback(() => {
      void refreshApproval();
      void refreshFromFirestore();
      void refreshDirectory();
    }, [refreshApproval, refreshDirectory, refreshFromFirestore]),
  );

  const handlePrimePress = () => {
    if (!isPaidMember) {
      router.push('/upgrade');
      return;
    }
    setMembershipViewMode(membershipViewMode === 'prime' ? 'regular' : 'prime');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.heroSection}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.headerLeft}
              onPress={() => router.push('/add-photos')}
            >
              <View style={styles.avatarWrap}>
                <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
                <View style={styles.avatarStatusDot} />
              </View>

              <View style={styles.greetingWrap}>
                <Text
                  style={[styles.greetingHello, language === 'ta' && styles.greetingHelloTamil]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {translateFormat('helloName', { name: profileName })}
                </Text>
                <Text
                  style={[styles.greetingSubtitle, language === 'ta' && styles.greetingSubtitleTamil]}
                  numberOfLines={2}
                >
                  {translate('welcomeBackHome')}
                </Text>
              </View>
            </Pressable>

            <View style={styles.headerRight}>
              <Pressable
                style={[
                  styles.primeBadge,
                  isPrimeViewActive && styles.primeBadgeActive,
                  language === 'ta' && styles.primeBadgeTamil,
                ]}
                onPress={handlePrimePress}
              >
                <MaterialIcons name="star" size={language === 'ta' ? 16 : 14} color={colors.gold} />
                {language === 'ta' ? null : (
                  <Text style={styles.primeBadgeText}>{translate('prime')}</Text>
                )}
              </Pressable>

              <Pressable style={styles.headerIconBtn} onPress={toggleLanguage} hitSlop={8}>
                <MaterialIcons name="translate" size={22} color={colors.onSurface} />
              </Pressable>

              <Pressable
                style={styles.headerIconBtn}
                onPress={() => router.push('/notifications')}
                hitSlop={8}
              >
                <View style={styles.notificationIconWrap}>
                  <MaterialIcons name="notifications-none" size={24} color={colors.onSurface} />
                  {notificationCount > 0 ? (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            </View>
          </View>

          {!isPaidMember ? (
            <View style={styles.bannerWrap}>
              <UpgradePrimeBanner />
            </View>
          ) : null}

          <ProfileQuickActionsRow />

          <ApprovalStatusBanner />

          <PendingPaymentBanner />

        </View>

        {canSeeMemberProfiles ? (
        <View style={styles.matchesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text
              style={[
                styles.sectionHeadingDark,
                language === 'ta' && styles.sectionHeadingTamil,
              ]}
              numberOfLines={2}
            >
              {translate('dailyRecommendations')}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/matches')}
              hitSlop={8}
              style={styles.viewAllWrap}
            >
              <Text style={[styles.viewAll, language === 'ta' && styles.viewAllTamil]}>
                {translate('viewAll')}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {homeMatches.map((match) => (
              <HomeRecommendationCard
                key={match.id}
                match={match}
                locked={!canViewFullProfile(match.id)}
              />
            ))}
          </ScrollView>

          <View style={styles.matchesSubsectionDivider} />

          <View style={styles.homePromoHeaderRow}>
            <Text
              style={[
                styles.homePromoAllMatchesTitle,
                language === 'ta' && styles.homePromoAllMatchesTitleTamil,
              ]}
              numberOfLines={2}
            >
              {translateFormat('allMatchesSectionTitle', {
                count: homeMatches.length.toLocaleString(),
              })}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/matches')}
              hitSlop={8}
              style={styles.viewAllWrap}
            >
              <Text
                style={[
                  styles.homePromoViewAllText,
                  language === 'ta' && styles.viewAllTamil,
                ]}
              >
                {translate('viewAllChevron')}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.homePromoMatchList}
          >
            {homeMatches.map((match) => (
              <HomeAllMatchPreviewCard
                key={`all-${match.id}`}
                match={match}
                locked={!canViewFullProfile(match.id)}
              />
            ))}
          </ScrollView>
        </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeAllMatchPreviewCard({ match, locked }: { match: HomeMatch; locked: boolean }) {
  const openProfile = useOpenMemberProfile();
  const ageLine = match.age.replace(/\s*Years?/gi, ' Yrs');

  return (
    <Pressable
      style={styles.homePromoMatchCard}
      onPress={() => openProfile(match.id)}
    >
      <ProtectedProfileImage
        imageUri={match.image}
        locked={locked}
        style={styles.homePromoMatchImage}
        imageStyle={styles.homePromoMatchImage}
      />
      <Text style={styles.homePromoMatchName} numberOfLines={1}>
        {match.name.split(' ')[0]}
      </Text>
      <Text style={styles.homePromoMatchMeta} numberOfLines={1}>
        {ageLine}
      </Text>
    </Pressable>
  );
}

function HomeRecommendationCard({ match, locked }: { match: HomeMatch; locked: boolean }) {
  const router = useRouter();
  const openProfile = useOpenMemberProfile();
  const requirePaidContact = useRequirePaidContact();
  const { translate, translateFormat, language } = useLanguage();
  const { isShortlisted, hasSentInterest, toggleShortlist, sendInterest } = useMatchActions();

  const shortlisted = isShortlisted(match.id);
  const interestSent = hasSentInterest(match.id);

  const handleShortlist = () => {
    if (!requirePaidContact()) {
      return;
    }

    void toggleShortlist(match.id).then((result) => {
      Alert.alert(
        translate('shortlist'),
        result === 'added'
          ? translateFormat('shortlistAddedFormat', { name: match.name })
          : translateFormat('shortlistRemovedFormat', { name: match.name }),
      );
    });
  };

  const handleInterest = () => {
    if (!requirePaidContact()) {
      return;
    }

    if (interestSent) {
      Alert.alert(translate('interest'), translateFormat('interestAlreadySentFormat', { name: match.name }));
      router.push({ pathname: '/(tabs)/interests', params: { direction: 'sent' } });
      return;
    }

    void sendInterest({
      memberId: match.id,
      memberName: match.name,
      memberImage: match.image,
      age: match.age,
      community: match.community,
      location: match.location,
    }).then((result) => {
      Alert.alert(
        translate('interest'),
        result === 'sent'
          ? translateFormat('interestSentFormat', { name: match.name })
          : translateFormat('interestAlreadySentFormat', { name: match.name }),
      );
      router.push({ pathname: '/(tabs)/interests', params: { direction: 'sent' } });
    });
  };

  return (
    <View style={styles.recommendCard}>
      <Pressable
        style={styles.recommendCardPressable}
        onPress={() => openProfile(match.id)}
      >
        <ProtectedProfileImage
          imageUri={match.image}
          locked={locked}
          style={styles.recommendImage}
          imageStyle={styles.recommendImage}
        />
        {match.verified ? (
          <View style={styles.crownBadge}>
            <MaterialIcons name="workspace-premium" size={14} color="#fff" />
          </View>
        ) : null}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.recommendGradient} />
        <View style={styles.recommendFooter}>
          <Text style={styles.recommendName} numberOfLines={1}>
            {match.name}
          </Text>
          <Text style={styles.recommendMeta} numberOfLines={1}>
            {locked ? translate('detailsLocked') : match.age}
          </Text>
        </View>
      </Pressable>
      <View style={styles.recommendActions}>
        <Pressable style={styles.recommendOutlineBtn} onPress={handleShortlist}>
          <MaterialIcons
            name={shortlisted ? 'star' : 'star-outline'}
            size={14}
            color={colors.primary}
          />
        </Pressable>
        <Pressable style={styles.recommendPrimaryBtn} onPress={handleInterest}>
          <MaterialIcons name="favorite" size={14} color={colors.onPrimary} />
          <Text
            style={[
              styles.recommendPrimaryText,
              language === 'ta' && styles.recommendPrimaryTextTamil,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {interestSent ? translate('interestSentBtn') : translate('interest')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: spacing.lg,
  },
  heroSection: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    gap: spacing.sm,
    backgroundColor: '#ffffff',
  },
  bannerWrap: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  greetingWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  greetingHello: {
    ...typography.titleLg,
    color: colors.primary,
    fontSize: 16,
    lineHeight: 22,
  },
  greetingHelloTamil: {
    fontSize: 14,
    lineHeight: 18,
  },
  greetingSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
  },
  greetingSubtitleTamil: {
    fontSize: 11,
    lineHeight: 14,
  },
  primeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.surfaceContainerLowest,
  },
  primeBadgeActive: {
    backgroundColor: '#FFF8E7',
  },
  primeBadgeTamil: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  primeBadgeText: {
    ...typography.labelSm,
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
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
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: colors.onPrimary,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fonts.interSemi,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarStatusDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: '#fff',
  },
  matchesSection: {
    backgroundColor: '#fff',
    marginTop: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  matchesSubsectionDivider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.containerMargin,
    marginTop: spacing.xs,
    opacity: 0.45,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  viewAll: {
    ...typography.labelLg,
    color: colors.surfaceTint,
    flexShrink: 0,
  },
  viewAllTamil: {
    fontSize: 12,
    lineHeight: 16,
  },
  viewAllWrap: {
    flexShrink: 0,
    paddingTop: 2,
  },
  horizontalList: {
    paddingHorizontal: spacing.containerMargin,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  dailyHeaderText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sectionHeadingDark: {
    ...typography.titleLg,
    color: colors.onSurface,
    flex: 1,
    minWidth: 0,
  },
  sectionHeadingTamil: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fonts.interSemi,
  },
  recommendCard: {
    width: 148,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  recommendCardPressable: {
    height: 176,
    overflow: 'hidden',
  },
  recommendImage: {
    width: '100%',
    height: '100%',
  },
  recommendGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  crownBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(115, 92, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.sm,
  },
  recommendName: {
    ...typography.labelLg,
    color: '#fff',
    fontFamily: fonts.interSemi,
  },
  recommendMeta: {
    ...typography.labelSm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  recommendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.xs,
  },
  recommendOutlineBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendPrimaryBtn: {
    flex: 1,
    minWidth: 0,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
  },
  recommendPrimaryText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontSize: 11,
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'center',
  },
  recommendPrimaryTextTamil: {
    fontSize: 8,
    lineHeight: 11,
  },
  homePromoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
    marginBottom: spacing.xs,
  },
  homePromoAllMatchesTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    fontFamily: fonts.interSemi,
    fontSize: 20,
    flex: 1,
    minWidth: 0,
  },
  homePromoAllMatchesTitleTamil: {
    fontSize: 16,
    lineHeight: 22,
  },
  homePromoMatchList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.containerMargin,
  },
  homePromoMatchCard: {
    width: 108,
    alignItems: 'center',
  },
  homePromoMatchImage: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    marginBottom: spacing.xs,
  },
  homePromoMatchName: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontFamily: fonts.interSemi,
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
  },
  homePromoMatchMeta: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
  },
  homePromoViewAllText: {
    ...typography.labelLg,
    color: '#F57C00',
    fontFamily: fonts.interSemi,
    fontSize: 14,
    flexShrink: 0,
  },
});
