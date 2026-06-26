import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AppSplashGate } from '@/components/AppSplashGate';
import {
  NotoSansTamil_400Regular,
  NotoSansTamil_500Medium,
  NotoSansTamil_600SemiBold,
  NotoSansTamil_700Bold,
} from '@expo-google-fonts/noto-sans-tamil';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { LanguageProvider } from '@/context/LanguageContext';
import { ChatProvider } from '@/context/ChatContext';
import { MatchActionsProvider } from '@/context/MatchActionsContext';
import { ProfileFormProvider } from '@/context/ProfileFormContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { UserApprovalProvider } from '@/context/UserApprovalContext';
import { MemberDirectoryProvider } from '@/context/MemberDirectoryContext';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    void import('@/lib/firebase').then(({ getFirebaseFirestore }) => getFirebaseFirestore());
  }, []);
  const [loaded, error] = useFonts({
    NotoSansTamil_400Regular,
    NotoSansTamil_500Medium,
    NotoSansTamil_600SemiBold,
    NotoSansTamil_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const fontsReady = Boolean(loaded || error);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <LanguageProvider>
      <ProfileFormProvider>
        <SubscriptionProvider>
        <UserApprovalProvider>
        <MemberDirectoryProvider>
        <ChatProvider>
        <MatchActionsProvider>
        <AppSplashGate fontsReady={fontsReady}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="login" />
          <Stack.Screen name="otp" />
          <Stack.Screen name="create-profile" />
          <Stack.Screen name="profile-setup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="add-photos" />
          <Stack.Screen name="add-profile" />
          <Stack.Screen name="view-profile" />
          <Stack.Screen name="partner-preferences" />
          <Stack.Screen name="privacy-settings" />
          <Stack.Screen name="edit-mobile" />
          <Stack.Screen name="change-password" />
          <Stack.Screen name="info" />
          <Stack.Screen name="member/[id]" />
          <Stack.Screen name="conversation/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="payment-access" />
          <Stack.Screen name="upgrade" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack>
        </AppSplashGate>
        </MatchActionsProvider>
        </ChatProvider>
        </MemberDirectoryProvider>
        </UserApprovalProvider>
        </SubscriptionProvider>
      </ProfileFormProvider>
    </LanguageProvider>
    </SafeAreaProvider>
  );
}
