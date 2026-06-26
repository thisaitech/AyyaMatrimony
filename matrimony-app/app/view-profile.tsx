import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { CreateProfileBiodataForm } from '@/components/CreateProfileBiodataForm';
import { colors, spacing } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/context/ProfileFormContext';

export default function ViewProfileScreen() {
  const router = useRouter();
  const { translate } = useLanguage();
  const { values, isReady } = useProfileForm();

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <AppHeader
          title={translate('viewProfile')}
          showBack
          showTamil={false}
          onBack={() => router.back()}
        />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <AppHeader
        title={translate('viewProfile')}
        showBack
        showTamil={false}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.formWrap}>
          <CreateProfileBiodataForm
            editable={false}
            viewOnly
            profileValues={values}
            onSave={() => undefined}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7FC',
  },
  scroll: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: 56,
    paddingBottom: spacing.xl + 80,
    gap: spacing.md,
  },
  formWrap: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'visible',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
