import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing, typography } from '@/constants/theme';

type MatchCardProps = {
  id: string;
  name: string;
  age: string;
  community: string;
  location: string;
  image: string;
  badge?: string;
  verified?: boolean;
};

export function MatchCard({
  id,
  name,
  age,
  community,
  location,
  image,
  badge,
  verified,
}: MatchCardProps) {
  const router = useRouter();
  const { translate } = useLanguage();

  const openProfile = () => {
    router.push({ pathname: '/member/[id]', params: { id } });
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Pressable onPress={openProfile}>
          <Image source={{ uri: image }} style={styles.image} />
        </Pressable>
        <View style={styles.content}>
          <Pressable onPress={openProfile}>
            <View style={styles.header}>
              <Text style={styles.name}>{name}</Text>
              {badge ? <Text style={styles.badge}>{badge}</Text> : null}
              {verified ? <MaterialIcons name="verified" size={18} color={colors.secondary} /> : null}
            </View>
            <InfoRow icon="calendar-today" text={age} />
            <InfoRow icon="groups" text={community} />
            <InfoRow icon="location-on" text={location} />
          </Pressable>
          <View style={styles.actions}>
            <Pressable style={styles.outlineBtn}>
              <MaterialIcons name="star-outline" size={18} color={colors.primary} />
              <Text style={styles.outlineText}>{translate('shortlist')}</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn}>
              <MaterialIcons name="favorite" size={18} color={colors.onPrimary} />
              <Text style={styles.primaryText}>{translate('interest')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={16} color={colors.onSurfaceVariant} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    minHeight: 176,
  },
  image: {
    width: '33%',
    height: '100%',
    minHeight: 176,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    ...typography.headlineMd,
    fontSize: 18,
    color: colors.primary,
    flex: 1,
  },
  badge: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 191, 185, 0.2)',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.3)',
    borderRadius: 8,
  },
  outlineText: {
    ...typography.labelLg,
    color: colors.primary,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  primaryText: {
    ...typography.labelLg,
    color: colors.onPrimary,
  },
});
