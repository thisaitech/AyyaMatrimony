import { useCallback } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreateProfileBiodataForm, RegistrationNumberBar } from '@/components/CreateProfileBiodataForm';
import { LanguageLogoToggle } from '@/components/LanguageLogoToggle';
import { images } from '@/constants/images';
import { colors, fonts, spacing } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';

export default function CreateProfileScreen() {
  const router = useRouter();
  const { translate } = useLanguage();

  const handleSave = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.pageHeaderWrap}>
        <LinearGradient
          colors={['#FFFFFF', '#FFF9F8', '#F6FAFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pageHeader}
        >
          <View style={styles.pageHeaderRow}>
            <View style={styles.brandBlock}>
              <View style={styles.brandLogoWrap}>
                <Image source={images.logo} style={styles.brandLogo} resizeMode="contain" />
              </View>
              <Text style={styles.brandName} numberOfLines={1} ellipsizeMode="tail">
                {translate('matrimony')}
              </Text>
            </View>
            <RegistrationNumberBar editable inline />
            <LanguageLogoToggle variant="maroon" compact dense />
          </View>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(212, 175, 55, 0.55)', 'rgba(87, 0, 0, 0.35)', 'rgba(212, 175, 55, 0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerAccent}
        />
      </View>
      <CreateProfileBiodataForm editable onSave={handleSave} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7FC',
  },
  pageHeaderWrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(87, 0, 0, 0.06)',
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(87, 0, 0, 0.06)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  pageHeader: {
    paddingHorizontal: spacing.sm,
    paddingTop: 6,
    paddingBottom: 6,
  },
  headerAccent: {
    height: 2,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLogoWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    backgroundColor: '#FFFFFF',
    padding: 2,
    flexShrink: 0,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(87, 0, 0, 0.08)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  brandLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  brandName: {
    flex: 1,
    minWidth: 0,
    color: colors.primary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: fonts.playfairSemi,
    letterSpacing: 0.4,
  },
});
