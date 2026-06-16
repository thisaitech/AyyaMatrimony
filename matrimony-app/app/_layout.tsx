import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { LanguageProvider } from '@/context/LanguageContext';
import { ProfileFormProvider } from '@/context/ProfileFormContext';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.secondaryFixed} />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <ProfileFormProvider>
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
          <Stack.Screen name="partner-preferences" />
          <Stack.Screen name="privacy-settings" />
          <Stack.Screen name="edit-mobile" />
          <Stack.Screen name="change-password" />
          <Stack.Screen name="info" />
          <Stack.Screen name="member/[id]" />
          <Stack.Screen name="upgrade" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack>
      </ProfileFormProvider>
    </LanguageProvider>
  );
}
