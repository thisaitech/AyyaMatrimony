import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  canRevealPhoneNumber,
  InterestStatus,
  maskPhoneNumber,
  normalizePhoneDigits,
} from '@/constants/contactDetails';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing, typography } from '@/constants/theme';

type ProfileContactSectionProps = {
  phoneNumber: string;
  whatsappNumber?: string;
  facebookProfile?: string;
  instagramProfile?: string;
  interestStatus: InterestStatus;
};

type ContactRowProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
};

function ContactRow({ icon, label, value }: ContactRowProps) {
  return (
    <View style={styles.row}>
      <MaterialIcons name={icon} size={18} color={colors.onSurfaceVariant} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export function ProfileContactSection({
  phoneNumber,
  whatsappNumber,
  facebookProfile,
  instagramProfile,
  interestStatus,
}: ProfileContactSectionProps) {
  const { translate } = useLanguage();
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const normalizedPhone = normalizePhoneDigits(phoneNumber);
  const showRevealButton = canRevealPhoneNumber(interestStatus) && !phoneRevealed;
  const displayedPhone = phoneRevealed ? normalizedPhone : maskPhoneNumber(normalizedPhone);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{translate('contactDetails')}</Text>

      <View style={styles.phoneBlock}>
        <View style={styles.row}>
          <MaterialIcons name="phone" size={18} color={colors.onSurfaceVariant} />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{translate('phoneNumber')}</Text>
            <Text style={styles.rowValue}>{displayedPhone}</Text>
          </View>
        </View>
        {showRevealButton ? (
          <Pressable style={styles.revealButton} onPress={() => setPhoneRevealed(true)}>
            <MaterialIcons name="visibility" size={16} color={colors.onPrimary} />
            <Text style={styles.revealText}>{translate('showNumber')}</Text>
          </Pressable>
        ) : null}
        {!canRevealPhoneNumber(interestStatus) ? (
          <Text style={styles.hint}>{translate('phoneRevealHint')}</Text>
        ) : null}
      </View>

      {whatsappNumber ? (
        <ContactRow
          icon="chat"
          label={translate('whatsappNumber')}
          value={maskPhoneNumber(whatsappNumber)}
        />
      ) : null}
      {facebookProfile ? (
        <ContactRow icon="facebook" label={translate('facebookProfile')} value={facebookProfile} />
      ) : null}
      {instagramProfile ? (
        <ContactRow
          icon="camera-alt"
          label={translate('instagramProfile')}
          value={instagramProfile}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.titleLg,
    color: colors.primary,
  },
  phoneBlock: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rowValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  revealButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  revealText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  },
  hint: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
