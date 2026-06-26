import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ProtectedProfileImage } from '@/components/ProtectedProfileImage';
import { getLimitedMemberPreview } from '@/constants/memberAccess';
import { useMemberAccess } from '@/hooks/useMemberAccess';
import { useOpenMemberProfile } from '@/hooks/useOpenMemberProfile';
import { colors, spacing, typography } from '@/constants/theme';

type MatchCardProps = {
  id: string;
  name: string;
  age: string;
  community: string;
  location: string;
  image: string;
  phoneNumber?: string;
  metaLine?: string;
  verified?: boolean;
};

export function MatchCard({
  id,
  name,
  age,
  community,
  location,
  image,
  phoneNumber = '',
  metaLine,
  verified = false,
}: MatchCardProps) {
  const openProfile = useOpenMemberProfile();
  const { canViewFullProfile } = useMemberAccess();
  const profileLocked = !canViewFullProfile(id);
  const display = profileLocked
    ? getLimitedMemberPreview({ name, age, community, location, image })
    : { name, age, community, location, image, verified };

  const summaryLine =
    metaLine?.trim() ||
    `${display.community || '—'}${display.age ? ` - ${display.age}` : ''}`;
  const displayPhone = profileLocked ? '—' : phoneNumber.trim() || '—';

  return (
    <Pressable style={styles.card} onPress={() => openProfile(id)}>
      <View style={styles.cardImageWrap}>
        <ProtectedProfileImage
          imageUri={display.image}
          locked={profileLocked}
          style={styles.cardImage}
          imageStyle={styles.cardImage}
        />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {display.name}
        </Text>
        <View style={styles.phoneRow}>
          <MaterialIcons name="phone" size={13} color={colors.primary} />
          <Text style={styles.cardPhone} numberOfLines={1}>
            {displayPhone}
          </Text>
        </View>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {summaryLine}
        </Text>
      </View>

      <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.08)',
    padding: 10,
    marginBottom: spacing.sm,
  },
  cardImageWrap: {
    width: 64,
    height: 78,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
    flexShrink: 0,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  cardName: {
    ...typography.titleLg,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardPhone: {
    ...typography.bodyMd,
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
  },
  cardMeta: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
});
