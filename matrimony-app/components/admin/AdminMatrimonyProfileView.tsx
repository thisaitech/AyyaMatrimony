import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CreateProfileBiodataForm } from '@/components/CreateProfileBiodataForm';
import { adminColors } from '@/constants/admin';
import { getOptionLabel } from '@/constants/formOptions';
import { ProfilePhotoCarousel } from '@/components/ProfilePhotoCarousel';
import { getProfileAvatarUri } from '@/constants/profileDisplay';
import {
  getAdminProfilePhotoUris,
  parseProfilePhotos,
  PROFILE_PHOTOS_DRAFT_KEY,
  PROFILE_PHOTOS_KEY,
} from '@/constants/profilePhotos';
import { useLanguage } from '@/context/LanguageContext';
import type { FirestoreProfileDoc } from '@/lib/firestore/collections';

type AdminMatrimonyProfileViewProps = {
  profileValues: Record<string, string>;
  profileDoc?: FirestoreProfileDoc | null;
  phone: string;
  community?: string;
  browseHidden?: boolean;
  onBrowseHiddenChange?: (hidden: boolean) => void;
  onBack: () => void;
  onEdit: () => void;
};

export function AdminMatrimonyProfileView({
  profileValues,
  profileDoc = null,
  phone,
  community,
  browseHidden = false,
  onBrowseHiddenChange,
  onBack,
  onEdit,
}: AdminMatrimonyProfileViewProps) {
  const { language, translate } = useLanguage();
  const [hiddenFromBrowse, setHiddenFromBrowse] = useState(browseHidden);

  useEffect(() => {
    setHiddenFromBrowse(browseHidden);
  }, [browseHidden]);
  const profilePhotos = useMemo(() => {
    const platform = Platform.OS === 'web' ? 'web' : 'native';
    const fallbackSlots = parseProfilePhotos(
      profileValues[PROFILE_PHOTOS_DRAFT_KEY] ?? profileValues[PROFILE_PHOTOS_KEY] ?? '',
    );

    if (profileDoc) {
      const fromDoc = getAdminProfilePhotoUris(profileDoc, platform, fallbackSlots);
      if (fromDoc.length > 0) {
        return fromDoc;
      }
    }

    const fromValues = getAdminProfilePhotoUris(
      {
        biodata: profileValues,
        listing: { image: profileValues.listingImage },
        primaryPhotoUrl: profileValues.profilePhotoUrls?.split('|').find(Boolean),
        photoUrls: profileValues.profilePhotoUrls?.split('|').filter(Boolean),
        approvedPhotoUrls: profileValues.approvedProfilePhotoUrls?.split('|').filter(Boolean),
      },
      platform,
      fallbackSlots,
    );
    if (fromValues.length > 0) {
      return fromValues;
    }

    const avatar = getProfileAvatarUri(profileValues);
    return avatar ? [avatar] : [];
  }, [profileDoc, profileValues]);

  const name = profileValues.fullName?.trim() || translate('adminMember');
  const rawCommunity =
    community ||
    profileValues.registrationCommunity?.trim() ||
    profileValues.caste?.trim() ||
    '';
  const communityLabel =
    rawCommunity === 'hindu'
      ? translate('hindu')
      : rawCommunity === 'christian'
        ? translate('christian')
        : rawCommunity || '—';
  const genderLabel = profileValues.gender
    ? getOptionLabel('gender', profileValues.gender, language, profileValues.gender)
    : '';

  const handleBrowseHiddenToggle = (value: boolean) => {
    setHiddenFromBrowse(value);
    onBrowseHiddenChange?.(value);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={22} color={adminColors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.headerActions}>
          {onBrowseHiddenChange ? (
            <Switch
              value={hiddenFromBrowse}
              onValueChange={handleBrowseHiddenToggle}
              trackColor={{ true: adminColors.primary, false: adminColors.border }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
              accessibilityLabel={translate('adminBrowseHiddenLabel')}
              style={styles.headerSwitch}
            />
          ) : null}
          <Pressable onPress={onEdit} hitSlop={8} style={styles.editBtn}>
            <MaterialIcons name="edit" size={18} color="#fff" />
            <Text style={styles.editBtnText}>{translate('adminEdit')}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.photoSection}>
          <ProfilePhotoCarousel
            photos={profilePhotos}
            arrowColor="#fff"
            counterColor="#fff"
            imageWrapStyle={styles.imageWrap}
            style={styles.carousel}
            maxWidth={undefined}
            aspectRatio={0.9}
            overlay={
              <>
                <View style={styles.nameRow}>
                  <Text style={styles.overlayName} numberOfLines={2}>
                    {name}
                  </Text>
                  <View style={styles.verifiedBadge}>
                    <MaterialIcons name="verified" size={15} color="#fff" />
                  </View>
                </View>
                <View style={styles.phoneRow}>
                  <View style={styles.phoneIconWrap}>
                    <MaterialIcons name="phone" size={13} color="#fff" />
                  </View>
                  <Text style={styles.overlayPhone}>+91 {phone}</Text>
                </View>
                {communityLabel || genderLabel ? (
                  <Text style={styles.overlayMeta}>
                    {[communityLabel, genderLabel].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </>
            }
          />
        </View>

        <View style={styles.formWrap}>
          <CreateProfileBiodataForm
            key={`admin-view-${phone}-${profileValues._profileUpdatedAt ?? profileValues.registrationNumber ?? '0'}`}
            editable={false}
            viewOnly
            profileValues={profileValues}
            onSave={() => undefined}
          />
        </View>
      </ScrollView>
    </View>
  );
}

export function AdminMatrimonyProfileLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={adminColors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: adminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: adminColors.text,
    minWidth: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: adminColors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    paddingBottom: 48,
    gap: 12,
  },
  photoSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: adminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.border,
  },
  carousel: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  imageWrap: {},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayName: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adminColors.success,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  phoneIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  overlayPhone: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlayMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  formWrap: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'visible',
    backgroundColor: '#F3F7FC',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
