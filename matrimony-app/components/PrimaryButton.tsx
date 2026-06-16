import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  variant?: 'primary' | 'gold' | 'outline' | 'outlineGold';
  style?: ViewStyle;
  labelStyle?: object;
  iconColor?: string;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  style,
  labelStyle,
  iconColor,
  disabled = false,
}: PrimaryButtonProps) {
  const resolvedIconColor =
    iconColor ??
    (variant === 'outline' || variant === 'outlineGold'
      ? colors.primary
      : variant === 'gold'
        ? '#FFFFFF'
        : colors.onPrimary);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'gold' && styles.gold,
        variant === 'outline' && styles.outline,
        variant === 'outlineGold' && styles.outlineGold,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.primaryLabel,
          variant === 'gold' && styles.goldLabel,
          variant === 'outline' && styles.outlineLabel,
          variant === 'outlineGold' && styles.outlineGoldLabel,
          labelStyle,
        ]}
      >
        {label}
      </Text>
      {icon ? <MaterialIcons name={icon} size={20} color={resolvedIconColor} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gold: {
    backgroundColor: '#8B6914',
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  outlineGold: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 136, 0.45)',
    borderRadius: 9999,
  },
  label: {
    ...typography.titleLg,
    fontSize: 16,
  },
  primaryLabel: {
    color: colors.onPrimary,
  },
  goldLabel: {
    color: '#FFFFFF',
  },
  outlineLabel: {
    color: colors.primary,
  },
  outlineGoldLabel: {
    color: colors.secondaryFixed,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
