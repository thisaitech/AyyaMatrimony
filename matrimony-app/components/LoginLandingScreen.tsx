import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LanguageLogoToggle } from '@/components/LanguageLogoToggle';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  ADMIN_PHONE,
  grantAdminSession,
  isAdminPhone,
} from '@/constants/admin';
import {
  isValidPhoneNumber,
  normalizePhoneDigits,
  PHONE_DIGIT_LENGTH,
} from '@/constants/contactDetails';
import { useLanguage } from '@/context/LanguageContext';
import { useMatchActions } from '@/context/MatchActionsContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { colors, fonts, spacing, typography } from '@/constants/theme';
import { images } from '@/constants/images';
import { hasCompletedProfile } from '@/constants/profileCompletion';
import {
  mergeLoginProfile,
  phoneOnlyProfile,
  profilePhone,
} from '@/constants/authFlow';
import {
  fetchUserApprovalStatus,
  submitLoginApproval,
} from '@/lib/firestore/approvalService';
import { hydrateLocalProfileFromFirestore } from '@/lib/firestore/profileService';

const INPUT_BG = '#FFFBF8';
const INPUT_BORDER = 'rgba(122, 74, 68, 0.18)';
const PROFILE_STORAGE_KEY = 'user_profile';

async function readStoredProfile(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function mergeLoginProfileWithApproval(
  localProfile: Record<string, string>,
  remoteProfile: Record<string, string> | null,
  phone: string,
  approvalStatus: string | null,
): Record<string, string> {
  const merged = mergeLoginProfile(localProfile, remoteProfile, phone);
  if (approvalStatus) {
    merged.approvalStatus = approvalStatus;
  }
  return merged;
}

export function LoginLandingScreen() {
  const router = useRouter();
  const { translate } = useLanguage();
  const { login } = useSubscription();
  const { clearActions } = useMatchActions();
  const { clearProfile, replaceValues } = useProfileForm();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const scale = useSharedValue(1);
  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 12000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    void import('@/lib/firebase').then(({ initFirebaseAnalytics }) => initFirebaseAnalytics());
  }, []);

  const enterAdmin = async (path: Href) => {
    await grantAdminSession();
    router.replace(path);
  };

  const requireValidPhone = () => {
    const digits = normalizePhoneDigits(phone);
    if (!isValidPhoneNumber(digits)) {
      Alert.alert(translate('phoneNumber'), translate('invalidPhone'));
      return null;
    }
    return digits;
  };

  const finishAuth = async (
    digits: string,
    mergedProfile: Record<string, string>,
    source: 'login' | 'register',
  ) => {
    await replaceValues(mergedProfile);
    await login();

    await submitLoginApproval(digits, {
      name: mergedProfile.fullName ?? '',
      profileId: mergedProfile.memberListingId,
      registrationCommunity: mergedProfile.registrationCommunity,
      source: source === 'register' ? 'profile' : 'login',
    }).catch(() => undefined);

    if (hasCompletedProfile(mergedProfile) && source === 'login') {
      router.replace('/(tabs)');
      return;
    }

    router.replace('/select-community');
  };

  const handleLogin = () => {
    const digits = normalizePhoneDigits(phone);
    if (isAdminPhone(digits)) {
      void enterAdmin('/admin/(tabs)/' as Href);
      return;
    }
    if (!requireValidPhone()) return;
    if (busy) return;

    void (async () => {
      setBusy(true);
      try {
        const localProfile = await readStoredProfile();
        const remoteProfile = await hydrateLocalProfileFromFirestore(digits).catch(() => null);
        const approvalStatus = await fetchUserApprovalStatus(digits).catch(() => null);
        const storedPhone = profilePhone(localProfile);

        if (storedPhone && storedPhone !== digits) {
          await clearProfile();
          await clearActions();
        }

        const mergedProfile = mergeLoginProfileWithApproval(
          storedPhone === digits ? localProfile : {},
          remoteProfile,
          digits,
          approvalStatus,
        );

        await finishAuth(digits, mergedProfile, 'login');
      } finally {
        setBusy(false);
      }
    })();
  };

  const handleRegister = () => {
    const digits = normalizePhoneDigits(phone);
    if (isAdminPhone(digits)) {
      Alert.alert('Admin', `Use Login with ${ADMIN_PHONE} to open the admin panel.`);
      return;
    }
    if (!requireValidPhone()) return;
    if (busy) return;

    void (async () => {
      setBusy(true);
      try {
        const remoteProfile = await hydrateLocalProfileFromFirestore(digits).catch(() => null);
        const remoteOnly = mergeLoginProfile({}, remoteProfile, digits);

        if (hasCompletedProfile(remoteOnly)) {
          Alert.alert(translate('phoneNumber'), translate('accountAlreadyRegistered'));
          return;
        }

        await clearProfile();
        await clearActions();
        await finishAuth(digits, phoneOnlyProfile(digits), 'register');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Animated.View style={[styles.wallpaperLayer, animatedBackgroundStyle]} pointerEvents="none">
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
      </Animated.View>

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
            <Animated.View style={styles.branding} entering={FadeInUp.duration(1200).springify()}>
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
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(1200).springify().delay(300)}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 50 : 90}
                tint="light"
                style={styles.formCard}
                experimentalBlurMethod="dimezisBlurView"
              >
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
                      placeholderTextColor="rgba(90, 65, 61, 0.5)"
                      keyboardType="phone-pad"
                      maxLength={PHONE_DIGIT_LENGTH}
                      value={phone}
                      onChangeText={(text) => setPhone(normalizePhoneDigits(text))}
                    />
                  </View>
                </View>

                <View style={styles.actions}>
                  <PrimaryButton
                    label={translate('registerFree')}
                    icon="arrow-forward"
                    variant="gold"
                    onPress={handleRegister}
                    disabled={busy}
                    style={styles.registerButton}
                    labelStyle={styles.registerLabelPrimary}
                  />
                  <PrimaryButton
                    label={translate('login')}
                    variant="outline"
                    onPress={handleLogin}
                    disabled={busy}
                    style={styles.loginButton}
                    labelStyle={styles.loginLabelOutline}
                  />
                </View>
              </BlurView>
            </Animated.View>
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
    backgroundColor: 'rgba(255, 251, 247, 0.75)',
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 14,
    paddingHorizontal: 12,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    height: 52,
    ...Platform.select({
      web: { boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' },
    }),
  },
  countryCodeText: {
    ...typography.bodyLg,
    color: '#3C1611',
    fontFamily: fonts.interSemi,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    height: 52,
    ...typography.bodyLg,
    color: '#3C1611',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    width: '100%',
    ...Platform.select({
      web: { boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' },
    }),
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    gap: 12,
    marginTop: spacing.md,
  },
  registerButton: {
    minHeight: 52,
    borderRadius: 9999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(122, 74, 68, 0.3)' },
    }),
  },
  registerLabelPrimary: {
    fontFamily: fonts.interSemi,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  loginButton: {
    minHeight: 52,
    borderRadius: 9999,
    borderColor: 'rgba(122, 74, 68, 0.4)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  loginLabelOutline: {
    color: colors.primary,
    fontFamily: fonts.interSemi,
    fontSize: 16,
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
