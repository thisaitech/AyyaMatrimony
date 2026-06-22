import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Redirect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreateProfileBiodataForm, RegistrationNumberBar } from '@/components/CreateProfileBiodataForm';
import { LanguageLogoToggle } from '@/components/LanguageLogoToggle';
import { publishProfileFromValues } from '@/constants/memberDirectory';
import { submitLoginApproval } from '@/lib/firestore/approvalService';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { images } from '@/constants/images';
import { colors, fonts, spacing } from '@/constants/theme';
import { hasCompletedProfile } from '@/constants/profileCompletion';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLogout } from '@/hooks/useLogout';

export default function CreateProfileScreen() {
  const router = useRouter();
  const { community, religion } = useLocalSearchParams<{
    community?: string;
    religion?: string;
  }>();
  const { translate } = useLanguage();
  const { values, isReady: profileReady, setValue } = useProfileForm();
  const { isReady: subscriptionReady, isLoggedIn, chooseUnpaidAccess } = useSubscription();
  const logout = useLogout();
  const communityApplied = useRef(false);
  const isSaving = useRef(false);

  useEffect(() => {
    if (communityApplied.current) return;

    communityApplied.current = true;
    if (typeof community === 'string' && community.trim()) {
      setValue('registrationCommunity', community.trim());
    }
    if (typeof religion === 'string' && religion.trim()) {
      setValue('religion', religion.trim());
    }
  }, [community, religion, setValue]);

  const handleSave = useCallback(() => {
    if (isSaving.current) return;
    isSaving.current = true;

    void (async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const raw = await AsyncStorage.getItem('user_profile');
        let profileValues = values;
        if (raw) {
          try {
            profileValues = JSON.parse(raw) as Record<string, string>;
          } catch {
            profileValues = values;
          }
        }
        await publishProfileFromValues(profileValues, 'current-user');
        const phone = profileValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
        if (phone) {
          await submitLoginApproval(phone, {
            name: profileValues.fullName,
            profileId: profileValues.memberListingId,
            registrationCommunity: profileValues.registrationCommunity,
            source: 'profile',
          }).catch(() => undefined);
        }
        await chooseUnpaidAccess();
        router.replace('/(tabs)');
      } finally {
        isSaving.current = false;
      }
    })();
  }, [chooseUnpaidAccess, router, values]);

  const handleBackToLogin = useCallback(() => {
    void logout();
  }, [logout]);

  if (!profileReady || !subscriptionReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/" />;
  }

  if (hasCompletedProfile(values)) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.pageHeaderWrap}>
        <LinearGradient
          colors={['#FFFFFF', '#FFF9F8', '#F6FAFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pageHeader}
        >
          <View style={styles.pageHeaderRow}>
            <Pressable
              onPress={handleBackToLogin}
              hitSlop={10}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel={translate('back')}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
            </Pressable>
            <View style={styles.brandBlock}>
              <View style={styles.brandLogoWrap}>
                <Image source={images.logo} style={styles.brandLogo} resizeMode="contain" />
              </View>
              <Text style={styles.brandName} numberOfLines={1} ellipsizeMode="tail">
                {translate('matrimony')}
              </Text>
            </View>
            <RegistrationNumberBar editable inline />
            <LanguageLogoToggle variant="maroon" compact dense />
          </View>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(212, 175, 55, 0.55)', 'rgba(87, 0, 0, 0.35)', 'rgba(212, 175, 55, 0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerAccent}
        />
      </View>
      <CreateProfileBiodataForm editable onSave={handleSave} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7FC',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7FC',
  },
  pageHeaderWrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(87, 0, 0, 0.06)',
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(87, 0, 0, 0.06)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  pageHeader: {
    paddingHorizontal: spacing.sm,
    paddingTop: 6,
    paddingBottom: 6,
  },
  headerAccent: {
    height: 2,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.1)',
    flexShrink: 0,
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  brandBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLogoWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    backgroundColor: '#FFFFFF',
    padding: 2,
    flexShrink: 0,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(87, 0, 0, 0.08)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  brandLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  brandName: {
    flex: 1,
    minWidth: 0,
    color: colors.primary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: fonts.playfairSemi,
    letterSpacing: 0.4,
  },
});
