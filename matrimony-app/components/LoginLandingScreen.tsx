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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { colors, fonts, spacing } from '@/constants/theme';
import { images } from '@/constants/images';
import { hasCompletedProfile, applyDefaultRegistrationCommunity } from '@/constants/profileCompletion';
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

const PROFILE_STORAGE_KEY = 'user_profile';

async function readStoredProfile(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return {};
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
  const insets = useSafeAreaInsets();

  const scale = useSharedValue(1.0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 16000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 16000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    void import('@/lib/firebase').then(({ initFirebaseAnalytics }) => initFirebaseAnalytics());
  }, []);

  const imageAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
    await replaceValues(applyDefaultRegistrationCommunity(mergedProfile));
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
    router.replace('/create-profile');
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
      <StatusBar style="dark" />

      {/* Section 1: Single compact header — always fully visible */}
      <Animated.View
        style={[styles.topSection, { paddingTop: insets.top + 4 }]}
        entering={FadeInUp.duration(900).springify()}
      >
        <View style={styles.branding}>
          <View style={styles.logoRing}>
            <Image source={images.logo} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>
            Ayya Matrimony
          </Text>
          <View style={styles.langToggleWrap}>
            <LanguageLogoToggle variant="maroon" dense />
          </View>
        </View>
      </Animated.View>

      {/* Section 2: Wedding illustration — flex so it fills remaining space proportionally */}
      <Animated.View style={[styles.imageSection, imageAnimStyle]} pointerEvents="none">
        <Image
          source={images.bgIllustration}
          style={styles.illustrationImage}
          resizeMode="contain"
        />
        <LinearGradient
          colors={['#FDF6EC', 'transparent']}
          locations={[0, 0.15]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(253,246,236,0.88)', '#FDF6EC']}
          locations={[0.6, 0.87, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </Animated.View>

      {/* Community badges sit below the illustration */}
      <View style={styles.badgeBar}>
        <View style={[styles.communityChip, { borderColor: 'rgba(212,175,55,0.85)' }]}>
          <MaterialCommunityIcons name="temple-hindu" size={13} color="#D4AF37" style={{ marginRight: 5 }} />
          <Text style={[styles.communityChipText, { color: '#D4AF37' }]}>HINDU NADAR</Text>
        </View>
        <View style={[styles.communityChip, { borderColor: 'rgba(91,194,168,0.85)' }]}>
          <MaterialCommunityIcons name="cross" size={13} color="#5BC2A8" style={{ marginRight: 5 }} />
          <Text style={[styles.communityChipText, { color: '#5BC2A8' }]}>RC NADAR</Text>
        </View>
        <View style={[styles.communityChip, { borderColor: 'rgba(185,113,185,0.85)' }]}>
          <MaterialCommunityIcons name="cross" size={13} color="#B971B9" style={{ marginRight: 5 }} />
          <Text style={[styles.communityChipText, { color: '#B971B9' }]}>CSI NADAR</Text>
        </View>
      </View>

      {/* Section 3: Premium bottom — NO SCROLL, compact */}
      <KeyboardAvoidingView
        style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 8) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={styles.bottomContent} entering={FadeInDown.duration(800).springify().delay(150)}>

          {/* Decorative divider */}
          <View style={styles.formHeader}>
            <View style={styles.formDividerLine} />
            <Text style={styles.formHeaderText}>Enter Your Mobile</Text>
            <View style={styles.formDividerLine} />
          </View>

          {/* Phone input card */}
          <View style={styles.inputCard}>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeFlag}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="Enter mobile number"
                placeholderTextColor="rgba(100,70,60,0.4)"
                keyboardType="phone-pad"
                maxLength={PHONE_DIGIT_LENGTH}
                value={phone}
                onChangeText={(text) => setPhone(normalizePhoneDigits(text))}
              />
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.actions}>
            <PrimaryButton
              label="Register Free  →"
              icon=""
              variant="gold"
              onPress={handleRegister}
              disabled={busy}
              style={styles.registerButton}
              labelStyle={styles.registerLabel}
            />
            <View style={styles.loginRow}>
              <View style={styles.thinDivider} />
              <Text style={styles.loginDividerText}>Already have an account?</Text>
              <View style={styles.thinDivider} />
            </View>
            <PrimaryButton
              label={translate('login')}
              variant="outline"
              onPress={handleLogin}
              disabled={busy}
              style={styles.loginButton}
              labelStyle={styles.loginLabel}
            />
          </View>

        </Animated.View>
      </KeyboardAvoidingView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF6EC',
    ...Platform.select({ web: { height: '100vh', overflow: 'hidden' } }),
  },
  topSection: { backgroundColor: '#FDF6EC', flexShrink: 0, zIndex: 10 },
  // Single row: logo + title + language toggle all together
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 8,
  },
  langToggleWrap: {
    marginLeft: 'auto' as any,
    flexShrink: 0,
  },
  logoRing: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: 'rgba(184,135,42,0.4)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(184,135,42,0.15)' },
      default: { shadowColor: '#B8872A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
    }),
  },
  logo: { width: 44, height: 44, borderRadius: 22 },
  title: {
    fontSize: 24, lineHeight: 28, color: '#8B2E2E',
    fontFamily: fonts.playfairSemi, flexShrink: 1,
    textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  badgeBar: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FDF6EC',
  },
  subtitle: {
    fontSize: 15, fontFamily: fonts.inter, color: '#D6EFE2',
    textAlign: 'center', lineHeight: 22, marginBottom: 16,
  },
  communityRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  communityChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1.2, backgroundColor: 'rgba(15,61,40,0.06)',
  },
  communityChipText: { fontFamily: fonts.interSemi, letterSpacing: 0.2, textTransform: 'uppercase', fontSize: 8.5 },
  // Image takes remaining space
  imageSection: { flex: 1, minHeight: 150, backgroundColor: '#FDF6EC', overflow: 'hidden' },
  illustrationImage: { width: '100%', height: '100%' },

  // ── Premium bottom section — fixed, no scroll ──
  bottomSection: {
    backgroundColor: '#FDF6EC',
    flexShrink: 0,
    zIndex: 10,
  },
  bottomContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 8,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    marginTop: 0,
  },
  formDividerLine: {
    flex: 1, height: 1,
    backgroundColor: 'rgba(184,135,42,0.3)',
  },
  formHeaderText: {
    fontFamily: fonts.interSemi,
    fontSize: 11,
    color: '#B8872A',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(184,135,42,0.2)',
    marginBottom: 2,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(184,135,42,0.08)' },
      default: { shadowColor: '#B8872A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
    }),
  },
  fieldBlock: { marginBottom: 2 },
  fieldLabel: { fontSize: 12, fontFamily: fonts.interSemi, color: '#3A2020', marginBottom: 4, marginLeft: 2 },
  phoneRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FDF6EC',
    borderRadius: 8,
    paddingHorizontal: 8,
    minWidth: 54,
    justifyContent: 'center',
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(184,135,42,0.25)',
  },
  countryCodeFlag: { fontSize: 13 },
  countryCodeText: { fontSize: 13, color: '#2A1010', fontFamily: fonts.interSemi },
  input: {
    backgroundColor: '#FDFAF6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 0,
    height: 36,
    fontSize: 14,
    fontFamily: fonts.inter,
    color: '#1A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(184,135,42,0.2)',
    width: '100%',
  },
  phoneInput: { flex: 1, minWidth: 0 },
  actions: { gap: 4, marginTop: 4 },
  registerButton: {
    minHeight: 38,
    borderRadius: 9999,
    backgroundColor: '#B8872A',
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(184,135,42,0.35)' },
      default: { shadowColor: '#B8872A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
    }),
  },
  registerLabel: { fontFamily: fonts.interSemi, fontSize: 13, letterSpacing: 0.4, color: '#FFFFFF' },
  loginRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 0,
  },
  thinDivider: { flex: 1, height: 1, backgroundColor: 'rgba(90,58,58,0.15)' },
  loginDividerText: {
    fontSize: 9, fontFamily: fonts.inter,
    color: 'rgba(90,58,58,0.5)', textAlign: 'center',
  },
  loginButton: {
    minHeight: 34,
    borderRadius: 9999,
    borderColor: 'rgba(184,135,42,0.4)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(184,135,42,0.06)',
  },
  loginLabel: { color: '#7A5010', fontFamily: fonts.interSemi, fontSize: 12 },
  cardTitle: { fontSize: 18, fontFamily: fonts.playfairSemi, color: '#1E0A0A', textAlign: 'center', marginBottom: 6 },
});
