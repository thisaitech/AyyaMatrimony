import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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
import { getMemberBiodataValues, type PublishedMember } from '@/constants/memberDirectory';
import { getOptionLabel } from '@/constants/formOptions';
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
  const { refresh: refreshDirectory, published } = useMemberDirectory();
  const { isPaidMember, isPrimeViewActive, membershipViewMode, setMembershipViewMode, profilesAllowed, skipProfile } =
    useSubscription();
  const { canSeeMemberProfiles, canViewFullProfile } = useMemberAccess();
  const { refresh: refreshApproval } = useUserApproval();
  const recommendedMatches = useBrowsableMembers();
  const profileName = getProfileFirstName(values.fullName ?? '') || translate('profile');
  const avatarSource = getProfileAvatarSource(values, { includePendingUploads: true });
  const recommendCardWidth = useWindowDimensions().width - spacing.containerMargin * 2;
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

          <HomeRecommendationDeck
            matches={homeMatches}
            cardWidth={recommendCardWidth}
            published={published}
            canViewFullProfile={canViewFullProfile}
            onSkip={skipProfile}
          />

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

function getRecommendationMatchPercent(matchId: string): number {
  let hash = 0;
  for (let index = 0; index < matchId.length; index += 1) {
    hash = (hash + matchId.charCodeAt(index) * (index + 3)) % 97;
  }
  return 85 + (hash % 13);
}

const RECOMMEND_CARD_HEIGHT = 430;
const STACK_PEEK_OFFSET = 14;
const STACK_SCALE_STEP = 0.045;

function SwipeableRecommendationCard({
  cardWidth,
  onSwipeLeft,
  onSwipeRight,
  canSwipeRight,
  children,
}: {
  cardWidth: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  canSwipeRight: () => boolean;
  children: React.ReactNode;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const threshold = cardWidth * 0.22;
  const exitDistance = cardWidth * 1.25;

  const resetPosition = () => {
    translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
  };

  const dismissCard = (direction: 'left' | 'right') => {
    const targetX = direction === 'left' ? -exitDistance : exitDistance;
    translateX.value = withTiming(targetX, { duration: 220 }, (finished) => {
      if (!finished) {
        return;
      }

      if (direction === 'left') {
        runOnJS(onSwipeLeft)();
      } else {
        runOnJS(onSwipeRight)();
      }
    });
  };

  const handleRelease = (translationX: number, velocityX: number) => {
    const swipeLeft = translationX < -threshold || velocityX < -650;
    const swipeRight = translationX > threshold || velocityX > 650;

    if (swipeLeft) {
      dismissCard('left');
      return;
    }

    if (swipeRight) {
      if (!canSwipeRight()) {
        resetPosition();
        return;
      }
      dismissCard('right');
      return;
    }

    resetPosition();
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-14, 14])
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.12;
    })
    .onEnd((event) => {
      runOnJS(handleRelease)(event.translationX, event.velocityX);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${(translateX.value / cardWidth) * 12}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}

function HomeRecommendationDeck({
  matches,
  cardWidth,
  published,
  canViewFullProfile,
  onSkip,
}: {
  matches: HomeMatch[];
  cardWidth: number;
  published: PublishedMember[];
  canViewFullProfile: (profileId: string) => boolean;
  onSkip: (profileId: string) => Promise<void>;
}) {
  const { translate } = useLanguage();
  const [deckDismissedIds, setDeckDismissedIds] = useState<string[]>([]);
  const deckMatches = useMemo(
    () => matches.filter((match) => !deckDismissedIds.includes(match.id)).slice(0, 3),
    [deckDismissedIds, matches],
  );
  const dismissFromDeck = useCallback((profileId: string) => {
    setDeckDismissedIds((current) =>
      current.includes(profileId) ? current : [...current, profileId],
    );
  }, []);
  const maxDepth = Math.max(0, deckMatches.length - 1);
  const deckHeight = RECOMMEND_CARD_HEIGHT + maxDepth * STACK_PEEK_OFFSET;

  if (deckMatches.length === 0) {
    return (
      <View style={[styles.recommendDeck, { height: RECOMMEND_CARD_HEIGHT + STACK_PEEK_OFFSET }]}>
        <Text style={styles.recommendDeckEmpty}>{translate('noMoreRecommendations')}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.recommendDeck,
        { height: deckHeight, paddingTop: maxDepth * STACK_PEEK_OFFSET },
      ]}
    >
      {deckMatches.map((match, index) => {
        const depth = deckMatches.length - 1 - index;
        const isTop = depth === 0;

        return (
          <View
            key={match.id}
            pointerEvents={isTop ? 'auto' : 'none'}
            style={[
              styles.recommendDeckLayer,
              {
                width: cardWidth,
                top: -depth * STACK_PEEK_OFFSET,
                zIndex: 10 - depth,
                transform: [{ scale: 1 - depth * STACK_SCALE_STEP }],
              },
            ]}
          >
            <HomeRecommendationCard
              match={match}
              locked={!canViewFullProfile(match.id)}
              cardWidth={cardWidth}
              published={published}
              onSkip={onSkip}
              showActions={isTop}
              onDismissFromDeck={() => dismissFromDeck(match.id)}
            />
          </View>
        );
      })}
    </View>
  );
}

