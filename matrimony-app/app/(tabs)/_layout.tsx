import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Image, Platform, View } from 'react-native';
import { Redirect, Tabs, useFocusEffect, useRouter, type Href } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoginLandingScreen } from '@/components/LoginLandingScreen';
import { TabBarLabel } from '@/components/TabBarLabel';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useUserApproval } from '@/context/UserApprovalContext';
import { hasCompletedProfile } from '@/constants/profileCompletion';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { useMemberDirectory } from '@/context/MemberDirectoryContext';
import { images } from '@/constants/images';
import { colors, typography } from '@/constants/theme';

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { translate, language } = useLanguage();
  const { isReady, isLoggedIn, needsPaymentAccess, isSubscriptionGateReady, syncFromFirestore } =
    useSubscription();
  const { values, isReady: profileReady } = useProfileForm();
  const { refresh: refreshApproval } = useUserApproval();
  const { refresh: refreshDirectory } = useMemberDirectory();
  const sentToRegistration = useRef(false);
  const phone = values[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';

  useFocusEffect(
    useCallback(() => {
      if (!isLoggedIn) {
        return;
      }

      void refreshApproval();
      void refreshDirectory();
      if (phone) {
        void syncFromFirestore(phone);
      }
    }, [isLoggedIn, phone, refreshApproval, refreshDirectory, syncFromFirestore]),
  );

  const profileComplete = hasCompletedProfile(values);

  useEffect(() => {
    if (!isLoggedIn) {
      sentToRegistration.current = false;
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isReady || !profileReady || !isLoggedIn || profileComplete) {
      return;
    }
    if (sentToRegistration.current) {
      return;
    }
    sentToRegistration.current = true;
    router.replace('/create-profile' as Href);
  }, [isLoggedIn, isReady, profileComplete, profileReady, router]);

  if (!isReady || !profileReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <LoginLandingScreen />;
  }

  if (!profileComplete) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isSubscriptionGateReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (needsPaymentAccess) {
    return <Redirect href="/payment-access" />;
  }

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  const tabBodyHeight = language === 'ta' ? 78 : 72;
  const tabPaddingBottom = bottomInset + (language === 'ta' ? 4 : 2);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
        tabBarStyle: {
          backgroundColor: 'rgba(255, 251, 249, 0.98)',
          borderTopColor: 'rgba(87, 0, 0, 0.08)',
          height: tabBodyHeight + tabPaddingBottom,
          paddingBottom: tabPaddingBottom,
          paddingTop: 8,
          ...Platform.select({
            web: { boxShadow: '0 -4px 16px rgba(87, 0, 0, 0.06)' },
            default: {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 8,
            },
          }),
        },
        tabBarLabelStyle: {
          ...typography.labelSm,
          fontSize: 10,
        },
        tabBarLabel: ({ color, children }) => (
          <TabBarLabel color={color}>{String(children)}</TabBarLabel>
        ),
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: translate('homeTab'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: translate('matchesTab'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="favorite" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="interests"
        options={{
          title: translate('interestsTab'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="star" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: translate('chatTab'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: translate('profileTab'),
          tabBarIcon: ({ focused }) => (
            <Image
              source={images.logo}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                opacity: focused ? 1 : 0.65,
              }}
              resizeMode="cover"
            />
          ),
        }}
      />
    </Tabs>
  );
}
