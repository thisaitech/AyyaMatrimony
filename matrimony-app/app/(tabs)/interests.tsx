import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing, typography } from '@/constants/theme';
import { images } from '@/constants/images';

export default function InterestsScreen() {
  const router = useRouter();
  const { translate } = useLanguage();
  const interests = images.matches.map((match, index) => ({
    ...match,
    status:
      match.interestStatus === 'mutual'
        ? translate('mutual')
        : index === 0
          ? translate('sent')
          : translate('received'),
    date: `${index + 1} ${translate('daysAgo')}`,
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader title={translate('interests')} showBack={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {interests.map((item) => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/member/[id]', params: { id: item.id } })}
          >
            <Image source={{ uri: item.image }} style={styles.avatar} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.community}</Text>
              <Text style={styles.meta}>{item.location}</Text>
            </View>
            <View style={styles.badge}>
              <MaterialIcons name="star" size={14} color={colors.secondary} />
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </Pressable>
        ))}
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
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.titleLg,
    fontSize: 16,
    color: colors.primary,
  },
  meta: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeText: {
    ...typography.labelSm,
    color: colors.onSecondaryContainer,
  },
});
