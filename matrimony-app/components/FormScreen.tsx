import { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import {
  DatePickerField,
  formFieldStyles,
  ReadOnlyField,
  SelectOptionsField,
  TextField,
} from '@/components/FormControls';
import { PrimaryButton } from '@/components/PrimaryButton';
import { FIXED_CASTE_VALUE, FormOptionsKey, getOptionLabel } from '@/constants/formOptions';
import { useLanguage } from '@/context/LanguageContext';
import { useGoBack } from '@/hooks/useGoBack';
import { colors, spacing, typography } from '@/constants/theme';

type FormTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
};

export function FormField({ label, value, onChangeText, placeholder, multiline }: FormTextFieldProps) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline={multiline}
    />
  );
}

type FormSelectFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  optionsKey: FormOptionsKey;
  placeholder?: string;
};

export function FormSelectField({
  label,
  value,
  onValueChange,
  optionsKey,
  placeholder,
}: FormSelectFieldProps) {
  const { language } = useLanguage();
  return (
    <SelectOptionsField
      label={label}
      value={value}
      onValueChange={onValueChange}
      optionsKey={optionsKey}
      language={language}
      placeholder={placeholder}
    />
  );
}

type FormReadOnlyFieldProps = {
  label: string;
  displayValue: string;
};

export function FormReadOnlyField({ label, displayValue }: FormReadOnlyFieldProps) {
  return <ReadOnlyField label={label} value={displayValue} />;
}

type FormFixedCasteFieldProps = {
  label: string;
};

export function FormFixedCasteField({ label }: FormFixedCasteFieldProps) {
  const { language } = useLanguage();
  const displayValue = getOptionLabel('community', FIXED_CASTE_VALUE, language);
  return <ReadOnlyField label={label} value={displayValue} />;
}

type FormDateFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

export function FormDateField({ label, value, onValueChange, placeholder }: FormDateFieldProps) {
  const { language } = useLanguage();
  return (
    <DatePickerField
      label={label}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      language={language}
    />
  );
}

type FormScreenProps = {
  titleKey: 'editProfileTitle' | 'partnerPreferencesTitle' | 'privacySettingsTitle';
  children: ReactNode;
  onSave: () => void;
  saveLabelKey?: 'saveChanges';
  successKey: 'profileUpdated' | 'preferencesSaved' | 'privacySaved';
};

export function FormScreen({ titleKey, children, onSave, successKey }: FormScreenProps) {
  const { translate } = useLanguage();
  const goBack = useGoBack('/(tabs)/profile');

  const handleSave = () => {
    onSave();
    Alert.alert(translate(successKey));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={translate(titleKey)} showBack onBack={goBack} />
      <View style={styles.content}>{children}</View>
      <View style={styles.footer}>
        <PrimaryButton label={translate('saveChanges')} onPress={handleSave} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: spacing.containerMargin,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 191, 185, 0.1)',
  },
});

type ToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function ToggleRow({ label, value, onValueChange }: ToggleRowProps) {
  return (
    <Pressable style={toggleStyles.row} onPress={() => onValueChange(!value)}>
      <Text style={toggleStyles.label}>{label}</Text>
      <View style={[toggleStyles.track, value && toggleStyles.trackOn]}>
        <View style={[toggleStyles.thumb, value && toggleStyles.thumbOn]} />
      </View>
    </Pressable>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.15)',
  },
  label: {
    ...typography.labelLg,
    color: colors.onSurface,
    flex: 1,
    paddingRight: spacing.md,
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.outlineVariant,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  trackOn: {
    backgroundColor: colors.primaryContainer,
    alignItems: 'flex-end',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  thumbOn: {
    backgroundColor: colors.primary,
  },
});

export { formFieldStyles };
