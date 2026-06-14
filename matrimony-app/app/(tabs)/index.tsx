import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { MatchCard } from '@/components/MatchCard';
import { PremiumCard } from '@/components/PremiumCard';
import { ProgressBar } from '@/components/ProgressBar';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing, typography } from '@/constants/theme';
import { images } from '@/constants/images';

export default function HomeScreen() {
  const { translate } = useLanguage();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader showBack={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.welcome}>
          <Text style={styles.greeting}>{translate('helloName')}</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{translate('profileComplete')}</Text>
              <Text style={styles.progressValue}>85%</Text>
            </View>
            <ProgressBar progress={85} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="stars" size={20} color={colors.secondary} />
              <Text style={styles.sectionTitle}>{translate('premiumProfiles')}</Text>
            </View>
            <Text style={styles.viewAll}>{translate('viewAll')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.premiumList}>
            {images.premiumProfiles.map((profile) => (
              <PremiumCard key={profile.name} {...profile} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{translate('recommendedMatches')}</Text>
          {images.matches.map((match) => (
            <MatchCard key={match.id} {...match} />
          ))}
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
    paddingTop: 72,
    paddingBottom: spacing.xl,
  },
  welcome: {
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.xl,
  },
  greeting: {
    ...typography.headlineLg,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  progressCard: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    gap: spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  progressLabel: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  progressValue: {
    ...typography.labelSm,
    color: colors.primaryFixedDim,
  },
  section: {
    paddingVertical: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.containerMargin,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.titleLg,
    color: colors.onSurface,
    paddingHorizontal: spacing.containerMargin,
    marginBottom: spacing.lg,
  },
  viewAll: {
    ...typography.labelLg,
    color: colors.surfaceTint,
  },
  premiumList: {
    paddingHorizontal: spacing.containerMargin,
  },
});
