import { Platform } from 'react-native';
import { colors } from '@/constants/theme';

/** Shared premium field + card tokens for member and admin forms. */
export const premiumField = {
  bg: '#FFFBF9',
  border: 'rgba(87, 0, 0, 0.12)',
  borderStrong: 'rgba(87, 0, 0, 0.22)',
  placeholder: 'rgba(90, 65, 61, 0.42)',
  radius: 12,
  minHeight: 44,
  minHeightCompact: 38,
};

export const premiumCard = {
  bg: colors.surfaceContainerLowest,
  border: 'rgba(87, 0, 0, 0.08)',
  radius: 16,
  shadow: Platform.select({
    web: { boxShadow: '0 4px 20px rgba(87, 0, 0, 0.07)' },
    default: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
  }),
};

export const premiumFieldShadow = Platform.select({
  web: { boxShadow: '0 2px 8px rgba(87, 0, 0, 0.06)' },
  default: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
});
