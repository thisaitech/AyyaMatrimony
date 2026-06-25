import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminColors, getAdminTabBarMetrics } from '@/constants/admin';

/**
 * Pins the admin tab bar to the screen bottom on native.
 * Navigator `tabBarStyle` must use `getAdminNavigatorTabBarStyle` (transparent spacer).
 */
export function AdminTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const metrics = getAdminTabBarMetrics(insets.bottom);

  if (Platform.OS === 'web') {
    return <BottomTabBar {...props} />;
  }

  return (
    <View
      style={[
        styles.shell,
        {
          height: metrics.height,
          paddingTop: metrics.paddingTop,
          paddingBottom: metrics.paddingBottom,
        },
      ]}
    >
      <BottomTabBar
        {...props}
        insets={{ top: 0, right: 0, bottom: 0, left: 0 }}
        style={styles.bar}
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
    overflow: 'hidden',
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
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
});
