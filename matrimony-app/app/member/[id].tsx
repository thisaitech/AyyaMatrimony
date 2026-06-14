import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { ProfileContactSection } from '@/components/ProfileContactSection';
import { getMemberProfileById } from '@/constants/images';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing, typography } from '@/constants/theme';

export default function MemberProfileScreen() {
  const router = useRouter();
  const { translate } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const member = getMemberProfileById(id ?? '');

  if (!member) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader showBack onBack={() => router.back()} />
        <Text style={styles.error}>{translate('profileNotFound')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Image source={{ uri: member.image }} style={styles.image} />
          <View style={styles.heroText}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{member.name}</Text>
              {member.verified ? (
                <MaterialIcons name="verified" size={20} color={colors.secondary} />
              ) : null}
            </View>
            <Text style={styles.meta}>{member.age}</Text>
            <Text style={styles.meta}>{member.community}</Text>
            <Text style={styles.meta}>{member.location}</Text>
          </View>
        </View>

        <ProfileContactSection
          phoneNumber={member.phoneNumber}
          whatsappNumber={member.whatsappNumber}
          facebookProfile={member.facebookProfile}
          instagramProfile={member.instagramProfile}
          interestStatus={member.interestStatus}
        />
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
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  hero: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    overflow: 'hidden',
  },
  image: {
    width: 120,
    minHeight: 140,
  },
  heroText: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    ...typography.headlineMd,
    color: colors.primary,
    flex: 1,
  },
  meta: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  error: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
    marginTop: 100,
  },
});
