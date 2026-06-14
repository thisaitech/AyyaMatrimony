import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing, typography } from '@/constants/theme';

const OTP_LENGTH = 6;

function useOtpLayout() {
  const { width } = useWindowDimensions();
  const isCompact = width < 420;

  return useMemo(() => {
    const contentPadding = spacing.containerMargin * 2;
    const cardPadding = (isCompact ? spacing.md : spacing.xl) * 2;
    const gap = isCompact ? 4 : 6;
    const availableWidth = width - contentPadding - cardPadding;
    const rawBoxWidth = (availableWidth - gap * (OTP_LENGTH - 1)) / OTP_LENGTH;
    const boxWidth = Math.min(isCompact ? 40 : 48, Math.floor(rawBoxWidth));
    const boxHeight = isCompact ? 42 : 52;
    const fontSize = isCompact ? 18 : 20;

    return { isCompact, gap, boxWidth, boxHeight, fontSize };
  }, [width, isCompact]);
}

export default function OtpScreen() {
  const router = useRouter();
  const { translate } = useLanguage();
  const { isCompact, gap, boxWidth, boxHeight, fontSize } = useOtpLayout();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timeLeft, setTimeLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);
  const hasNavigated = useRef(false);

  const otpComplete = otp.every((digit) => digit.length === 1);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (!otpComplete || hasNavigated.current) {
      return;
    }
    hasNavigated.current = true;
    router.replace('/profile-setup/1');
  }, [otpComplete, router]);

  const handleChange = (value: string, index: number) => {
    const digits = value.replace(/\D/g, '');

    if (digits.length > 1) {
      const next = [...otp];
      for (let i = 0; i < OTP_LENGTH; i += 1) {
        next[i] = digits[i] ?? '';
      }
      setOtp(next);
      inputs.current[Math.min(digits.length, OTP_LENGTH) - 1]?.focus();
      return;
    }

    const digit = digits.slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    hasNavigated.current = false;
    setTimeLeft(30);
    setCanResend(false);
    setOtp(Array(OTP_LENGTH).fill(''));
    inputs.current[0]?.focus();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader showBack onBack={() => router.replace('/login')} />
      <View style={styles.content}>
        <View style={[styles.card, isCompact && styles.cardCompact]}>
          <View style={[styles.lockBadge, isCompact && styles.lockBadgeCompact]}>
            <View style={[styles.lockInner, isCompact && styles.lockInnerCompact]}>
              <MaterialIcons name="lock" size={isCompact ? 20 : 24} color={colors.onPrimary} />
            </View>
          </View>

          <Text style={[styles.title, isCompact && styles.titleCompact]}>{translate('verifyMobile')}</Text>

          <View style={[styles.otpRow, { gap }]}>
            {otp.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.otpCell,
                  { width: boxWidth, height: boxHeight },
                  digit ? styles.otpFilled : null,
                ]}
              >
                <TextInput
                  ref={(ref) => {
                    inputs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    {
                      fontSize,
                      lineHeight: boxHeight,
                      height: boxHeight,
                    },
                    Platform.OS === 'web' ? styles.otpInputWeb : null,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  textAlignVertical="center"
                  selectTextOnFocus
                />
              </View>
            ))}
          </View>

          {canResend ? (
            <Pressable onPress={handleResend}>
              <Text style={styles.resend}>{translate('resendCode')}</Text>
            </Pressable>
          ) : (
            <View style={styles.timerRow}>
              <MaterialIcons name="schedule" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.timerText}>
                {translate('resendOtpIn')}{' '}
                <Text style={styles.timerValue}>0:{timeLeft.toString().padStart(2, '0')}</Text>
              </Text>
            </View>
          )}

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.containerMargin,
    paddingTop: 80,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  cardCompact: {
    padding: spacing.md,
    borderRadius: 10,
  },
  lockBadge: {
    marginTop: -48,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
    padding: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  lockBadgeCompact: {
    marginTop: -36,
    marginBottom: spacing.md,
    padding: 6,
  },
  lockInner: {
    backgroundColor: colors.primaryContainer,
    padding: 12,
    borderRadius: 9999,
  },
  lockInnerCompact: {
    padding: 8,
  },
  title: {
    ...typography.headlineLg,
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: spacing.lg,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.xl,
    flexWrap: 'nowrap',
  },
  otpCell: {
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(226, 191, 185, 0.3)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: {
    width: '100%',
    fontFamily: typography.titleLg.fontFamily,
    fontWeight: '600',
    color: colors.onSurface,
    padding: 0,
    margin: 0,
    textAlign: 'center',
    includeFontPadding: false,
  },
  otpInputWeb: {
    outlineStyle: 'none',
  },
  otpFilled: {
    backgroundColor: '#fff',
    borderBottomColor: colors.primary,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xl,
  },
  timerText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  timerValue: {
    color: colors.primary,
    fontFamily: typography.titleLg.fontFamily,
  },
  resend: {
    ...typography.labelLg,
    color: colors.surfaceTint,
    textDecorationLine: 'underline',
    marginBottom: spacing.xl,
  },
});
