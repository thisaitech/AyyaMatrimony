import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing, typography } from '@/constants/theme';

type NotificationPermissionModalProps = {
  visible: boolean;
  onAllow: () => void;
  onDontAllow: () => void;
};

export function NotificationPermissionModal({
  visible,
  onAllow,
  onDontAllow,
}: NotificationPermissionModalProps) {
  const { translate } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.message}>{translate('notificationPrompt')}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onAllow}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.allowText}>{translate('allowNotifications')}</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              onPress={onDontAllow}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.denyText}>{translate('dontAllowNotifications')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    overflow: 'hidden',
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurface,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60, 60, 67, 0.29)',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  actionPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60, 60, 67, 0.29)',
  },
  allowText: {
    ...typography.titleLg,
    fontSize: 17,
    color: '#007AFF',
  },
  denyText: {
    ...typography.bodyMd,
    fontSize: 17,
    color: '#007AFF',
  },
});
