import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Language } from '@/constants/i18n';
import { useLanguage } from '@/context/LanguageContext';

type LanguageLogoToggleProps = {
  variant?: 'default' | 'maroon';
  compact?: boolean;
  dense?: boolean;
};

const options: { id: Language; label: string; denseLabel?: string; accessibilityLabel: string }[] = [
  { id: 'en', label: 'English', denseLabel: 'EN', accessibilityLabel: 'English' },
  { id: 'ta', label: 'தமிழ்', denseLabel: 'த', accessibilityLabel: 'Tamil' },
];

export function LanguageLogoToggle({
  variant = 'default',
  compact = false,
  dense = false,
}: LanguageLogoToggleProps) {
  const { language, setLanguage } = useLanguage();
  const isMaroon = variant === 'maroon';

  return (
    <View
      style={[styles.row, compact && styles.rowCompact, dense && styles.rowDense]}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const isActive = language === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.accessibilityLabel}
            onPress={() => void setLanguage(option.id)}
            style={[
              styles.badge,
              compact && styles.badgeCompact,
              dense && styles.badgeDense,
              isMaroon ? styles.badgeMaroon : styles.badgeDefault,
              isActive && (isMaroon ? styles.badgeMaroonActive : styles.badgeDefaultActive),
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                compact && styles.badgeTextCompact,
                dense && styles.badgeTextDense,
                option.id === 'ta' && !dense && styles.badgeTextTamil,
                dense && option.id === 'ta' && styles.badgeTextTamilDense,
                isMaroon ? styles.badgeTextMaroon : styles.badgeTextDefault,
                isActive &&
                  (isMaroon ? styles.badgeTextMaroonActive : styles.badgeTextDefaultActive),
              ]}
            >
              {dense && option.denseLabel ? option.denseLabel : option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCompact: {
    gap: 6,
  },
  rowDense: {
    gap: 4,
  },
  badge: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeCompact: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
  },
  badgeDense: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  badgeDefault: {
    backgroundColor: '#fff',
    borderColor: 'rgba(141, 30, 30, 0.25)',
  },
  badgeDefaultActive: {
    backgroundColor: '#8D1E1E',
    borderColor: '#8D1E1E',
  },
  badgeMaroon: {
    backgroundColor: '#fff',
    borderColor: 'rgba(139, 0, 0, 0.35)',
  },
  badgeMaroonActive: {
    backgroundColor: '#8B0000',
    borderColor: '#8B0000',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badgeTextCompact: {
    fontSize: 10,
  },
  badgeTextDense: {
    fontSize: 9,
    letterSpacing: 0,
  },
  badgeTextTamil: {
    fontSize: 12,
  },
  badgeTextTamilDense: {
    fontSize: 11,
  },
  badgeTextDefault: {
    color: '#8D1E1E',
  },
  badgeTextDefaultActive: {
    color: '#fff',
  },
  badgeTextMaroon: {
    color: '#8B0000',
  },
  badgeTextMaroonActive: {
    color: '#fff',
  },
});
