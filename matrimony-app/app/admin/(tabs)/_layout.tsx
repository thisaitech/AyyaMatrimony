import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminFab } from '@/components/admin/AdminFab';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  adminColors,
  getAdminNavigatorTabBarStyle,
  getAdminSceneBottomInset,
} from '@/constants/admin';

const TAB_ICON_SIZE = 22;

export default function AdminTabsLayout() {
  const router = useRouter();
  const { isReady, isAuthenticated } = useAdminAuth();
  const { translate } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarStyle = getAdminNavigatorTabBarStyle(insets.bottom);
  const sceneBottomInset = getAdminSceneBottomInset(insets.bottom);

  if (!isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={adminColors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.shell}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: adminColors.primary,
          tabBarInactiveTintColor: adminColors.textMuted,
          tabBarStyle,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
          tabBarAllowFontScaling: false,
          safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
          sceneContainerStyle: [
            styles.scene,
            Platform.OS !== 'web' && { paddingBottom: sceneBottomInset },
          ],
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: translate('adminTabDashboard'),
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="dashboard" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: translate('adminTabApprovals'),
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="fact-check" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="approvals"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="payments"
          options={{
            title: translate('adminTabPayments'),
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="payments" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="photos"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: translate('adminTabMatches'),
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="favorite" size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
      </Tabs>
      <AdminFab onPress={() => router.push('/admin/add-member')} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    position: 'relative',
    backgroundColor: adminColors.background,
  },
  scene: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adminColors.background,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
    marginTop: 2,
    marginBottom: 0,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
    paddingBottom: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
