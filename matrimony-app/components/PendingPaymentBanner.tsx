import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { colors, spacing, typography } from '@/constants/theme';
import { premiumCard } from '@/constants/premiumUi';

export function PendingPaymentBanner() {
  const { translate } = useLanguage();
  const { pendingPayment, isPaidMember } = useSubscription();

  if (!pendingPayment || isPaidMember) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <MaterialIcons name="payments" size={22} color={colors.primary} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>{translate('paymentPendingReviewTitle')}</Text>
        <Text style={styles.message}>{translate('paymentPendingReviewMessage')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: premiumCard.radius,
    borderWidth: 1,
    backgroundColor: '#F3F8FF',
    borderColor: 'rgba(87, 0, 0, 0.1)',
    ...premiumCard.shadow,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
});
