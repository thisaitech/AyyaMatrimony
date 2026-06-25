import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminColors, ADMIN_TAB_BAR_CONTENT_HEIGHT } from '@/constants/admin';

export function AdminTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'web') {
    return <BottomTabBar {...props} />;
  }

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <BottomTabBar
        {...props}
        style={[props.style, styles.bar]}
        insets={{
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: adminColors.surface,
    borderTopWidth: 1,
    borderTopColor: adminColors.border,
    ...Platform.select({
      android: { elevation: 8 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
    }),
  },
  bar: {
    minHeight: ADMIN_TAB_BAR_CONTENT_HEIGHT,
    paddingTop: 6,
    backgroundColor: adminColors.surface,
  },
});
