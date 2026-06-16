import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FormOptionsKey, getFormOptions, getOptionLabel } from '@/constants/formOptions';
import { Language } from '@/constants/i18n';
import { colors, fonts, spacing, typography } from '@/constants/theme';

export const formFieldStyles = StyleSheet.create({
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  fieldInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.2)',
  },
  fieldInputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  selectTrigger: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selectValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  selectPlaceholder: {
    ...typography.bodyMd,
    color: 'rgba(90, 65, 61, 0.4)',
    flex: 1,
  },
});

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad';
  maxLength?: number;
  secureTextEntry?: boolean;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType = 'default',
  maxLength,
  secureTextEntry,
}: TextFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  if (secureTextEntry) {
    return (
      <View style={formFieldStyles.fieldGroup}>
        <Text style={formFieldStyles.fieldLabel}>{label}</Text>
        <View style={styles.passwordInputRow}>
          <TextInput
            style={[formFieldStyles.fieldInput, styles.passwordInput]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="rgba(90, 65, 61, 0.4)"
            keyboardType={keyboardType}
            maxLength={maxLength}
            secureTextEntry={!isPasswordVisible}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setIsPasswordVisible((current) => !current)}
            style={styles.visibilityButton}
            hitSlop={8}
          >
            <MaterialIcons
              name={isPasswordVisible ? 'visibility-off' : 'visibility'}
              size={22}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={formFieldStyles.fieldGroup}>
      <Text style={formFieldStyles.fieldLabel}>{label}</Text>
      <TextInput
        style={[formFieldStyles.fieldInput, multiline && formFieldStyles.fieldInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(90, 65, 61, 0.4)"
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
}

type ReadOnlyFieldProps = {
  label: string;
  value: string;
};

export function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <View style={formFieldStyles.fieldGroup}>
      <Text style={formFieldStyles.fieldLabel}>{label}</Text>
      <View style={[formFieldStyles.fieldInput, styles.readOnlyInput]}>
        <Text style={styles.readOnlyText}>{value}</Text>
      </View>
    </View>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  showLabel?: boolean;
  compact?: boolean;
  variant?: 'default' | 'premium';
};

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  showLabel = true,
  compact = false,
  variant = 'default',
}: SelectFieldProps) {
  const isPremium = variant === 'premium';
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;
  const compactRowHeight = 20;
  const compactListMaxHeight = Math.min(
    options.length * compactRowHeight + 2,
    compact ? 110 : 220,
  );

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <View style={[formFieldStyles.fieldGroup, open && styles.fieldGroupOpen]}>
      {showLabel && label ? <Text style={formFieldStyles.fieldLabel}>{label}</Text> : null}
      <View style={styles.selectWrapper}>
        <Pressable
          style={[
            formFieldStyles.selectTrigger,
            isPremium && styles.selectTriggerPremium,
            compact && styles.selectTriggerCompact,
            compact && isPremium && styles.selectTriggerPremiumCompact,
            open && styles.selectTriggerOpen,
            open && isPremium && styles.selectTriggerPremiumOpen,
          ]}
          onPress={() => setOpen((current) => !current)}
        >
          <Text
            style={[
              selectedLabel ? formFieldStyles.selectValue : formFieldStyles.selectPlaceholder,
              compact && styles.selectValueCompact,
              isPremium && styles.selectValuePremium,
            ]}
            numberOfLines={1}
          >
            {selectedLabel ?? placeholder}
          </Text>
          <MaterialIcons
            name={open ? 'expand-less' : 'expand-more'}
            size={compact ? 16 : 22}
            color={isPremium ? colors.primary : colors.onSurfaceVariant}
          />
        </Pressable>

        {open ? (
          <View
            style={[
              styles.inlineDropdown,
              isPremium && styles.inlineDropdownPremium,
              compact && styles.inlineDropdownCompact,
            ]}
          >
            <ScrollView
              style={[
                styles.inlineOptionsList,
                compact && styles.inlineOptionsListCompact,
                compact && { maxHeight: compactListMaxHeight },
              ]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={compact && options.length * compactRowHeight > 110}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.optionRow,
                      compact && styles.optionRowCompact,
                      isSelected && styles.optionRowSelected,
                    ]}
                    onPress={() => handleSelect(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        compact && styles.optionTextCompact,
                        isSelected && styles.optionTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <MaterialIcons name="check" size={compact ? 14 : 20} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

type SelectOptionsFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  optionsKey: FormOptionsKey;
  language: Language;
  placeholder?: string;
};

export function SelectOptionsField({
  label,
  value,
  onValueChange,
  optionsKey,
  language,
  placeholder,
}: SelectOptionsFieldProps) {
  const options = useMemo(() => getFormOptions(optionsKey, language), [optionsKey, language]);
  return (
    <SelectField
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
    />
  );
}

function formatDate(day: number, month: number, year: number) {
  const dayText = String(day).padStart(2, '0');
  const monthText = String(month).padStart(2, '0');
  return `${dayText} / ${monthText} / ${year}`;
}

function parseDate(value: string): { day: number; month: number; year: number } | null {
  const parts = value.split('/').map((part) => part.trim());
  if (parts.length !== 3) {
    return null;
  }
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) {
    return null;
  }
  return { day, month, year };
}

const MIN_MATRIMONY_AGE = 18;
const MAX_MATRIMONY_AGE = 65;

function getBirthYearRange() {
  const currentYear = new Date().getFullYear();
  return {
    minYear: currentYear - MAX_MATRIMONY_AGE,
    maxYear: currentYear - MIN_MATRIMONY_AGE,
  };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const MONTH_LABELS: Record<Language, string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  ta: [
    'ஜனவரி',
    'பிப்ரவரி',
    'மார்ச்',
    'ஏப்ரல்',
    'மே',
    'ஜூன்',
    'ஜூலை',
    'ஆகஸ்ட்',
    'செப்டம்பர்',
    'அக்டோபர்',
    'நவம்பர்',
    'டிசம்பர்',
  ],
};

const DATE_PICKER_LABELS: Record<
  Language,
  { day: string; month: string; year: string; dayPlaceholder: string; monthPlaceholder: string; yearPlaceholder: string }
> = {
  en: {
    day: 'Day',
    month: 'Month',
    year: 'Year',
    dayPlaceholder: 'DD',
    monthPlaceholder: 'MM',
    yearPlaceholder: 'YYYY',
  },
  ta: {
    day: 'நாள்',
    month: 'மாதம்',
    year: 'ஆண்டு',
    dayPlaceholder: 'நா',
    monthPlaceholder: 'மா',
    yearPlaceholder: 'ஆண்டு',
  },
};

function buildDayOptions(year: string, month: string) {
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const totalDays =
    parsedYear && parsedMonth ? getDaysInMonth(parsedYear, parsedMonth) : 31;

  return Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    return {
      value: String(day),
      label: String(day).padStart(2, '0'),
    };
  });
}

