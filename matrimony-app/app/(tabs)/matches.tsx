import { useCallback, useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchCard } from '@/components/MatchCard';
import { ApprovalStatusBanner } from '@/components/ApprovalStatusBanner';
import { PendingPaymentBanner } from '@/components/PendingPaymentBanner';
import { getMemberBiodataValues, type PublishedMember } from '@/constants/memberDirectory';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { resolveUserGender } from '@/constants/matchFilters';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useUserApproval } from '@/context/UserApprovalContext';
import { useBrowsableMembers } from '@/hooks/useBrowsableMembers';
import { useMemberAccess } from '@/hooks/useMemberAccess';
import { useMemberDirectory } from '@/context/MemberDirectoryContext';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

function formatMatchCommunity(
  community: string,
  id: string,
  published: PublishedMember[],
): string {
  const biodata = getMemberBiodataValues(id, published);
  const subCaste = community.split(',')[0]?.trim();
  const caste = biodata?.caste?.trim();
  if (caste && subCaste) {
    return `${caste} - ${subCaste}`;
  }
  return community.replace(',', ' -').trim();
}

function getMatchPhone(id: string, published: PublishedMember[]): string {
  const biodata = getMemberBiodataValues(id, published);
  const phone = biodata?.[CONTACT_PHONE_KEY] || biodata?.phoneNumber || '';
  const digits = phone.replace(/\D/g, '');
  return digits || phone.trim();
}

function formatMatchMetaLine(
  match: { id: string; age: string; community: string },
  published: PublishedMember[],
): string {
  const biodata = getMemberBiodataValues(match.id, published);
  const label =
    biodata?.registrationCommunity?.trim() ||
    biodata?.religion?.trim() ||
    formatMatchCommunity(match.community, match.id, published);
  const age = match.age?.trim() || '—';
  return `${label} - ${age}`;
}

export default function MatchesScreen() {
  const { translate, translateFormat, language } = useLanguage();
  const { values } = useProfileForm();
  const { isPaidMember, profilesAllowed, isSubscriptionExhausted, batchSize } = useSubscription();
  const { published, isReady, refresh } = useMemberDirectory();
  const { isProfileApproved, approvalStatus, canSeeMemberProfiles } = useMemberAccess();
  const { refresh: refreshApproval } = useUserApproval();
  const browsableMembers = useBrowsableMembers();
  const userGender = resolveUserGender(values);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshApproval();
    }, [refresh, refreshApproval]),
  );

  const matches = useMemo(() => {
    if (!isPaidMember) {
      return browsableMembers;
    }
    return browsableMembers.slice(0, profilesAllowed);
  }, [browsableMembers, isPaidMember, profilesAllowed]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.heroSection}>
          <Text
            style={[styles.headerTitle, language === 'ta' && styles.headerTitleTamil]}
            numberOfLines={2}
          >
            {translate('matches')}
          </Text>

          <ApprovalStatusBanner />

          <PendingPaymentBanner />
        </View>

        <View style={styles.listContent}>
          {!isReady ? null : matches.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {isSubscriptionExhausted
                  ? translateFormat('profileLimitReachedBody', { count: batchSize })
                  : !isProfileApproved
                  ? translate(
                      approvalStatus === 'rejected'
                        ? 'approvalRejectedMessage'
                        : 'approvalPendingMessage',
                    )
                  : !canSeeMemberProfiles
                    ? translate('paymentAccessInitial')
                  : !userGender
                    ? translate('setGenderToSeeMatches')
                    : translate('noMatchesYet')}
              </Text>
            </View>
          ) : (
            matches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.id}
                name={match.name}
                age={match.age}
                community={formatMatchCommunity(match.community, match.id, published)}
                location={match.location}
                image={match.image}
                phoneNumber={getMatchPhone(match.id, published) || match.phoneNumber}
                metaLine={formatMatchMetaLine(match, published)}
                verified={match.verified ?? true}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: Platform.OS === 'web' ? spacing.xl : spacing.xl + 88,
    flexGrow: 1,
  },
  heroSection: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    gap: spacing.md,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  headerTitleTamil: {
    fontSize: 20,
    lineHeight: 26,
  },
  listContent: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.md,
    width: '100%',
    alignSelf: 'stretch',
  },
  emptyState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
