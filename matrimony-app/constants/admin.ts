import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, type ViewStyle } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase';
import { FIRESTORE_COLLECTIONS } from '@/lib/firestore/collections';

export const adminColors = {
  primary: '#8B0000',
  primaryDark: '#570000',
  primaryLight: '#FFF5F5',
  background: '#F7F4F2',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  success: '#15803D',
  warning: '#CA8A04',
  danger: '#DC2626',
  info: '#2563EB',
};

export const ADMIN_SESSION_KEY = 'ayya_admin_session_v1';

/** Admin enters this number on the shared login screen — no OTP required. */
export const ADMIN_PHONE = '9999999999';

export const ADMIN_CREDENTIALS_HINT = `Admin phone: ${ADMIN_PHONE}`;

export function isAdminPhone(phone: string): boolean {
  return phone.replace(/\D/g, '') === ADMIN_PHONE;
}

export async function grantAdminSession(): Promise<void> {
  await AsyncStorage.setItem(ADMIN_SESSION_KEY, 'true');

  const db = await getFirebaseFirestore();
  if (!db) {
    return;
  }

  await setDoc(
    doc(db, FIRESTORE_COLLECTIONS.adminUsers, `phone_${ADMIN_PHONE}`),
    {
      adminId: `phone_${ADMIN_PHONE}`,
      phone: ADMIN_PHONE,
      name: 'Ayya Admin',
      role: 'super_admin',
      active: true,
      createdAt: Date.now(),
    },
    { merge: true },
  );
}

export const adminTabs = {
  dashboard: 'Dashboard',
  users: 'Approvals',
  approvals: 'Approvals',
  members: 'Approvals',
  payments: 'Payments',
  photos: 'Photos',
  matches: 'Matches',
  notifications: 'Alerts',
  settings: 'Settings',
} as const;

export const ADMIN_FAB_GAP = 12;
export const ADMIN_TAB_BAR_CONTENT_HEIGHT = 58;
const ADMIN_TAB_BAR_TOP_PADDING = 8;

export type AdminTabBarMetrics = {
  height: number;
  paddingTop: number;
  paddingBottom: number;
  contentHeight: number;
};

export function resolveAdminBottomInset(bottomInset = 0): number {
  const minimum = Platform.OS === 'web' ? 16 : Platform.OS === 'android' ? 10 : 4;
  return Math.max(bottomInset, minimum);
}

export function getAdminTabBarMetrics(bottomInset = 0): AdminTabBarMetrics {
  const paddingBottom = resolveAdminBottomInset(bottomInset);
  const paddingTop = ADMIN_TAB_BAR_TOP_PADDING;
  const contentHeight = ADMIN_TAB_BAR_CONTENT_HEIGHT;

  return {
    paddingTop,
    paddingBottom,
    contentHeight,
    height: contentHeight + paddingTop + paddingBottom,
  };
}

/** Navigator tabBarStyle — pinned to bottom on native APK; web uses normal flow. */
export function getAdminNavigatorTabBarStyle(bottomInset = 0): ViewStyle {
  const metrics = getAdminTabBarMetrics(bottomInset);

  const shared = {
    backgroundColor: adminColors.surface,
    borderTopColor: adminColors.border,
    borderTopWidth: 1,
    height: metrics.height,
    minHeight: metrics.height,
    paddingTop: metrics.paddingTop,
    paddingBottom: metrics.paddingBottom,
    width: '100%' as const,
    alignSelf: 'stretch' as const,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      default: {},
    }),
  };

  if (Platform.OS === 'web') {
    return shared;
  }

  return {
    ...shared,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  };
}

export function getAdminFabBottom(bottomInset = 0): number {
  return getAdminTabBarMetrics(bottomInset).height + ADMIN_FAB_GAP;
}

/** Bottom inset for scrollable admin scenes (matches tab bar footprint). */
export function getAdminSceneBottomInset(bottomInset = 0): number {
  return getAdminTabBarMetrics(bottomInset).height;
}