function buildMonthOptions(language: Language) {
  return MONTH_LABELS[language].map((label, index) => ({
    value: String(index + 1),
    label,
  }));
}

function buildYearOptions() {
  const { minYear, maxYear } = getBirthYearRange();
  const items = [];
  for (let year = maxYear; year >= minYear; year -= 1) {
    items.push({ value: String(year), label: String(year) });
  }
  return items;
}

type DatePickerFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  language: Language;
  showMainLabel?: boolean;
  showPartLabels?: boolean;
  compact?: boolean;
  variant?: 'default' | 'premium';
};

export function DatePickerField({
  label,
  value,
  onValueChange,
  language,
  showMainLabel = true,
  showPartLabels = true,
  compact = false,
  variant = 'default',
}: DatePickerFieldProps) {
  const labels = DATE_PICKER_LABELS[language];
  const parsed = parseDate(value);

  const [day, setDay] = useState(parsed ? String(parsed.day) : '');
  const [month, setMonth] = useState(parsed ? String(parsed.month) : '');
  const [year, setYear] = useState(parsed ? String(parsed.year) : '');

  useEffect(() => {
    const nextParsed = parseDate(value);
    if (nextParsed) {
      setDay(String(nextParsed.day));
      setMonth(String(nextParsed.month));
      setYear(String(nextParsed.year));
      return;
    }
    if (!value) {
      setDay('');
      setMonth('');
      setYear('');
    }
  }, [value]);

  const monthOptions = useMemo(() => buildMonthOptions(language), [language]);
  const yearOptions = useMemo(() => buildYearOptions(), []);
  const dayOptions = useMemo(() => buildDayOptions(year, month), [year, month]);

  const syncValue = (nextDay: string, nextMonth: string, nextYear: string) => {
    if (nextDay && nextMonth && nextYear) {
      onValueChange(formatDate(Number(nextDay), Number(nextMonth), Number(nextYear)));
      return;
    }
    onValueChange('');
  };

  const handleDayChange = (nextDay: string) => {
    setDay(nextDay);
    syncValue(nextDay, month, year);
  };

  const handleMonthChange = (nextMonth: string) => {
    let nextDay = day;
    if (year && nextMonth && day) {
      const maxDay = getDaysInMonth(Number(year), Number(nextMonth));
      if (Number(day) > maxDay) {
        nextDay = String(maxDay);
        setDay(nextDay);
      }
    }
    setMonth(nextMonth);
    syncValue(nextDay, nextMonth, year);
  };

  const handleYearChange = (nextYear: string) => {
    let nextDay = day;
    if (nextYear && month && day) {
      const maxDay = getDaysInMonth(Number(nextYear), Number(month));
      if (Number(day) > maxDay) {
        nextDay = String(maxDay);
        setDay(nextDay);
      }
    }
    setYear(nextYear);
    syncValue(nextDay, month, nextYear);
  };

  return (
    <View style={formFieldStyles.fieldGroup}>
      {showMainLabel ? <Text style={styles.dobMainLabel}>{label}</Text> : null}
      <View style={[styles.dobRow, compact && styles.dobRowCompact]}>
        <View style={styles.dobColumn}>
          <SelectField
            label={labels.day}
            value={day}
            onValueChange={handleDayChange}
            options={dayOptions}
            placeholder={labels.dayPlaceholder}
            showLabel={showPartLabels}
            compact={compact}
            variant={variant}
          />
        </View>
        <View style={styles.dobColumn}>
          <SelectField
            label={labels.month}
            value={month}
            onValueChange={handleMonthChange}
            options={monthOptions}
            placeholder={labels.monthPlaceholder}
            showLabel={showPartLabels}
            compact={compact}
            variant={variant}
          />
        </View>
        <View style={styles.dobColumn}>
          <SelectField
            label={labels.year}
            value={year}
            onValueChange={handleYearChange}
            options={yearOptions}
            placeholder={labels.yearPlaceholder}
            showLabel={showPartLabels}
            compact={compact}
            variant={variant}
          />
        </View>
      </View>
    </View>
  );
}

