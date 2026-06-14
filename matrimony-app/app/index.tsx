import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Language } from '@/constants/i18n';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing, typography } from '@/constants/theme';
import { images } from '@/constants/images';

const languageOptions: { id: Language; labelKey: 'english' | 'tamil'; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'en', labelKey: 'english', icon: 'language' },
  { id: 'ta', labelKey: 'tamil', icon: 'translate' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { language, isReady, setLanguage, translate } = useLanguage();
  const [selected, setSelected] = useState<Language | null>(null);

  useEffect(() => {
    if (isReady) {
      setSelected(language);
    }
  }, [isReady, language]);

  const handleSelect = (optionId: Language) => {
    setSelected(optionId);
    void setLanguage(optionId);
  };

  const handleContinue = () => {
    if (!selected) {
      return;
    }
    router.replace('/welcome');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.glow} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.branding}>
          <View style={styles.logoWrap}>
            <Image source={{ uri: images.logo }} style={styles.logo} />
          </View>
          <Text style={styles.title}>{translate('matrimony')}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.heading}>{translate('chooseLanguage')}</Text>
          <Text style={styles.subheading}>{translate('chooseLanguageSubtitle')}</Text>

          <View style={styles.options}>
            {languageOptions.map((option) => {
              const isSelected = selected === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleSelect(option.id)}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                >
                  <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                    <MaterialIcons name={option.icon} size={28} color={colors.primary} />
                  </View>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {translate(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={translate('continue')}
            icon="arrow-forward"
            variant="gold"
            onPress={handleContinue}
            disabled={!selected}
          />
        </View>
      </SafeAreaView>
      <LinearGradient
        colors={['transparent', 'rgba(255,224,136,0.5)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomLine}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  glow: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: 500,
    height: 300,
    borderRadius: 250,
    backgroundColor: 'rgba(254, 214, 91, 0.1)',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
  },
  branding: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 136, 0.3)',
    padding: 8,
    marginBottom: spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  title: {
    ...typography.headlineLg,
    color: colors.secondaryFixed,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  brandSubtitle: {
    ...typography.labelLg,
    color: 'rgba(255, 224, 136, 0.7)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heading: {
    ...typography.headlineMd,
    color: colors.secondaryFixed,
    textAlign: 'center',
  },
  subheading: {
    ...typography.bodyMd,
    color: 'rgba(255, 224, 136, 0.75)',
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: spacing.md,
  },
  options: {
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    gap: spacing.md,
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 136, 0.25)',
    borderRadius: 12,
  },
  optionCardSelected: {
    borderColor: colors.secondaryFixed,
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
  footer: {
    paddingBottom: spacing.lg,
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
