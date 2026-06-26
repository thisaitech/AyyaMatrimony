import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApprovalStatusBanner } from '@/components/ApprovalStatusBanner';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import { useLogout } from '@/hooks/useLogout';
import { useSubscription } from '@/context/SubscriptionContext';
import {
  getProfileAvatarUri,
  getProfileMetaLine,
  hasPendingProfilePhoto,
} from '@/constants/profileDisplay';
import { ProtectedProfileImage } from '@/components/ProtectedProfileImage';
import { TranslationKey } from '@/constants/i18n';
import { borderRadius, colors, fonts, spacing, typography } from '@/constants/theme';

type MenuItem = {
  labelKey: TranslationKey;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: Href;
};

const menuItems: MenuItem[] = [
  { labelKey: 'viewProfile', icon: 'visibility', route: '/view-profile' },
  { labelKey: 'editProfile', icon: 'edit', route: '/edit-profile' },
  { labelKey: 'partnerPreferences', icon: 'favorite-border', route: '/partner-preferences' },
  { labelKey: 'privacySettings', icon: 'lock-outline', route: '/privacy-settings' },
  { labelKey: 'settings', icon: 'settings', route: '/settings' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { language, translate, translateFormat } = useLanguage();
  const { values, refreshFromFirestore } = useProfileForm();
  const logout = useLogout();
  const { isPaidMember, profilesAllowed, profilesRemaining } = useSubscription();
  const profileName = values.fullName?.trim() || translate('profile');
  const profileMeta = getProfileMetaLine(values, language);
  const pendingPhoto = hasPendingProfilePhoto(values);
  const avatarUri = getProfileAvatarUri(values, { includePendingUploads: true });

  useFocusEffect(
    useCallback(() => {
      void refreshFromFirestore();
    }, [refreshFromFirestore]),
  );

  const handleLogout = () => {
    void logout();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.hero}>
          <ProtectedProfileImage
            imageUri={avatarUri}
            locked={false}
            pendingModeration={false}
            style={styles.avatarWrap}
            imageStyle={styles.avatar}
          />
          {pendingPhoto ? (
            <Text style={styles.pendingPhotoHint}>{translate('photoPendingReview')}</Text>
          ) : null}
          <Text style={styles.name}>{profileName}</Text>
          {profileMeta ? <Text style={styles.meta}>{profileMeta}</Text> : null}

          <View style={styles.membershipRow}>
            <Text style={styles.membershipType}>
              {isPaidMember ? translate('membershipPaid') : translate('freeMember')}
            </Text>
            {!isPaidMember ? (
              <Pressable style={styles.upgradePill} onPress={() => router.push('/upgrade')}>
                <Text style={styles.upgradeText}>{translate('upgrade')}</Text>
              </Pressable>
            ) : null}
          </View>

          {isPaidMember ? (
            <Text style={styles.paidProfilesMeta}>
              {translateFormat('paidProfilesAvailable', { count: profilesAllowed })}
              {' · '}
              {translateFormat('profilesRemainingFormat', { count: profilesRemaining })}
            </Text>
          ) : null}
        </View>

        <ApprovalStatusBanner />

        <View style={styles.menu}>
          {menuItems.map((item) => (
            <Pressable
              key={item.labelKey}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => router.push(item.route)}
            >
              <MaterialIcons name={item.icon} size={22} color={colors.primary} />
              <Text
                style={[styles.menuLabel, language === 'ta' && styles.menuLabelTamil]}
                numberOfLines={2}
              >
                {translate(item.labelKey)}
              </Text>
              <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={22} color={colors.primary} />
            <Text
              style={[styles.menuLabel, language === 'ta' && styles.menuLabelTamil]}
              numberOfLines={2}
            >
              {translate('logout')}
            </Text>
            <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.lg,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  pendingPhotoHint: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  name: {
    ...typography.headlineLg,
    color: colors.primary,
  },
  meta: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  membershipType: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  paidProfilesMeta: {
    ...typography.labelSm,
    color: colors.primary,
    fontFamily: fonts.interSemi,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  upgradePill: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: colors.surface,
  },
  upgradeText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontSize: 11,
  },
  menu: {
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.2)',
    gap: spacing.md,
  },
  menuItemPressed: {
    backgroundColor: colors.surfaceContainerLow,
    opacity: 0.9,
  },
  menuLabel: {
    ...typography.labelLg,
    color: colors.onSurface,
    flex: 1,
    minWidth: 0,
  },
  menuLabelTamil: {
    fontSize: 14,
    lineHeight: 18,
  },
});
