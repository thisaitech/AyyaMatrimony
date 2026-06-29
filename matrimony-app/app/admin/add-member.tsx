import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreateProfileBiodataForm } from '@/components/CreateProfileBiodataForm';
import { LanguageLogoToggle } from '@/components/LanguageLogoToggle';
import { adminColors } from '@/constants/admin';
import { CONTACT_PHONE_KEY } from '@/constants/contactDetails';
import { publishProfileFromValues } from '@/constants/memberDirectory';
import { updateApprovalStatus } from '@/lib/firestore/approvalService';
import { approvalDocIdFromPhone } from '@/lib/firestore/collections';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useMemberDirectory } from '@/context/MemberDirectoryContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import { useLanguage } from '@/context/LanguageContext';
import { getFirebaseFirestore, getFirebaseStorage } from '@/lib/firebase';
import { hydrateLocalProfileFromFirestore } from '@/lib/firestore/profileService';
import { resetCloudPhotoUploadAvailability } from '@/lib/firestore/storageService';

export default function AdminAddMemberScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone: editPhone } = useLocalSearchParams<{ phone?: string }>();
  const { isReady: authReady, isAuthenticated } = useAdminAuth();
  const { translate } = useLanguage();
  const { clearProfile, setValue, replaceValues, isReady } = useProfileForm();
  const { refresh: refreshDirectory } = useMemberDirectory();
  const [step, setStep] = useState(1);
  const [editProfileValues, setEditProfileValues] = useState<Record<string, string> | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const isEditing = Boolean(editPhone?.trim());

  useEffect(() => {
    resetCloudPhotoUploadAvailability();
    void getFirebaseFirestore();
    void getFirebaseStorage();
  }, []);

  useEffect(() => {
    if (!authReady || !isAuthenticated || !isReady) return;
    void (async () => {
      if (isEditing && editPhone) {
        setIsEditLoading(true);
        setEditProfileValues(null);
        try {
          const biodata = await hydrateLocalProfileFromFirestore(editPhone);
          if (biodata) {
            await replaceValues(biodata);
            setEditProfileValues(biodata);
            return;
          }
          setEditProfileValues(null);
        } finally {
          setIsEditLoading(false);
        }
        return;
      }

      setEditProfileValues(null);
      setIsEditLoading(false);
      await clearProfile();
      setValue('registrationCommunity', 'hindu');
      setValue('religion', 'hindu');
      setValue('gender', 'male');
    })();
  }, [authReady, isAuthenticated, clearProfile, editPhone, isEditing, isReady, replaceValues, setValue]);

  const handleSave = useCallback(
    async (profileValues: Record<string, string>) => {
      const draftPhone = profileValues[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ?? '';
      const ownerKey = draftPhone ? `admin-${draftPhone}` : `admin-${Date.now()}`;

      const published = await publishProfileFromValues(profileValues, ownerKey, {
        autoApprovePhotos: true,
      }).catch(() => null);

      if (!published) {
        throw new Error('Profile publish failed');
      }

      const phone =
        published.biodata?.[CONTACT_PHONE_KEY]?.replace(/\D/g, '') ||
        published.phoneNumber?.replace(/\D/g, '') ||
        draftPhone;

      if (phone) {
        await updateApprovalStatus(approvalDocIdFromPhone(phone), 'approved').catch(() => undefined);
      }
      await refreshDirectory().catch(() => undefined);
      setEditProfileValues(null);
      await clearProfile().catch(() => undefined);

      if (phone) {
        router.replace(`/admin/view-profile/${phone}` as never);
        return;
      }
      router.replace('/admin/(tabs)/matches' as never);
    },
    [clearProfile, refreshDirectory, router],
  );

  if (!authReady) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  if (isEditing && isEditLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={adminColors.primary} />
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={adminColors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {isEditing ? translate('adminEditMember') : translate('adminAddMember')}
          </Text>
        </View>
        <LanguageLogoToggle variant="maroon" compact dense />
      </View>

      <View style={styles.stepRow}>
        {[1, 2, 3, 4, 5].map((item) => (
          <View
            key={item}
            style={[styles.stepDot, item <= step && styles.stepDotActive]}
          />
        ))}
      </View>

      <CreateProfileBiodataForm
        key={isEditing ? `edit-${editPhone}-${editProfileValues?._profileUpdatedAt ?? '0'}` : 'new-member'}
        editable
        preferTamilKeyboard
        showAdminPhoneField
        profileValues={editProfileValues ?? undefined}
        onSave={handleSave}
        onStepChange={setStep}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: adminColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: adminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.border,
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(87, 0, 0, 0.06)' },
      default: {
        shadowColor: '#570000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adminColors.background,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: adminColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: adminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.border,
  },
  stepDot: {
    width: 32,
    height: 8,
    borderRadius: 4,
    backgroundColor: adminColors.border,
  },
  stepDotActive: {
    backgroundColor: adminColors.primary,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
