import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreateProfileBiodataForm } from '@/components/CreateProfileBiodataForm';
import { adminColors } from '@/constants/admin';
import { publishProfileFromValues } from '@/constants/memberDirectory';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useProfileForm } from '@/context/ProfileFormContext';

export default function AdminAddMemberScreen() {
  const router = useRouter();
  const { isReady: authReady, isAuthenticated } = useAdminAuth();
  const { clearProfile, setValue, isReady } = useProfileForm();
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!authReady || !isAuthenticated || !isReady) return;
    void (async () => {
      await clearProfile();
      setValue('registrationCommunity', 'hindu');
      setValue('religion', 'hindu');
      setValue('gender', 'male');
    })();
  }, [authReady, isAuthenticated, clearProfile, isReady, setValue]);

  if (!authReady) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/" />;
  }

  const handleSave = useCallback(() => {
    void (async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));

      const raw = await AsyncStorage.getItem('user_profile');
      let profileValues: Record<string, string> = {};
      if (raw) {
        try {
          profileValues = JSON.parse(raw) as Record<string, string>;
        } catch {
          profileValues = {};
        }
      }

      await publishProfileFromValues(profileValues, `admin-${Date.now()}`);
      await clearProfile();
      router.replace('/admin/(tabs)/');
    })();
  }, [clearProfile, router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={adminColors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Add member</Text>
        </View>
      </View>

      <View style={styles.stepRow}>
        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            style={[styles.stepDot, item <= step && styles.stepDotActive]}
          />
        ))}
      </View>

      <CreateProfileBiodataForm
        editable
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
    paddingVertical: 12,
    backgroundColor: adminColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: adminColors.border,
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
    width: 28,
    height: 6,
    borderRadius: 3,
    backgroundColor: adminColors.border,
  },
  stepDotActive: {
    backgroundColor: adminColors.primary,
  },
});