export function getStoredSelectLabel(
  optionsKey: FormOptionsKey,
  value: string,
  language: Language,
) {
  return getOptionLabel(optionsKey, value, language);
}

const styles = StyleSheet.create({
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.2)',
    paddingRight: spacing.xs,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  visibilityButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  selectTriggerCompact: {
    minHeight: 28,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  selectTriggerPremium: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(87, 0, 0, 0.1)',
    borderRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 2px 10px rgba(87, 0, 0, 0.05)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
      },
    }),
  },
  selectTriggerPremiumCompact: {
    minHeight: 28,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  selectTriggerPremiumOpen: {
    borderColor: 'rgba(87, 0, 0, 0.22)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  selectValuePremium: {
    fontFamily: fonts.interMedium,
    fontSize: 12,
  },
  selectValueCompact: {
    fontSize: 11,
  },
  readOnlyInput: {
    backgroundColor: colors.surfaceContainerHigh,
    opacity: 0.92,
  },
  readOnlyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  fieldGroupOpen: {
    zIndex: 30,
    position: 'relative',
  },
  selectWrapper: {
    position: 'relative',
    width: '100%',
  },
  selectTriggerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLowest,
  },
  inlineDropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 20px rgba(20, 29, 35, 0.12)',
      },
      default: {
        elevation: 6,
        shadowColor: '#141d23',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
    }),
  },
  inlineDropdownPremium: {
    borderColor: 'rgba(87, 0, 0, 0.18)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    ...Platform.select({
      web: { boxShadow: '0 8px 18px rgba(87, 0, 0, 0.1)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  inlineDropdownCompact: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  inlineOptionsList: {
    maxHeight: 220,
  },
  inlineOptionsListCompact: {
    maxHeight: 110,
  },
  dobMainLabel: {
    ...formFieldStyles.fieldLabel,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dobRowCompact: {
    gap: 3,
  },
  dobColumn: {
    flex: 1,
    minWidth: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(226, 191, 185, 0.1)',
  },
  optionRowCompact: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    minHeight: 20,
  },
  optionRowSelected: {
    backgroundColor: colors.surfaceContainerLow,
  },
  optionText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
    paddingRight: spacing.sm,
    lineHeight: 18,
  },
  optionTextCompact: {
    fontSize: 11,
    lineHeight: 12,
    fontFamily: fonts.interMedium,
    paddingRight: 4,
  },
  optionTextSelected: {
    color: colors.primary,
    fontFamily: typography.labelLg.fontFamily,
  },
});
