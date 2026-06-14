import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import {
  DatePickerField,
  ReadOnlyField,
  SelectOptionsField,
  TextField,
} from '@/components/FormControls';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressBar } from '@/components/ProgressBar';
import { PropertyDetailsStep, getPropertyStepLabels } from '@/components/PropertyDetailsStep';
import {
  getPhotoUploadStepLabels,
  ProfilePhotoUploadStep,
} from '@/components/ProfilePhotoUploadStep';
import {
  getFamilyInformationStepFields,
  getHoroscopeStepFields,
  getParentSiblingStepFields,
  getPhysicalDetailsStepFields,
  HOROSCOPE_STEP_ID,
  PHYSICAL_DETAILS_STEP_ID,
  getOptionLabel,
  profileOptionStepKeys,
  profileStepFieldConfig,
} from '@/constants/formOptions';
import {
  CONTACT_PHONE_KEY,
  CONTACT_STEP_ID,
  getContactDetailsStepFields,
  isValidPhoneNumber,
  normalizePhoneDigits,
  WHATSAPP_NUMBER_KEY,
} from '@/constants/contactDetails';
import {
  hasRequiredPhotos,
  parseProfilePhotos,
  PHOTO_SKIP_KEY,
  PROFILE_PHOTOS_KEY,
  serializeProfilePhotos,
} from '@/constants/profilePhotos';
import {
  parseProperties,
  PROPERTIES_FORM_KEY,
  PropertyEntry,
} from '@/constants/propertyDetails';
import { getNextStepId, getPreviousStepId, getProfileStep } from '@/constants/profileSteps';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import { colors, fonts, spacing, typography } from '@/constants/theme';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { language, translate, translateFormat } = useLanguage();
  const { getValue, setValue } = useProfileForm();
  const { step: stepId } = useLocalSearchParams<{ step: string }>();
  const step = getProfileStep(stepId ?? '1', language);
  const optionKey = step ? profileOptionStepKeys[step.id] : undefined;
  const [selected, setSelected] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyEntry[]>(() =>
    parseProperties(getValue(PROPERTIES_FORM_KEY)),
  );
  const [profilePhotos, setProfilePhotos] = useState<string[]>(() =>
    parseProfilePhotos(getValue(PROFILE_PHOTOS_KEY)),
  );
  const [photoSkipped, setPhotoSkipped] = useState(() => getValue(PHOTO_SKIP_KEY) === 'true');
  const propertyLabels = useMemo(() => getPropertyStepLabels(language), [language]);
  const photoUploadLabels = useMemo(() => getPhotoUploadStepLabels(language), [language]);

  const fieldConfigs = useMemo(
    () => (step ? profileStepFieldConfig[step.id] ?? [] : []),
    [step],
  );
  const familyStepFields = useMemo(() => {
    if (step?.id === '11') {
      return getFamilyInformationStepFields(language);
    }
    if (step?.id === '12') {
      return getParentSiblingStepFields(language);
    }
    if (step?.id === HOROSCOPE_STEP_ID) {
      return getHoroscopeStepFields(language);
    }
    if (step?.id === PHYSICAL_DETAILS_STEP_ID) {
      return getPhysicalDetailsStepFields(language);
    }
    if (step?.id === CONTACT_STEP_ID) {
      return getContactDetailsStepFields(language);
    }
    return null;
  }, [step?.id, language]);
  const activeFieldConfigs = familyStepFields?.configs ?? fieldConfigs;
  const activeFields = familyStepFields?.fields ?? step?.fields ?? [];

  useEffect(() => {
    if (optionKey) {
      setSelected(getValue(optionKey) || null);
    }
  }, [optionKey, getValue, stepId]);

  useEffect(() => {
    if (step?.id === '16') {
      setProperties(parseProperties(getValue(PROPERTIES_FORM_KEY)));
    }
  }, [getValue, step?.id, stepId]);

  useEffect(() => {
    if (step?.id === 'final') {
      setProfilePhotos(parseProfilePhotos(getValue(PROFILE_PHOTOS_KEY)));
      setPhotoSkipped(getValue(PHOTO_SKIP_KEY) === 'true');
    }
  }, [getValue, step?.id, stepId]);

  useEffect(() => {
    activeFieldConfigs.forEach((config) => {
      if (config.kind === 'readonly' && config.fixedValue && getValue(config.fieldKey) !== config.fixedValue) {
        setValue(config.fieldKey, config.fixedValue);
      }
    });
  }, [activeFieldConfigs, getValue, setValue, stepId]);

  if (!step) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.error}>{translate('stepNotFound')}</Text>
      </SafeAreaView>
    );
  }

  const progress = Math.round((step.step / step.total) * 100);
  const nextStepId = getNextStepId(step.id, language);

  const isStepComplete = () => {
    if (step.id === HOROSCOPE_STEP_ID || step.id === '16') {
      return true;
    }
    if (step.options && optionKey) {
      return Boolean(selected);
    }
    if (step.id === CONTACT_STEP_ID) {
      const phone = getValue(CONTACT_PHONE_KEY);
      const whatsapp = getValue(WHATSAPP_NUMBER_KEY);
      if (!isValidPhoneNumber(phone)) {
        return false;
      }
      if (whatsapp && !isValidPhoneNumber(whatsapp)) {
        return false;
      }
      return true;
    }
    if (step.id === 'final') {
      return hasRequiredPhotos(profilePhotos, photoSkipped);
    }
    if (activeFieldConfigs.length > 0) {
      return activeFieldConfigs.every((config) => {
        if (config.optional) {
          return true;
        }
        if (config.kind === 'readonly') {
          return Boolean(config.fixedValue);
        }
        return Boolean(getValue(config.fieldKey));
      });
    }
    return true;
  };

  const handlePropertiesChange = (nextProperties: PropertyEntry[]) => {
    setProperties(nextProperties);
    setValue(PROPERTIES_FORM_KEY, JSON.stringify(nextProperties));
  };

  const handleProfilePhotosChange = (nextPhotos: string[]) => {
    setProfilePhotos(nextPhotos);
    setPhotoSkipped(false);
    setValue(PHOTO_SKIP_KEY, 'false');
    setValue(PROFILE_PHOTOS_KEY, serializeProfilePhotos(nextPhotos));
  };

  const handlePhotoSkip = () => {
    setPhotoSkipped(true);
    setValue(PHOTO_SKIP_KEY, 'true');
  };

  const handleContinue = () => {
    if (!isStepComplete()) {
      Alert.alert(translate('fillRequiredDetails'), undefined, [{ text: translate('ok') }]);
      return;
    }
    if (optionKey && selected) {
      setValue(optionKey, selected);
    }
    if (nextStepId) {
      router.replace(`/profile-setup/${nextStepId}`);
      return;
    }
    router.replace('/(tabs)');
  };

  const handleBack = () => {
    const previousStepId = getPreviousStepId(step.id, language);
    if (previousStepId) {
      router.replace(`/profile-setup/${previousStepId}`);
      return;
    }
    router.replace('/otp');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader showBack onBack={handleBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.progressSection}>
          <ProgressBar
            progress={progress}
            stepLabel={translateFormat('stepOf', { current: step.step, total: step.total })}
            label={translateFormat('percentComplete', { percent: progress })}
          />
        </View>

        {(step.title || step.subtitle) ? (
          <View style={styles.question}>
            {step.title ? (
              <Text style={[styles.title, language === 'ta' && styles.titleTamil]}>{step.title}</Text>
            ) : null}
            {step.subtitle ? <Text style={styles.subtitle}>{step.subtitle}</Text> : null}
          </View>
        ) : null}

        {step.options ? (
          <View style={styles.optionsGrid}>
            {step.options.map((option) => {
              const isSelected = selected === option.label;
              return (
                <Pressable
                  key={option.label}
                  onPress={() => setSelected(option.label)}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                    option.wide && styles.optionWide,
                  ]}
                >
                  <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                    <MaterialIcons name={option.icon} size={28} color={colors.primary} />
                  </View>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {step.id === '16' ? (
          <PropertyDetailsStep
            language={language}
            properties={properties}
            onChange={handlePropertiesChange}
            labels={propertyLabels}
          />
        ) : null}

        {step.id === 'final' ? (
          <ProfilePhotoUploadStep
            photos={profilePhotos}
            skipped={photoSkipped}
            language={language}
            labels={photoUploadLabels}
            onChange={handleProfilePhotosChange}
            onSkip={handlePhotoSkip}
          />
        ) : null}

        {step.id !== '16' && step.id !== 'final' && activeFieldConfigs.length > 0 ? (
          <View style={styles.fields}>
            {activeFields.map((field, index) => {
              const config = activeFieldConfigs[index];
              if (!config) {
                return null;
              }

              const value = getValue(config.fieldKey);
              const onChange = (nextValue: string) => {
                if (config.keyboardType === 'phone-pad') {
                  setValue(config.fieldKey, normalizePhoneDigits(nextValue));
                  return;
                }
                setValue(config.fieldKey, nextValue);
              };

              if (config.kind === 'date') {
                return (
                  <DatePickerField
                    key={config.fieldKey}
                    label={field.label}
                    value={value}
                    onValueChange={onChange}
                    placeholder={field.placeholder}
                    language={language}
                  />
                );
              }

              if (config.kind === 'readonly' && config.fixedValue && config.optionsKey) {
                return (
                  <ReadOnlyField
                    key={config.fieldKey}
                    label={field.label}
                    value={getOptionLabel(config.optionsKey, config.fixedValue, language)}
                  />
                );
              }

              if (config.kind === 'select' && config.optionsKey) {
                return (
                  <SelectOptionsField
                    key={config.fieldKey}
                    label={field.label}
                    value={value}
                    onValueChange={onChange}
                    optionsKey={config.optionsKey}
                    language={language}
                    placeholder={field.placeholder}
                  />
                );
              }

              return (
                <TextField
                  key={config.fieldKey}
                  label={field.label}
                  value={value}
                  onChangeText={onChange}
                  placeholder={field.placeholder}
                  multiline={config.multiline}
                  keyboardType={config.keyboardType}
                  maxLength={config.maxLength}
                />
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={nextStepId ? translate('continue') : translate('finishSetup')}
          icon="arrow-forward"
          onPress={handleContinue}
        />
      </View>
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
  },
  progressSection: {
    marginBottom: spacing.xl,
  },
  question: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.headlineLg,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  titleTamil: {
    fontSize: 21,
    lineHeight: 29,
    fontFamily: fonts.interSemi,
    paddingHorizontal: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '47%',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.3)',
    borderRadius: 12,
  },
  optionWide: {
    width: '100%',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLow,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  optionIconSelected: {
    backgroundColor: colors.primaryFixedDim,
  },
  optionLabel: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  fields: {
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 191, 185, 0.1)',
  },
  error: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
    marginTop: 100,
  },
});