function HomeRecommendationCard({
  match,
  locked,
  cardWidth,
  published,
  onSkip,
  showActions = true,
  onDismissFromDeck,
}: {
  match: HomeMatch;
  locked: boolean;
  cardWidth: number;
  published: PublishedMember[];
  onSkip: (profileId: string) => Promise<void>;
  showActions?: boolean;
  onDismissFromDeck?: () => void;
}) {
  const router = useRouter();
  const openProfile = useOpenMemberProfile();
  const requirePaidContact = useRequirePaidContact();
  const { translate, translateFormat, language } = useLanguage();
  const { hasSentInterest, sendInterest } = useMatchActions();

  const interestSent = hasSentInterest(match.id);
  const biodata = getMemberBiodataValues(match.id, published) ?? {};
  const education = biodata.education?.trim();
  const occupation = biodata.occupationDesignation?.trim() || biodata.occupation?.trim();
  const religion =
    biodata.registrationCommunity?.trim() || biodata.religion?.trim() || match.community;
  const maritalStatus = biodata.maritalStatus?.trim();
  const maritalLabel = maritalStatus
    ? getOptionLabel('maritalStatusBiodata', maritalStatus, language, translate('neverMarried'))
    : translate('neverMarried');
  const workLine = [education, occupation].filter(Boolean).join(', ');
  const matchPercent = getRecommendationMatchPercent(match.id);

  const handleSkip = () => {
    onDismissFromDeck?.();
    void onSkip(match.id);
  };

  const handleInterest = (fromSwipe = false) => {
    if (!requirePaidContact()) {
      return;
    }

    if (fromSwipe) {
      onDismissFromDeck?.();
    }

    if (interestSent) {
      if (!fromSwipe) {
        Alert.alert(translate('interest'), translateFormat('interestAlreadySentFormat', { name: match.name }));
        router.push({ pathname: '/(tabs)/interests', params: { direction: 'sent' } });
      }
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
      if (fromSwipe) {
        Alert.alert(
          translate('interest'),
          result === 'sent'
            ? translateFormat('interestSentFormat', { name: match.name })
            : translateFormat('interestAlreadySentFormat', { name: match.name }),
        );
        return;
      }

      Alert.alert(
        translate('interest'),
        result === 'sent'
          ? translateFormat('interestSentFormat', { name: match.name })
          : translateFormat('interestAlreadySentFormat', { name: match.name }),
      );
      router.push({ pathname: '/(tabs)/interests', params: { direction: 'sent' } });
    });
  };

  const canSwipeRight = useCallback(() => requirePaidContact(), [requirePaidContact]);

  const cardBody = (
    <View style={[styles.recommendCard, { width: cardWidth }]}>
      <Pressable style={styles.recommendCardPressable} onPress={() => openProfile(match.id)}>
        <ProtectedProfileImage
          imageUri={match.image}
          locked={locked}
          style={styles.recommendImage}
          imageStyle={styles.recommendImage}
        />

        <View style={styles.matchScoreBadge}>
          <Text style={styles.matchScoreText}>
            {translateFormat('matchScoreFormat', { percent: matchPercent })}
          </Text>
        </View>

        <Pressable
          style={styles.recommendInfoBtn}
          onPress={(event) => {
            event.stopPropagation();
            openProfile(match.id);
          }}
          hitSlop={8}
        >
          <MaterialIcons name="info-outline" size={18} color={colors.onSurface} />
        </Pressable>

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.82)']} style={styles.recommendGradient} />

        <View style={styles.recommendFooter}>
          <View style={styles.recommendNameRow}>
            <Text style={styles.recommendName} numberOfLines={1}>
              {match.name}
            </Text>
            <View style={styles.onlineDot} />
          </View>

          <Text style={styles.recommendMeta} numberOfLines={1}>
            {locked ? translate('detailsLocked') : match.age}
          </Text>
          {!locked && workLine ? (
            <Text style={styles.recommendMeta} numberOfLines={1}>
              {workLine}
            </Text>
          ) : null}
          {!locked ? (
            <Text style={styles.recommendMeta} numberOfLines={1}>
              {match.location}
            </Text>
          ) : null}

          <View style={styles.recommendTags}>
            {!locked ? (
              <>
                <View style={styles.recommendTag}>
                  <MaterialIcons name="school" size={12} color="#fff" />
                  <Text style={styles.recommendTagText} numberOfLines={1}>
                    {religion}
                  </Text>
                </View>
                <View style={styles.recommendTag}>
                  <MaterialIcons name="work-outline" size={12} color="#fff" />
                  <Text style={styles.recommendTagText} numberOfLines={1}>
                    {maritalLabel}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Pressable>

      {showActions ? (
        <View style={styles.recommendActionRow}>
          <Pressable
            style={styles.recommendActionSkipBtn}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel={translate('skip')}
          >
            <Text style={styles.recommendActionSkipText}>{translate('skip')}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.recommendActionInterestBtn,
              interestSent && styles.recommendActionInterestBtnSent,
            ]}
            onPress={() => handleInterest()}
            accessibilityRole="button"
            accessibilityLabel={translate('interest')}
          >
            <Text
              style={[
                styles.recommendActionInterestText,
                interestSent && styles.recommendActionInterestTextSent,
              ]}
            >
              {interestSent ? translate('interestSentBtn') : translate('interest')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  if (!showActions) {
    return cardBody;
  }

  return (
    <SwipeableRecommendationCard
      cardWidth={cardWidth}
      onSwipeLeft={handleSkip}
      onSwipeRight={() => handleInterest(true)}
      canSwipeRight={canSwipeRight}
    >
      {cardBody}
    </SwipeableRecommendationCard>
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
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  recommendDeck: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.containerMargin,
    marginBottom: spacing.xs,
  },
  recommendDeckLayer: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
  },
  recommendDeckEmpty: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xl,
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
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  recommendCardPressable: {
    height: RECOMMEND_CARD_HEIGHT,
    overflow: 'hidden',
  },
  recommendImage: {
    width: '100%',
    height: '100%',
  },
  recommendGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  matchScoreBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: '#F8BBD0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  matchScoreText: {
    ...typography.labelSm,
    color: colors.primary,
    fontFamily: fonts.interSemi,
    fontSize: 12,
  },
  recommendInfoBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 72,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  recommendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recommendName: {
    ...typography.titleLg,
    color: '#fff',
    fontFamily: fonts.interSemi,
    flexShrink: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  recommendMeta: {
    ...typography.bodyMd,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 18,
  },
  recommendTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 4,
  },
  recommendTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '48%',
  },
  recommendTagText: {
    ...typography.labelSm,
    color: '#fff',
    fontSize: 11,
    flexShrink: 1,
  },
  recommendActionRow: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recommendActionSkipBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: borderRadius.full,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  recommendActionSkipText: {
    ...typography.labelLg,
    color: colors.primary,
    fontFamily: fonts.interSemi,
    fontSize: 14,
  },
  recommendActionInterestBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  recommendActionInterestBtnSent: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  recommendActionInterestText: {
    ...typography.labelLg,
    color: '#fff',
    fontFamily: fonts.interSemi,
    fontSize: 14,
  },
  recommendActionInterestTextSent: {
    color: colors.primary,
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
