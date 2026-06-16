import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageLogoToggle } from '@/components/LanguageLogoToggle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/context/LanguageContext';
import { colors, fonts, spacing, typography } from '@/constants/theme';
import { images } from '@/constants/images';

const INPUT_BG = '#FFFBF8';
const INPUT_BORDER = 'rgba(122, 74, 68, 0.18)';

export default function WelcomeScreen() {
  const router = useRouter();
  const { translate } = useLanguage();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    void import('@/lib/firebase').then(({ initFirebaseAnalytics }) => initFirebaseAnalytics());
  }, []);

  const handleLogin = () => {
    router.replace('/(tabs)');
  };

  const handleRegister = () => {
    router.replace('/create-profile');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.wallpaperLayer} pointerEvents="none">
        <Image
          source={{ uri: images.loginWallpapers.hindu }}
          style={styles.wallpaperFull}
          resizeMode="cover"
        />
        <Image
          source={{ uri: images.loginWallpapers.christian }}
          style={[styles.wallpaperFull, styles.wallpaperBlend]}
          resizeMode="cover"
        />
      </View>

      <LinearGradient
        colors={[
          'rgba(30, 0, 0, 0.12)',
          'rgba(87, 0, 0, 0.38)',
          'rgba(87, 0, 0, 0.62)',
        ]}
        locations={[0, 0.55, 1]}
        style={styles.overlay}
        pointerEvents="none"
      />

      <LinearGradient
        colors={['rgba(87, 0, 0, 0.72)', 'transparent']}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <LanguageLogoToggle variant="maroon" dense />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.branding}>
              <View style={styles.logoRing}>
                <View style={styles.logoWrap}>
                  <Image source={images.logo} style={styles.logo} resizeMode="contain" />
                </View>
              </View>
              <Text style={styles.title}>{translate('matrimony')}</Text>
              <Text style={styles.subtitle}>{translate('loginSubtitle')}</Text>
              <View style={styles.communityRow}>
                <View style={styles.communityChip}>
                  <Text style={styles.communityChipText}>{translate('hindu')}</Text>
                </View>
                <View style={styles.communityDivider} />
                <View style={[styles.communityChip, styles.communityChipFeatured]}>
                  <Text style={[styles.communityChipText, styles.communityChipFeaturedText]}>
                    {translate('nadar')}
                  </Text>
                </View>
                <View style={styles.communityDivider} />
                <View style={styles.communityChip}>
                  <Text style={styles.communityChipText}>{translate('christian')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>{translate('welcomeBack')}</Text>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{translate('phoneNumber')}</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder={translate('enterPhone')}
                    placeholderTextColor="rgba(90, 65, 61, 0.42)"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{translate('password')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={translate('enterPassword')}
                  placeholderTextColor="rgba(90, 65, 61, 0.42)"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.actions}>
                <PrimaryButton
                  label={translate('login')}
                  icon="arrow-forward"
                  variant="gold"
                  onPress={handleLogin}
                  style={styles.loginButton}
                />
                <PrimaryButton
                  label={translate('registerFree')}
                  variant="outline"
                  onPress={handleRegister}
                  style={styles.registerButton}
                  labelStyle={styles.registerLabel}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <LinearGradient
        colors={['transparent', 'rgba(255,224,136,0.45)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomLine}
        pointerEvents="none"
      />

    </View>
  );
}

const cardShadow = Platform.select({
  web: { boxShadow: '0 18px 48px rgba(20, 0, 0, 0.28)' },
  default: {
    shadowColor: '#140000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 10,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  wallpaperLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  wallpaperFull: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  wallpaperBlend: {
    opacity: 0.42,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  branding: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  logoRing: {
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 136, 0.45)',
    marginBottom: spacing.sm,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryContainer,
    padding: 7,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    color: colors.secondaryFixed,
    letterSpacing: 1.5,
    fontFamily: fonts.playfairSemi,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subtitle: {
    ...typography.bodyMd,
    color: '#FFF4D6',
    textAlign: 'center',
    maxWidth: 320,
    marginTop: spacing.xs,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
    maxWidth: 340,
  },
  communityChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 136, 0.35)',
    backgroundColor: 'rgba(255, 224, 136, 0.08)',
  },
  communityChipFeatured: {
    borderColor: 'rgba(255, 224, 136, 0.75)',
    backgroundColor: 'rgba(255, 224, 136, 0.22)',
    paddingHorizontal: 12,
  },
  communityChipText: {
    ...typography.labelSm,
    color: colors.secondaryFixed,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  communityChipFeaturedText: {
    color: '#FFF8E7',
    fontFamily: fonts.interSemi,
    letterSpacing: 1.2,
  },
  communityDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 224, 136, 0.5)',
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 251, 247, 0.97)',
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 136, 0.35)',
    ...cardShadow,
  },
  cardTitle: {
    ...typography.titleLg,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontFamily: fonts.playfairSemi,
  },
  fieldBlock: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
    marginLeft: 2,
    letterSpacing: 0.8,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  countryCode: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 12,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    height: 48,
  },
  countryCodeText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontFamily: fonts.interSemi,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    height: 48,
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: INPUT_BORDER,
    width: '100%',
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    gap: 10,
    marginTop: spacing.sm,
  },
  loginButton: {
    minHeight: 48,
  },
  registerButton: {
    minHeight: 48,
    borderRadius: 9999,
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  registerLabel: {
    color: colors.primary,
    fontFamily: fonts.interSemi,
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
