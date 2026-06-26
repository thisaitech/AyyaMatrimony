import { useMemo, useCallback } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { PaymentMethodModal } from '@/components/PaymentMethodModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { usePaymentCheckout } from '@/hooks/usePaymentCheckout';
import { colors, fonts, spacing, typography } from '@/constants/theme';

export default function PaymentAccessScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { translate, translateFormat } = useLanguage();
  const {
    chooseUnpaidAccess,
    accessPrice,
    batchSize,
    profilesRemaining,
    profilesViewedCount,
    profilesAllowed,
    isPaidMember,
    hasPaidProfileQuota,
    batchesPaid,
    hasChosenAccessMode,
    isReady,
    isLoggedIn,
    needsPaymentAccess,
  } = useSubscription();
  const {
    paymentModalVisible,
    openPaymentMethods,
    closePaymentMethods,
    handlePaymentMethodSelect,
    accessPrice: checkoutPrice,
  } = usePaymentCheckout(() => {
    router.replace('/(tabs)');
  });

  const isBatchRenewal = reason === 'batch' || (isPaidMember && profilesRemaining <= 0);
  const isExplicitUpgradeRequest = reason === 'initial' || reason === 'batch';
  const shouldRedirectPaidUser = isReady && hasPaidProfileQuota && reason !== 'batch';

  const headline = useMemo(() => {
    if (isBatchRenewal) {
      return translate('paymentAccessNextBatch');
    }
    return translate('paymentAccessInitial');
  }, [isBatchRenewal, translate]);

  const handleBack = useCallback(() => {
    const goHome = () => {
      router.replace('/(tabs)');
    };

    if (!hasChosenAccessMode) {
      void chooseUnpaidAccess().then(goHome);
      return;
    }

    goHome();
  }, [chooseUnpaidAccess, hasChosenAccessMode, router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack]),
  );

  const handleUnpaid = () => {
    if (isBatchRenewal) {
      handleBack();
      return;
    }

    void chooseUnpaidAccess().then(() => {
      router.replace('/(tabs)');
    });
  };

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/" />;
  }

  if (!needsPaymentAccess && !isBatchRenewal && !isExplicitUpgradeRequest) {
    return <Redirect href="/(tabs)" />;
  }

  if (shouldRedirectPaidUser) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader
        title={translate('paymentAccessTitle')}
        showBack
        showTamil={false}
        onBack={handleBack}
      />
      <LinearGradient
        colors={['#FFF9F8', '#FFFFFF', '#F6FAFF']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="payments" size={34} color={colors.primary} />
          </View>

          <Text style={styles.subtitle}>{headline}</Text>

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>{translate('profileAccessPlan')}</Text>
            <Text style={styles.priceValue}>₹ {accessPrice.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.featureList}>
            {(
              [
                'paymentFeatureViewProfiles',
                'paymentFeaturePhotosDetails',
                'paymentFeatureContactInfo',
              ] as const
            ).map((key) => (
              <View key={key} style={styles.featureRow}>
                <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                <Text style={styles.featureText}>{translate(key)}</Text>
              </View>
            ))}
          </View>

          {isPaidMember ? (
            <Text style={styles.usageText}>
              {translateFormat('viewsUsedFormat', {
                used: profilesViewedCount,
                total: profilesAllowed,
              })}
            </Text>
          ) : null}

          <PrimaryButton label={translate('payRupee2000')} onPress={openPaymentMethods} />

          {!isBatchRenewal ? (
            <Pressable style={styles.unpaidBtn} onPress={handleUnpaid}>
              <Text style={styles.unpaidBtnText}>{translate('continueUnpaid')}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.unpaidBtn} onPress={handleUnpaid}>
              <Text style={styles.unpaidBtnText}>{translate('cancel')}</Text>
            </Pressable>
          )}

          {isBatchRenewal ? (
            <Text style={styles.note}>
              {translateFormat('profileLimitReachedBody', { count: batchSize })}
            </Text>
          ) : null}

          {batchesPaid > 0 ? (
            <Text style={styles.batchNote}>
              {translateFormat('batchesPaidFormat', { count: batchesPaid })}
            </Text>
          ) : null}
        </ScrollView>
      </LinearGradient>

      <PaymentMethodModal
        visible={paymentModalVisible}
        amount={checkoutPrice}
        onClose={closePaymentMethods}
        onSelect={handlePaymentMethodSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(87, 0, 0, 0.08)',
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  priceCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    backgroundColor: '#FFFBF9',
    padding: spacing.lg,
    alignItems: 'center',
    gap: 6,
    ...Platform.select({
      web: { boxShadow: '0 6px 24px rgba(87, 0, 0, 0.08)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  priceLabel: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  priceValue: {
    fontSize: 34,
    lineHeight: 40,
    color: colors.primary,
    fontFamily: fonts.playfairSemi,
  },
  featureList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  usageText: {
    ...typography.labelLg,
    color: colors.primary,
    textAlign: 'center',
    fontFamily: fonts.interSemi,
  },
  unpaidBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  unpaidBtnText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    fontFamily: fonts.interSemi,
  },
  note: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  batchNote: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
