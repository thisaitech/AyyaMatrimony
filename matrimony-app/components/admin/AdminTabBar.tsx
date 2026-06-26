import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  adminColors,
  getAdminNavigatorTabBarStyle,
  getAdminTabBarInnerStyle,
  getAdminTabBarMetrics,
} from '@/constants/admin';

/**
 * Pins the admin tab bar flush to the physical screen bottom on native APK builds.
 * The navigator must pass `safeAreaInsets: { bottom: 0 }` and scene bottom padding.
 */
export function AdminTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const metrics = getAdminTabBarMetrics(insets.bottom);

  if (Platform.OS === 'web') {
    return (
      <BottomTabBar
        {...props}
        insets={{ top: 0, right: 0, bottom: 0, left: 0 }}
        style={[getAdminNavigatorTabBarStyle(insets.bottom), props.style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.shell,
        {
          paddingTop: metrics.paddingTop,
          paddingBottom: metrics.paddingBottom,
        },
      ]}
    >
      <BottomTabBar
        {...props}
        insets={{ top: 0, right: 0, bottom: 0, left: 0 }}
        style={[getAdminTabBarInnerStyle(), props.style, styles.bar]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: adminColors.surface,
    borderTopWidth: 1,
    borderTopColor: adminColors.border,
    ...Platform.select({
      android: { elevation: 12 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  bar: {
    flex: 0,
    width: '100%',
  },
});
