import { Alert, Pressable, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ProtectedProfileImage } from '@/components/ProtectedProfileImage';
import { getLimitedMemberPreview } from '@/constants/memberAccess';
import { useLanguage } from '@/context/LanguageContext';
import { useMatchActions } from '@/context/MatchActionsContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useOpenMemberProfile, useRequirePaidContact } from '@/hooks/useOpenMemberProfile';
import { borderRadius, colors, fonts, spacing, typography } from '@/constants/theme';

type MatchCardProps = {
  id: string;
  name: string;
  age: string;
  community: string;
  location: string;
  image: string;
  occupation?: string;
  verified?: boolean;
  online?: boolean;
};

export function MatchCard({
  id,
  name,
  age,
  community,
  location,
  image,
  occupation = '—',
  verified = false,
  online = true,
}: MatchCardProps) {
  const router = useRouter();
  const openProfile = useOpenMemberProfile();
  const requirePaidContact = useRequirePaidContact();
  const { canViewFullProfile } = useSubscription();
  const { translate, translateFormat } = useLanguage();
  const { hasSentInterest, sendInterest } = useMatchActions();

  const interestSent = hasSentInterest(id);
  const profileLocked = !canViewFullProfile(id);
  const display = profileLocked
    ? getLimitedMemberPreview({ name, age, community, location, image })
    : { name, age, community, location, image, occupation, verified };

  const handleViewProfile = () => {
    openProfile(id);
  };

  const handleInterest = () => {
    if (!requirePaidContact()) {
      return;
    }

    if (interestSent) {
      Alert.alert(translate('interest'), translateFormat('interestAlreadySentFormat', { name }));
      router.push({ pathname: '/(tabs)/interests', params: { direction: 'sent' } });
      return;
    }

    void sendInterest({
      memberId: id,
      memberName: name,
      memberImage: image,
      age,
      community,
      location,
    }).then((result) => {
      Alert.alert(
        translate('interest'),
        result === 'sent'
          ? translateFormat('interestSentFormat', { name })
          : translateFormat('interestAlreadySentFormat', { name }),
      );
      router.push({ pathname: '/(tabs)/interests', params: { direction: 'sent' } });
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Pressable style={styles.photoWrap} onPress={handleViewProfile}>
          <ProtectedProfileImage
            imageUri={display.image}
            locked={profileLocked}
            style={styles.photoWrap}
            imageStyle={styles.image}
          />
          {online ? (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{translate('online')}</Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {display.name}
              </Text>
              {display.verified ? (
                <View style={styles.verifiedIconWrap}>
                  <MaterialIcons name="verified" size={14} color={colors.gold} />
                </View>
              ) : null}
            </View>
            {display.verified ? (
              <View style={styles.verifiedPill}>
                <MaterialIcons name="verified-user" size={12} color={colors.primary} />
                <Text style={styles.verifiedPillText}>{translate('verified')}</Text>
              </View>
            ) : null}
          </View>

          <InfoRow icon="person-outline" text={display.age} />
          <InfoRow icon="work-outline" text={display.occupation ?? occupation} />
          <InfoRow icon="location-on" text={display.location} />
          <InfoRow icon="groups" text={display.community} />

          <View style={styles.actions}>
            <Pressable style={styles.outlineBtn} onPress={handleViewProfile}>
              <MaterialIcons name="visibility" size={16} color={colors.primary} />
              <Text style={styles.outlineText}>{translate('viewProfile')}</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, interestSent && styles.primaryBtnSent]}
              onPress={handleInterest}
            >
              <MaterialIcons name="favorite" size={16} color={colors.onPrimary} />
              <Text style={styles.primaryText}>
                {interestSent ? translate('interestSent') : translate('interest')}
              </Text>
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
      <MaterialIcons name={icon} size={14} color={colors.onSurfaceVariant} />
      <Text style={styles.infoText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.08)',
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(87, 0, 0, 0.07)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    minHeight: 188,
  },
  photoWrap: {
    width: 118,
    backgroundColor: colors.surfaceContainerHigh,
  },
  image: {
    width: '100%',
    height: '100%',
    minHeight: 188,
  },
  onlineBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20, 29, 35, 0.82)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
  },
  onlineText: {
    color: colors.onPrimary,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fonts.interMedium,
  },
  content: {
    flex: 1,
    minWidth: 0,
    padding: spacing.sm,
    justifyContent: 'space-between',
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.titleLg,
    fontSize: 16,
    lineHeight: 22,
    color: colors.primary,
    flexShrink: 1,
  },
  verifiedIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF8E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.45)',
    flexShrink: 0,
  },
  verifiedPillText: {
    ...typography.labelSm,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  infoText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  outlineText: {
    ...typography.labelSm,
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 0,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  primaryBtnSent: {
    opacity: 0.85,
  },
  primaryText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontSize: 11,
    letterSpacing: 0,
  },
});
