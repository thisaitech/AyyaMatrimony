import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AdminApprovalsProvider } from '@/context/AdminApprovalsContext';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { AdminNotificationsProvider } from '@/context/AdminNotificationsContext';
import { AdminPhotoApprovalsProvider } from '@/context/AdminPhotoApprovalsContext';
import { adminColors } from '@/constants/admin';

export default function AdminRootLayout() {
  useEffect(() => {
    void import('@/lib/firebase').then(({ getFirebaseFirestore }) => getFirebaseFirestore());
  }, []);

  return (
    <AdminAuthProvider>
      <AdminApprovalsProvider>
        <AdminPhotoApprovalsProvider>
          <AdminNotificationsProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: adminColors.background },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="add-member" />
              <Stack.Screen name="user/[phone]" />
              <Stack.Screen name="view-profile/[phone]" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </AdminNotificationsProvider>
        </AdminPhotoApprovalsProvider>
      </AdminApprovalsProvider>
    </AdminAuthProvider>
  );
}
