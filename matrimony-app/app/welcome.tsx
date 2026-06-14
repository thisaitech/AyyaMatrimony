import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationPermissionModal } from '@/components/NotificationPermissionModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing, typography } from '@/constants/theme';
import { images } from '@/constants/images';
import { requestNotificationPermission } from '@/lib/requestNotificationPermission';

export default function WelcomeScreen() {
  const router = useRouter();
  const { translate } = useLanguage();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const continueToLogin = () => {
    setShowNotificationPrompt(false);
    router.replace('/login');
  };

  const handleAllowNotifications = () => {
    void requestNotificationPermission().finally(continueToLogin);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.glow} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.branding}>
          <View style={styles.logoWrap}>
            <Image source={{ uri: images.logo }} style={styles.logo} />
          </View>
          <Text style={styles.title}>{translate('matrimony')}</Text>
        </View>

        <View style={styles.heroWrap}>
          <View style={styles.heroCard}>
            <Image source={{ uri: images.splashCouple }} style={styles.heroImage} />
            <LinearGradient
              colors={['transparent', 'rgba(87,0,0,0.8)', colors.primary]}
              style={styles.heroGradient}
            />
            <Text style={styles.quote}>{translate('splashQuote')}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={translate('getStarted')}
            icon="arrow-forward"
            variant="gold"
            onPress={() => setShowNotificationPrompt(true)}
          />
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.legal}>{translate('splashLegal')}</Text>
        </View>
      </SafeAreaView>
      <LinearGradient
        colors={['transparent', 'rgba(255,224,136,0.5)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomLine}
      />
      <NotificationPermissionModal
        visible={showNotificationPrompt}
        onAllow={handleAllowNotifications}
        onDontAllow={continueToLogin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  glow: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: 500,
    height: 300,
    borderRadius: 250,
    backgroundColor: 'rgba(254, 214, 91, 0.1)',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
  },
  branding: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 136, 0.3)',
    padding: 8,
    marginBottom: spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  title: {
    ...typography.headlineLg,
    color: colors.secondaryFixed,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    ...typography.labelLg,
    color: 'rgba(255, 224, 136, 0.7)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  heroWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 4 / 5,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 136, 0.2)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
  },
  quote: {
    position: 'absolute',
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
    ...typography.headlineMd,
    fontSize: 22,
    color: '#fff',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 224, 136, 0.3)',
  },
  dotActive: {
    backgroundColor: colors.secondaryFixed,
  },
  legal: {
    ...typography.labelSm,
    color: 'rgba(255, 131, 113, 0.6)',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
