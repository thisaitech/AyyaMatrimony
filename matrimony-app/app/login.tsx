import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing, typography } from '@/constants/theme';
import { images } from '@/constants/images';

export default function LoginScreen() {
  const router = useRouter();
  const { translate } = useLanguage();
  const [phone, setPhone] = useState('');

  useEffect(() => {
    void import('@/lib/firebase').then(({ initFirebaseAnalytics }) => initFirebaseAnalytics());
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader showBack onBack={() => router.replace('/welcome')} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.centerBlock}>
            <View style={styles.branding}>
              <Image source={{ uri: images.logo }} style={styles.logo} />
              <Text style={styles.title}>{translate('welcomeBack')}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.fieldLabel}>{translate('mobileNumber')}</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={translate('enterPhone')}
                  placeholderTextColor="rgba(90, 65, 61, 0.4)"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <PrimaryButton
                label={translate('sendOtp')}
                icon="arrow-forward"
                onPress={() => router.replace('/otp')}
                style={styles.submit}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBlock: {
    width: '100%',
    maxWidth: 420,
  },
  branding: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 224, 136, 0.3)',
  },
  title: {
    ...typography.headlineLg,
    color: colors.primary,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
  },
  fieldLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  countryCode: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  submit: {
    borderRadius: 12,
  },
});
