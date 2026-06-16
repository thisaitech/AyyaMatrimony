import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/context/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { colors, spacing, typography } from '@/constants/theme';

export default function EditMobileScreen() {
  const goBack = useGoBack('/settings');
  const { translate } = useLanguage();
  const [phone, setPhone] = useState('');

  const handleContinue = () => {
    if (!/^\d{10}$/.test(phone)) {
      const message = translate('invalidPhone');
      if (Platform.OS === 'web') {
        window.alert(message);
      }
      return;
    }

    goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={translate('editMobileTitle')} showBack onBack={goBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
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
            onPress={handleContinue}
            style={styles.submit}
          />
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
    paddingTop: 96,
    paddingHorizontal: spacing.containerMargin,
    gap: spacing.md,
  },
  fieldLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countryCode: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.2)',
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
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.2)',
  },
  submit: {
    marginTop: spacing.lg,
  },
});
