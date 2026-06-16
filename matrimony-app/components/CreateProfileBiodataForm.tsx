import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { DatePickerField, SelectField } from '@/components/FormControls';
import { FormOptionsKey, getFormOptions, getOptionLabel } from '@/constants/formOptions';
import { Language } from '@/constants/i18n';
import { useProfileForm } from '@/context/ProfileFormContext';
import { useLanguage } from '@/context/LanguageContext';
import { borderRadius, colors, fonts, spacing } from '@/constants/theme';

const SHEET_BORDER = colors.primary;
const HOROSCOPE_RED = '#B00000';

const FIELD_BG = colors.surfaceContainerLowest;
const FIELD_BORDER = 'rgba(87, 0, 0, 0.1)';
const SIDEBAR_CARD_BG = 'rgba(255, 255, 255, 0.88)';
const SIDEBAR_PANEL_BG = '#FFF8F6';
const PLACEHOLDER = 'rgba(90, 65, 61, 0.38)';

const fieldShadow = Platform.select({
  web: { boxShadow: '0 2px 10px rgba(87, 0, 0, 0.05)' },
  default: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
});

const HOROSCOPE_SIZE = 4;
const DETAIL_GRID_COUNT = 30;
const DETAIL_GRID_COLUMNS = 15;
const DETAIL_GRID_ROWS = 2;

type BiodataState = {
  fullName: string;
  dateOfBirth: string;
  natchathiram: string;
  rasi: string;
  occupation: string;
  monthlyIncome: string;
  propertyDetails: string;
  fatherName: string;
  motherName: string;
  irupidam: string;
  totalFamilyMembers: string;
  birthOrder: string;
  marriedBrother: string;
  marriedYoungerBrother: string;
  marriedSister: string;
  marriedYoungerSister: string;
  unmarriedBrother: string;
  unmarriedYoungerBrother: string;
  unmarriedSister: string;
  unmarriedYoungerSister: string;
  complexion: string;
  height: string;
  seervarisai: string;
  dasaBalance: string;
  dasaYear: string;
  dasaMonth: string;
  dasaDay: string;
  registrationNumber: string;
};

function generateRegistrationNumber(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function normalizeRegistrationNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  return digits.slice(-4);
}

function sanitizeRegistrationInput(text: string): string {
  return text.replace(/\D/g, '').slice(0, 4);
}

export function RegistrationNumberBar({
  editable,
  inline = false,
}: {
  editable: boolean;
  inline?: boolean;
}) {
  const { translate } = useLanguage();
  const { getValue, setValue, isReady } = useProfileForm();
  const [registrationNumber, setRegistrationNumber] = useState('');

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const storedRegistration = getValue('registrationNumber').trim();
    const normalizedRegistration = normalizeRegistrationNumber(storedRegistration);
    const nextRegistration = normalizedRegistration || generateRegistrationNumber();
    if (!normalizedRegistration || normalizedRegistration !== storedRegistration) {
      setValue('registrationNumber', nextRegistration);
    }
    setRegistrationNumber(nextRegistration);
  }, [getValue, isReady, setValue]);

  const handleChange = useCallback(
    (text: string) => {
      const digits = sanitizeRegistrationInput(text);
      setRegistrationNumber(digits);
      setValue('registrationNumber', digits);
    },
    [setValue],
  );

  const registrationInputProps = {
    value: registrationNumber,
    onChangeText: handleChange,
    editable,
    placeholderTextColor: PLACEHOLDER,
    keyboardType: 'number-pad' as const,
    maxLength: 4,
  };

  return (
    <View style={[registrationHeaderStyles.wrap, inline && registrationHeaderStyles.wrapInline]}>
      <View style={[registrationHeaderStyles.card, inline && registrationHeaderStyles.cardInline]}>
        <Text
          style={[registrationHeaderStyles.label, inline && registrationHeaderStyles.labelInline]}
          numberOfLines={1}
        >
          {translate(inline ? 'biodataRegistrationNumberShort' : 'biodataRegistrationNumber')}
        </Text>
        {inline ? (
          <TextInput
            style={registrationHeaderStyles.inputInline}
            {...registrationInputProps}
            numberOfLines={1}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={registrationHeaderStyles.scroll}
          >
            <TextInput
              style={registrationHeaderStyles.input}
              {...registrationInputProps}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const registrationHeaderStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
    paddingBottom: 2,
  },
  wrapInline: {
    flexShrink: 0,
    alignItems: 'stretch',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF0ED',
    borderRadius: borderRadius.md,
    paddingVertical: 5,
    paddingHorizontal: 10,
    width: '100%',
    maxWidth: 360,
  },
  cardInline: {
    flexShrink: 0,
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.1)',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(87, 0, 0, 0.06)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  label: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: fonts.interSemi,
    flexShrink: 0,
  },
  labelInline: {
    fontSize: 10,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  input: {
    width: 52,
    minHeight: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    color: colors.onSurface,
    fontSize: 12,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
  },
  inputInline: {
    width: 52,
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 26,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.12)',
    color: colors.onSurface,
    fontSize: 11,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
  },
});

function emptyHoroscope(): string[][] {
  return Array.from({ length: HOROSCOPE_SIZE }, () =>
    Array.from({ length: HOROSCOPE_SIZE }, () => ''),
  );
}

function parseHoroscope(raw: string | undefined): string[][] {
  if (!raw) {
    return emptyHoroscope();
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return emptyHoroscope();
    }
    return Array.from({ length: HOROSCOPE_SIZE }, (_, row) =>
      Array.from({ length: HOROSCOPE_SIZE }, (_, col) => {
        const rowValue = parsed[row];
        if (!Array.isArray(rowValue)) {
          return '';
        }
        return typeof rowValue[col] === 'string' ? rowValue[col] : '';
      }),
    );
  } catch {
    return emptyHoroscope();
  }
}

function parseDetailGrid(raw: string | undefined): string[] {
  if (!raw) {
    return Array.from({ length: DETAIL_GRID_COUNT }, () => '');
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return Array.from({ length: DETAIL_GRID_COUNT }, () => '');
    }
    return Array.from({ length: DETAIL_GRID_COUNT }, (_, index) =>
      typeof parsed[index] === 'string' ? parsed[index] : '',
    );
  } catch {
    return Array.from({ length: DETAIL_GRID_COUNT }, () => '');
  }
}

const cardShadow = Platform.select({
  web: {
    boxShadow: '0 8px 32px rgba(87, 0, 0, 0.1)',
  },
  default: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
});

const actionBarShadow = Platform.select({
  web: {
    boxShadow: '0 -4px 20px rgba(87, 0, 0, 0.08)',
  },
  default: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
});

function resolveStoredOptionValue(
  optionsKey: FormOptionsKey,
  stored: string,
  language: Language,
): string {
  const trimmed = stored.trim();
  if (!trimmed) {
    return '';
  }

  const options = getFormOptions(optionsKey, language);
  if (options.some((option) => option.value === trimmed)) {
    return trimmed;
  }

  const exactLabel = options.find(
    (option) => option.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exactLabel) {
    return exactLabel.value;
  }

  const looseLabel = options.find(
    (option) =>
      option.label.toLowerCase().includes(trimmed.toLowerCase()) ||
      trimmed.toLowerCase().includes(option.label.toLowerCase()),
  );
  return looseLabel?.value ?? trimmed;
}

function BiodataSelectRow({
  label,
  value,
  onValueChange,
  optionsKey,
  editable,
  mobile,
  placeholder,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  optionsKey: FormOptionsKey;
  editable: boolean;
  mobile?: boolean;
  placeholder?: string;
}) {
  const { language } = useLanguage();
  const options = useMemo(() => getFormOptions(optionsKey, language), [optionsKey, language]);
  const resolvedValue = useMemo(
    () => resolveStoredOptionValue(optionsKey, value, language),
    [language, optionsKey, value],
  );

  if (!editable) {
    const display = getOptionLabel(optionsKey, resolvedValue, language, value);
    return (
      <View style={[styles.fieldGroup, mobile && styles.fieldGroupMobile]}>
        <Text style={[styles.fieldLabel, mobile && styles.fieldLabelMobile]}>{label}</Text>
        <View
          style={[
            styles.fieldInput,
            styles.fieldInputReadonly,
            mobile && styles.fieldInputMobile,
          ]}
        >
          <Text style={styles.fieldReadonlyText}>{display || '—'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fieldGroup, mobile && styles.fieldGroupMobile, styles.selectFieldGroup]}>
      <Text style={[styles.fieldLabel, mobile && styles.fieldLabelMobile]}>{label}</Text>
      <SelectField
        label={label}
        value={resolvedValue}
        onValueChange={onValueChange}
        options={options}
        placeholder={placeholder}
        showLabel={false}
        compact
        variant="premium"
      />
    </View>
  );
}

function BiodataDateRow({
  label,
  value,
  onValueChange,
  editable,
  mobile,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  editable: boolean;
  mobile?: boolean;
}) {
  const { language } = useLanguage();

  if (!editable) {
    return (
      <View style={[styles.fieldGroup, mobile && styles.fieldGroupMobile]}>
        <Text style={[styles.fieldLabel, mobile && styles.fieldLabelMobile]}>{label}</Text>
        <View
          style={[
            styles.fieldInput,
            styles.fieldInputReadonly,
            mobile && styles.fieldInputMobile,
          ]}
        >
          <Text style={styles.fieldReadonlyText}>{value || '—'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fieldGroup, mobile && styles.fieldGroupMobile, styles.selectFieldGroup]}>
      <Text style={[styles.fieldLabel, mobile && styles.fieldLabelMobile]}>{label}</Text>
      <DatePickerField
        label={label}
        value={value}
        onValueChange={onValueChange}
        language={language}
        showMainLabel={false}
        showPartLabels={false}
        compact
        variant="premium"
      />
    </View>
  );
}

function BiodataRow({
  label,
  value,
  onChangeText,
  editable,
  multiline,
  mobile,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  multiline?: boolean;
  mobile?: boolean;
}) {
  return (
    <View style={[styles.fieldGroup, mobile && styles.fieldGroupMobile]}>
      <Text style={[styles.fieldLabel, mobile && styles.fieldLabelMobile]}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          mobile && styles.fieldInputMobile,
          multiline && styles.fieldInputMultiline,
          multiline && mobile && styles.fieldInputMultilineMobile,
          !editable && styles.fieldInputReadonly,
        ]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline={multiline}
        placeholderTextColor={PLACEHOLDER}
      />
    </View>
  );
}

function MetricBox({
  label,
  value,
  onChangeText,
  onValueChange,
  optionsKey,
  editable,
  mobile,
  sidebar,
  registration,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  onValueChange?: (value: string) => void;
  optionsKey?: FormOptionsKey;
  editable: boolean;
  mobile?: boolean;
  sidebar?: boolean;
  registration?: boolean;
}) {
  const { language } = useLanguage();

  if (optionsKey) {
    const options = useMemo(() => getFormOptions(optionsKey, language), [language, optionsKey]);
    const resolvedValue = useMemo(
      () => resolveStoredOptionValue(optionsKey, value, language),
      [language, optionsKey, value],
    );

    if (!editable) {
      const display = getOptionLabel(optionsKey, resolvedValue, language, value);
      return (
        <View
          style={[
            styles.metricBox,
            sidebar && styles.metricBoxSidebar,
            mobile && styles.metricBoxMobile,
            sidebar && mobile && styles.metricBoxSidebarMobile,
          ]}
        >
          <Text
            style={[
              styles.metricLabel,
              sidebar && styles.metricLabelSidebar,
              mobile && styles.metricLabelMobile,
              sidebar && mobile && styles.metricLabelSidebarMobile,
            ]}
            numberOfLines={sidebar ? 2 : 1}
          >
            {label}
          </Text>
          <Text
            style={[
              styles.metricInput,
              sidebar && styles.metricInputSidebar,
              mobile && styles.metricInputMobile,
              sidebar && mobile && styles.metricInputSidebarMobile,
              styles.fieldReadonlyText,
            ]}
          >
            {display || '—'}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.metricBox,
          sidebar && styles.metricBoxSidebar,
          mobile && styles.metricBoxMobile,
          sidebar && mobile && styles.metricBoxSidebarMobile,
          styles.selectFieldGroup,
        ]}
      >
        <Text
          style={[
            styles.metricLabel,
            sidebar && styles.metricLabelSidebar,
            mobile && styles.metricLabelMobile,
            sidebar && mobile && styles.metricLabelSidebarMobile,
          ]}
          numberOfLines={sidebar ? 2 : 1}
        >
          {label}
        </Text>
        <SelectField
          label={label}
          value={resolvedValue}
          onValueChange={onValueChange ?? (() => undefined)}
          options={options}
          showLabel={false}
          compact
          variant="premium"
        />
      </View>
    );
  }

  const input = (
    <TextInput
      style={[
        styles.metricInput,
        sidebar && styles.metricInputSidebar,
        mobile && styles.metricInputMobile,
        sidebar && mobile && styles.metricInputSidebarMobile,
        registration && styles.metricInputRegistration,
        registration && mobile && styles.metricInputRegistrationMobile,
      ]}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      placeholderTextColor={PLACEHOLDER}
    />
  );

  return (
    <View
      style={[
        styles.metricBox,
        sidebar && styles.metricBoxSidebar,
        mobile && styles.metricBoxMobile,
        sidebar && mobile && styles.metricBoxSidebarMobile,
        registration && styles.metricBoxRegistration,
      ]}
    >
      <Text
        style={[
          styles.metricLabel,
          sidebar && styles.metricLabelSidebar,
          mobile && styles.metricLabelMobile,
          sidebar && mobile && styles.metricLabelSidebarMobile,
        ]}
        numberOfLines={sidebar ? 2 : 1}
      >
        {label}
      </Text>
      {registration ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regScroll}>
          {input}
        </ScrollView>
      ) : (
        input
      )}
    </View>
  );
}

function MemberBox({
  title,
  fields,
  editable,
  onChange,
  mobile,
  sidebar,
  countSelect,
}: {
  title: string;
  fields: { key: keyof BiodataState; label: string; value: string }[];
  editable: boolean;
  onChange: (key: keyof BiodataState, value: string) => void;
  mobile?: boolean;
  sidebar?: boolean;
  countSelect?: boolean;
}) {
  const { language } = useLanguage();
  const countOptions = useMemo(() => getFormOptions('siblingCount', language), [language]);

  return (
    <View
      style={[
        styles.memberBox,
        sidebar && styles.memberBoxSidebar,
        mobile && styles.memberBoxMobile,
        sidebar && mobile && styles.memberBoxSidebarMobile,
      ]}
    >
      <Text
        style={[
          styles.memberTitle,
          sidebar && styles.memberTitleSidebar,
          mobile && styles.memberTitleMobile,
          sidebar && mobile && styles.memberTitleSidebarMobile,
        ]}
        numberOfLines={sidebar ? 2 : 1}
      >
        {title}
      </Text>
      {fields.map((field) => (
        <View
          key={field.key}
          style={[styles.memberRow, sidebar && styles.memberRowSidebar]}
        >
          <Text
            style={[
              styles.memberLabel,
              sidebar && styles.memberLabelSidebar,
              mobile && styles.memberLabelMobile,
              sidebar && mobile && styles.memberLabelSidebarMobile,
            ]}
            numberOfLines={sidebar ? 2 : 1}
          >
            {field.label}
          </Text>
          {countSelect && sidebar ? (
            editable ? (
              <View style={[styles.memberSelectWrap, styles.selectFieldGroup]}>
                <SelectField
                  label={field.label}
                  value={resolveStoredOptionValue('siblingCount', field.value, language)}
                  onValueChange={(text) => onChange(field.key, text)}
                  options={countOptions}
                  showLabel={false}
                  compact
                  variant="premium"
                />
              </View>
            ) : (
              <Text
                style={[
                  styles.memberInput,
                  sidebar && styles.memberInputSidebar,
                  mobile && styles.memberInputMobile,
                  sidebar && mobile && styles.memberInputSidebarMobile,
                  styles.fieldReadonlyText,
                ]}
              >
                {getOptionLabel(
                  'siblingCount',
                  resolveStoredOptionValue('siblingCount', field.value, language),
                  language,
                  field.value,
                ) || '—'}
              </Text>
            )
          ) : (
          <TextInput
            style={[
              styles.memberInput,
              sidebar && styles.memberInputSidebar,
              mobile && styles.memberInputMobile,
              sidebar && mobile && styles.memberInputSidebarMobile,
            ]}
            value={field.value}
            onChangeText={(text) => onChange(field.key, text)}
            editable={editable}
            placeholderTextColor={PLACEHOLDER}
          />
          )}
        </View>
      ))}
    </View>
  );
}

function HoroscopeChart({
  cells,
  centerLabel,
  editable,
  onCellChange,
  mobile,
}: {
  cells: string[][];
  centerLabel: string;
  editable: boolean;
  onCellChange: (row: number, col: number, value: string) => void;
  mobile?: boolean;
}) {
  const renderCell = (row: number, col: number) => (
    <View
      key={`${row}-${col}`}
      style={[styles.chartCellWrap, mobile && styles.chartCellWrapMobile]}
    >
      <TextInput
        style={[styles.chartCellInput, mobile && styles.chartCellInputMobile]}
        value={cells[row][col]}
        onChangeText={(text) => onCellChange(row, col, text)}
        editable={editable}
        textAlign="center"
        placeholderTextColor="rgba(87, 0, 0, 0.25)"
      />
    </View>
  );

  return (
    <View style={styles.chartWrap}>
      <View style={[styles.chartGrid, mobile && styles.chartGridMobile]}>
        <View style={styles.chartGridRow}>
          {renderCell(0, 0)}
          {renderCell(0, 1)}
          {renderCell(0, 2)}
          {renderCell(0, 3)}
        </View>

        <View style={styles.chartGridRowDouble}>
          <View style={styles.chartSideStack}>
            {renderCell(1, 0)}
            {renderCell(2, 0)}
          </View>
          <View style={[styles.chartCenter, mobile && styles.chartCenterMobile]}>
            <Text
              style={[styles.chartCenterLabel, mobile && styles.chartCenterLabelMobile]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {centerLabel}
            </Text>
          </View>
          <View style={styles.chartSideStack}>
            {renderCell(1, 3)}
            {renderCell(2, 3)}
          </View>
        </View>

        <View style={styles.chartGridRow}>
          {renderCell(3, 0)}
          {renderCell(3, 1)}
          {renderCell(3, 2)}
          {renderCell(3, 3)}
        </View>
      </View>
    </View>
  );
}

type CreateProfileBiodataFormProps = {
  editable: boolean;
  onSave: () => void;
  onDownloadPdf: () => void;
  onEditProfile: () => void;
};

export function CreateProfileBiodataForm({
  editable,
  onSave,
  onDownloadPdf,
  onEditProfile,
}: CreateProfileBiodataFormProps) {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 640;
  const { translate } = useLanguage();
  const { getValue, setValue, isReady } = useProfileForm();
  const [rasiChart, setRasiChart] = useState(emptyHoroscope);
  const [amsamChart, setAmsamChart] = useState(emptyHoroscope);
  const [detailGrid, setDetailGrid] = useState<string[]>(() =>
    Array.from({ length: DETAIL_GRID_COUNT }, () => ''),
  );
  const [form, setForm] = useState<BiodataState>({
    fullName: '',
    dateOfBirth: '',
    natchathiram: '',
    rasi: '',
    occupation: '',
    monthlyIncome: '',
    propertyDetails: '',
    fatherName: '',
    motherName: '',
    irupidam: '',
    totalFamilyMembers: '',
    birthOrder: '',
    marriedBrother: '',
    marriedYoungerBrother: '',
    marriedSister: '',
    marriedYoungerSister: '',
    unmarriedBrother: '',
    unmarriedYoungerBrother: '',
    unmarriedSister: '',
    unmarriedYoungerSister: '',
    complexion: '',
    height: '',
    seervarisai: '',
    dasaBalance: '',
    dasaYear: '',
    dasaMonth: '',
    dasaDay: '',
    registrationNumber: '',
  });

  useEffect(() => {
    if (!isReady) {
      return;
    }

    setRasiChart(parseHoroscope(getValue('biodataHoroscopeRasi')));
    setAmsamChart(parseHoroscope(getValue('biodataHoroscopeAmsam')));
    setDetailGrid(parseDetailGrid(getValue('biodataDetailGrid')));

    const storedRegistration = getValue('registrationNumber').trim();
    const normalizedRegistration = normalizeRegistrationNumber(storedRegistration);
    const registrationNumber = normalizedRegistration || generateRegistrationNumber();
    if (!normalizedRegistration || normalizedRegistration !== storedRegistration) {
      setValue('registrationNumber', registrationNumber);
    }

    setForm({
      fullName: getValue('fullName'),
      dateOfBirth: getValue('dateOfBirth'),
      natchathiram: getValue('natchathiram'),
      rasi: getValue('rasi'),
      occupation: getValue('occupation'),
      monthlyIncome: getValue('monthlyIncome'),
      propertyDetails: getValue('propertyDetails'),
      fatherName: getValue('fatherName'),
      motherName: getValue('motherName'),
      irupidam: getValue('irupidam') || getValue('nativePlace'),
      totalFamilyMembers: getValue('totalFamilyMembers'),
      birthOrder: getValue('birthOrder'),
      marriedBrother: getValue('marriedBrother'),
      marriedYoungerBrother: getValue('marriedYoungerBrother'),
      marriedSister: getValue('marriedSister'),
      marriedYoungerSister: getValue('marriedYoungerSister'),
      unmarriedBrother: getValue('unmarriedBrother'),
      unmarriedYoungerBrother: getValue('unmarriedYoungerBrother'),
      unmarriedSister: getValue('unmarriedSister'),
      unmarriedYoungerSister: getValue('unmarriedYoungerSister'),
      complexion: getValue('complexion'),
      height: getValue('height'),
      seervarisai: getValue('seervarisai'),
      dasaBalance: getValue('dasaBalance'),
      dasaYear: getValue('dasaYear'),
      dasaMonth: getValue('dasaMonth'),
      dasaDay: getValue('dasaDay'),
      registrationNumber,
    });
  }, [getValue, isReady, setValue]);

  const updateField = useCallback((key: keyof BiodataState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const persistForm = useCallback(() => {
    setValue('fullName', form.fullName.trim());
    setValue('dateOfBirth', form.dateOfBirth.trim());
    setValue('natchathiram', form.natchathiram.trim());
    setValue('rasi', form.rasi.trim());
    setValue('occupation', form.occupation.trim());
    setValue('monthlyIncome', form.monthlyIncome.trim());
    setValue('propertyDetails', form.propertyDetails.trim());
    setValue('fatherName', form.fatherName.trim());
    setValue('motherName', form.motherName.trim());
    setValue('irupidam', form.irupidam.trim());
    setValue('nativePlace', form.irupidam.trim());
    setValue('totalFamilyMembers', form.totalFamilyMembers.trim());
    setValue('birthOrder', form.birthOrder.trim());
    setValue('marriedBrother', form.marriedBrother.trim());
    setValue('marriedYoungerBrother', form.marriedYoungerBrother.trim());
    setValue('marriedSister', form.marriedSister.trim());
    setValue('marriedYoungerSister', form.marriedYoungerSister.trim());
    setValue('unmarriedBrother', form.unmarriedBrother.trim());
    setValue('unmarriedYoungerBrother', form.unmarriedYoungerBrother.trim());
    setValue('unmarriedSister', form.unmarriedSister.trim());
    setValue('unmarriedYoungerSister', form.unmarriedYoungerSister.trim());
    setValue('complexion', form.complexion.trim());
    setValue('height', form.height.trim());
    setValue('seervarisai', form.seervarisai.trim());
    setValue('dasaBalance', form.dasaBalance.trim());
    setValue('dasaYear', form.dasaYear.trim());
    setValue('dasaMonth', form.dasaMonth.trim());
    setValue('dasaDay', form.dasaDay.trim());
    setValue('registrationNumber', getValue('registrationNumber').trim() || form.registrationNumber.trim());
    setValue('biodataHoroscopeRasi', JSON.stringify(rasiChart));
    setValue('biodataHoroscopeAmsam', JSON.stringify(amsamChart));
    setValue('biodataDetailGrid', JSON.stringify(detailGrid));
  }, [detailGrid, form, rasiChart, amsamChart, setValue]);

  const handleSavePress = useCallback(() => {
    persistForm();
    onSave();
  }, [onSave, persistForm]);

  const marriedFields = useMemo(
    () => [
      {
        key: 'marriedBrother' as const,
        label: translate('biodataRelationElderBrother'),
        value: form.marriedBrother,
      },
      {
        key: 'marriedYoungerBrother' as const,
        label: translate('biodataRelationYoungerBrother'),
        value: form.marriedYoungerBrother,
      },
      {
        key: 'marriedSister' as const,
        label: translate('biodataRelationElderSister'),
        value: form.marriedSister,
      },
      {
        key: 'marriedYoungerSister' as const,
        label: translate('biodataRelationYoungerSister'),
        value: form.marriedYoungerSister,
      },
    ],
    [form, translate],
  );

  const unmarriedFields = useMemo(
    () => [
      {
        key: 'unmarriedBrother' as const,
        label: translate('biodataRelationElderBrother'),
        value: form.unmarriedBrother,
      },
      {
        key: 'unmarriedYoungerBrother' as const,
        label: translate('biodataRelationYoungerBrother'),
        value: form.unmarriedYoungerBrother,
      },
      {
        key: 'unmarriedSister' as const,
        label: translate('biodataRelationElderSister'),
        value: form.unmarriedSister,
      },
      {
        key: 'unmarriedYoungerSister' as const,
        label: translate('biodataRelationYoungerSister'),
        value: form.unmarriedYoungerSister,
      },
    ],
    [form, translate],
  );

  const biodataSheet = (
    <View style={[styles.sheetCard, isMobile && styles.sheetCardMobile]}>
        <View style={[styles.columnsRow, isMobile && styles.columnsRowMobile]}>
          <View style={[styles.leftColumn, isMobile && styles.leftColumnMobile]}>
            <BiodataRow
              label={translate('biodataFieldName')}
              value={form.fullName}
              onChangeText={(text) => updateField('fullName', text)}
              editable={editable}
              mobile={isMobile}
            />
            <BiodataDateRow
              label={translate('biodataFieldDateOfBirth')}
              value={form.dateOfBirth}
              onValueChange={(text) => updateField('dateOfBirth', text)}
              editable={editable}
              mobile={isMobile}
            />
            <BiodataSelectRow
              label={translate('biodataFieldNatchathiram')}
              value={form.natchathiram}
              onValueChange={(text) => updateField('natchathiram', text)}
              optionsKey="nakshatra"
              editable={editable}
              mobile={isMobile}
            />
            <BiodataSelectRow
              label={translate('biodataFieldRasi')}
              value={form.rasi}
              onValueChange={(text) => updateField('rasi', text)}
              optionsKey="rasi"
              editable={editable}
              mobile={isMobile}
            />
            <BiodataSelectRow
              label={translate('biodataFieldOccupation')}
              value={form.occupation}
              onValueChange={(text) => updateField('occupation', text)}
              optionsKey="occupation"
              editable={editable}
              mobile={isMobile}
            />
            <BiodataSelectRow
              label={translate('biodataFieldIncome')}
              value={form.monthlyIncome}
              onValueChange={(text) => updateField('monthlyIncome', text)}
              optionsKey="monthlyIncome"
              editable={editable}
              mobile={isMobile}
            />
            <BiodataRow
              label={translate('biodataFieldProperty')}
              value={form.propertyDetails}
              onChangeText={(text) => updateField('propertyDetails', text)}
              editable={editable}
              multiline
              mobile={isMobile}
            />
            <BiodataRow
              label={translate('biodataFieldFather')}
              value={form.fatherName}
              onChangeText={(text) => updateField('fatherName', text)}
              editable={editable}
              mobile={isMobile}
            />
            <BiodataRow
              label={translate('biodataFieldMother')}
              value={form.motherName}
              onChangeText={(text) => updateField('motherName', text)}
              editable={editable}
              mobile={isMobile}
            />
            <BiodataRow
              label={translate('biodataFieldResidence')}
              value={form.irupidam}
              onChangeText={(text) => updateField('irupidam', text)}
              editable={editable}
              multiline
              mobile={isMobile}
            />
          </View>

          <View style={[styles.rightColumn, isMobile && styles.rightColumnMobile]}>
            <MetricBox
              label={translate('biodataFieldTotalMembers')}
              value={form.totalFamilyMembers}
              onValueChange={(text) => updateField('totalFamilyMembers', text)}
              optionsKey="siblingCount"
              editable={editable}
              mobile={isMobile}
              sidebar
            />
            <MetricBox
              label={translate('biodataFieldBirthOrder')}
              value={form.birthOrder}
              onValueChange={(text) => updateField('birthOrder', text)}
              optionsKey="birthOrder"
              editable={editable}
              mobile={isMobile}
              sidebar
            />
            <MemberBox
              title={translate('biodataSectionMarried')}
              fields={marriedFields}
              editable={editable}
              onChange={updateField}
              mobile={isMobile}
              sidebar
              countSelect
            />
            <MemberBox
              title={translate('biodataSectionUnmarried')}
              fields={unmarriedFields}
              editable={editable}
              onChange={updateField}
              mobile={isMobile}
              sidebar
              countSelect
            />
            <MetricBox
              label={translate('biodataFieldComplexion')}
              value={form.complexion}
              onValueChange={(text) => updateField('complexion', text)}
              optionsKey="skinColor"
              editable={editable}
              mobile={isMobile}
              sidebar
            />
            <MetricBox
              label={translate('biodataFieldHeight')}
              value={form.height}
              onValueChange={(text) => updateField('height', text)}
              optionsKey="height"
              editable={editable}
              mobile={isMobile}
              sidebar
            />
            <MetricBox
              label={translate('biodataFieldSeervarisai')}
              value={form.seervarisai}
              onChangeText={(text) => updateField('seervarisai', text)}
              editable={editable}
              mobile={isMobile}
              sidebar
            />
          </View>
        </View>

        <View style={styles.chartsRow}>
          <HoroscopeChart
            centerLabel={translate('biodataChartRasi')}
            cells={rasiChart}
            editable={editable}
            mobile={isMobile}
            onCellChange={(row, col, value) => {
              setRasiChart((current) =>
                current.map((cells, rowIndex) =>
                  cells.map((cell, colIndex) =>
                    rowIndex === row && colIndex === col ? value : cell,
                  ),
                ),
              );
            }}
          />
          <HoroscopeChart
            centerLabel={translate('biodataChartAmsam')}
            cells={amsamChart}
            editable={editable}
            mobile={isMobile}
            onCellChange={(row, col, value) => {
              setAmsamChart((current) =>
                current.map((cells, rowIndex) =>
                  cells.map((cell, colIndex) =>
                    rowIndex === row && colIndex === col ? value : cell,
                  ),
                ),
              );
            }}
          />
        </View>

        <View style={[styles.dasaCard, isMobile && styles.dasaCardMobile]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.dasaRow, isMobile && styles.dasaRowMobile]}
        >
          <Text
            style={[styles.dasaLabel, isMobile && styles.dasaLabelMobile]}
            numberOfLines={1}
          >
            {translate('biodataDasaBalance')}
          </Text>
          <TextInput
            style={[styles.dasaInput, isMobile && styles.dasaInputMobile]}
            value={form.dasaBalance}
            onChangeText={(text) => updateField('dasaBalance', text)}
            editable={editable}
          />
          <Text
            style={[styles.dasaLabel, isMobile && styles.dasaLabelMobile]}
            numberOfLines={1}
          >
            {translate('biodataYear')}
          </Text>
          <TextInput
            style={[styles.dasaInputSmall, isMobile && styles.dasaInputSmallMobile]}
            value={form.dasaYear}
            onChangeText={(text) => updateField('dasaYear', text)}
            editable={editable}
          />
          <Text
            style={[styles.dasaLabel, isMobile && styles.dasaLabelMobile]}
            numberOfLines={1}
          >
            {translate('biodataMonth')}
          </Text>
          <TextInput
            style={[styles.dasaInputSmall, isMobile && styles.dasaInputSmallMobile]}
            value={form.dasaMonth}
            onChangeText={(text) => updateField('dasaMonth', text)}
            editable={editable}
          />
          <Text
            style={[styles.dasaLabel, isMobile && styles.dasaLabelMobile]}
            numberOfLines={1}
          >
            {translate('biodataDay')}
          </Text>
          <TextInput
            style={[styles.dasaInputSmall, isMobile && styles.dasaInputSmallMobile]}
            value={form.dasaDay}
            onChangeText={(text) => updateField('dasaDay', text)}
            editable={editable}
          />
        </ScrollView>
        </View>

        <View style={styles.detailGridWrap}>
        <View style={styles.detailGrid}>
          {Array.from({ length: DETAIL_GRID_ROWS }, (_, rowIndex) => (
            <View key={rowIndex} style={styles.detailGridRow}>
              {detailGrid
                .slice(rowIndex * DETAIL_GRID_COLUMNS, rowIndex * DETAIL_GRID_COLUMNS + DETAIL_GRID_COLUMNS)
                .map((cell, colIndex) => {
                  const index = rowIndex * DETAIL_GRID_COLUMNS + colIndex;
                  return (
                    <View
                      key={index}
                      style={[styles.detailCellWrap, isMobile && styles.detailCellWrapMobile]}
                    >
                      <TextInput
                        style={[styles.detailCellInput, isMobile && styles.detailCellInputMobile]}
                        value={cell}
                        onChangeText={(text) => {
                          setDetailGrid((current) =>
                            current.map((value, cellIndex) => (cellIndex === index ? text : value)),
                          );
                        }}
                        editable={editable}
                        textAlign="center"
                      />
                    </View>
                  );
                })}
            </View>
          ))}
        </View>
        </View>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, isMobile && styles.scrollContentMobile]}
      >
        {biodataSheet}
      </ScrollView>

      <View style={[styles.actionBar, isMobile && styles.actionBarMobile]}>
        {isMobile ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonPrimary,
                styles.actionButtonPrimaryMobile,
                styles.actionButtonFull,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handleSavePress}
            >
              <MaterialIcons name="check-circle" size={18} color={colors.onPrimary} />
              <Text style={[styles.actionButtonPrimaryText, styles.actionButtonPrimaryTextMobile]}>
                {translate('saveAndContinue')}
              </Text>
            </Pressable>
            <View style={styles.actionSecondaryRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButtonOutline,
                  styles.actionButtonOutlineMobile,
                  styles.actionButtonHalf,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={onDownloadPdf}
              >
                <MaterialIcons name="picture-as-pdf" size={16} color={SHEET_BORDER} />
                <Text style={[styles.actionButtonOutlineText, styles.actionButtonOutlineTextMobile]}>
                  {translate('downloadPdf')}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButtonOutline,
                  styles.actionButtonOutlineMobile,
                  styles.actionButtonHalf,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={onEditProfile}
              >
                <MaterialIcons name="edit" size={16} color={SHEET_BORDER} />
                <Text style={[styles.actionButtonOutlineText, styles.actionButtonOutlineTextMobile]}>
                  {translate('editProfile')}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
        <Pressable
          style={({ pressed }) => [
            styles.actionButtonOutline,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onDownloadPdf}
        >
          <MaterialIcons name="picture-as-pdf" size={18} color={SHEET_BORDER} />
          <Text style={styles.actionButtonOutlineText}>{translate('downloadPdf')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionButtonOutline,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={onEditProfile}
        >
          <MaterialIcons name="edit" size={18} color={SHEET_BORDER} />
          <Text style={styles.actionButtonOutlineText}>{translate('editProfile')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionButtonPrimary,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={handleSavePress}
        >
          <MaterialIcons name="check-circle" size={18} color={colors.onPrimary} />
          <Text style={styles.actionButtonPrimaryText}>{translate('saveAndContinue')}</Text>
        </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F3F7FC',
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: 6,
    paddingBottom: 130,
    alignItems: 'stretch',
  },
  scrollContentMobile: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 120,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.06)',
    ...cardShadow,
  },
  sheetCardMobile: {
    padding: 8,
    borderRadius: 16,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  columnsRowMobile: {
    gap: 5,
  },
  leftColumn: {
    flex: 3,
    minWidth: 0,
    maxWidth: '75%',
    gap: 5,
  },
  leftColumnMobile: {
    flex: 3,
    gap: 4,
    maxWidth: '75%',
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
    maxWidth: '25%',
    gap: 4,
    backgroundColor: SIDEBAR_PANEL_BG,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.08)',
    ...fieldShadow,
  },
  rightColumnMobile: {
    gap: 3,
    maxWidth: '25%',
    padding: 3,
    borderRadius: 14,
  },
  fieldGroup: {
    gap: 2,
  },
  fieldGroupMobile: {
    gap: 2,
  },
  fieldLabel: {
    color: colors.primary,
    fontSize: 10,
    fontFamily: fonts.interSemi,
    letterSpacing: 0.35,
    opacity: 0.88,
  },
  fieldLabelMobile: {
    fontSize: 9,
    lineHeight: 12,
  },
  fieldInput: {
    backgroundColor: FIELD_BG,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    minHeight: 34,
    color: colors.onSurface,
    fontSize: 13,
    fontFamily: fonts.interMedium,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    ...fieldShadow,
  },
  fieldInputMobile: {
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    borderRadius: 10,
  },
  fieldInputMultiline: {
    minHeight: 48,
    textAlignVertical: 'top',
    paddingTop: 6,
  },
  fieldInputMultilineMobile: {
    minHeight: 40,
  },
  fieldInputReadonly: {
    backgroundColor: colors.surfaceContainerHigh,
    opacity: 0.96,
  },
  fieldReadonlyText: {
    color: colors.onSurface,
    fontSize: 13,
    fontFamily: fonts.interMedium,
  },
  selectFieldGroup: {
    position: 'relative',
    zIndex: 1,
  },
  memberSelectWrap: {
    flex: 1,
    minWidth: 0,
  },
  metricBox: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    backgroundColor: FIELD_BG,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
  },
  metricBoxSidebar: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: SIDEBAR_CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.06)',
  },
  metricBoxRegistration: {
    backgroundColor: '#FFF0ED',
  },
  metricBoxMobile: {
    padding: spacing.xs,
  },
  metricBoxSidebarMobile: {
    padding: 4,
    borderRadius: 8,
  },
  metricLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: fonts.interSemi,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  metricLabelSidebar: {
    fontSize: 8,
    marginBottom: 2,
    textAlign: 'center',
    lineHeight: 10,
    color: colors.primary,
    opacity: 0.9,
  },
  metricLabelMobile: {
    fontSize: 8,
    marginBottom: 3,
  },
  metricLabelSidebarMobile: {
    fontSize: 8,
    lineHeight: 11,
    marginBottom: 3,
  },
  metricInput: {
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 10,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    color: colors.onSurface,
    fontSize: 13,
    fontFamily: fonts.inter,
    backgroundColor: colors.surfaceContainerLowest,
  },
  metricInputSidebar: {
    minHeight: 26,
    paddingHorizontal: 3,
    fontSize: 10,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(87, 0, 0, 0.1)',
  },
  metricInputMobile: {
    minHeight: 36,
    fontSize: 13,
  },
  metricInputSidebarMobile: {
    minHeight: 22,
    fontSize: 9,
    paddingHorizontal: 2,
  },
  metricInputRegistration: {
    minWidth: 88,
    fontSize: 10,
    letterSpacing: -0.2,
  },
  metricInputRegistrationMobile: {
    minWidth: 72,
    fontSize: 9,
  },
  regScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  memberBox: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
    backgroundColor: FIELD_BG,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
  },
  memberBoxSidebar: {
    padding: 3,
    gap: 3,
    borderRadius: 10,
    backgroundColor: SIDEBAR_CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.06)',
  },
  memberBoxMobile: {
    padding: spacing.xs,
    gap: 4,
  },
  memberBoxSidebarMobile: {
    padding: 3,
    gap: 2,
  },
  memberTitle: {
    color: SHEET_BORDER,
    fontSize: 10,
    fontFamily: fonts.interSemi,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  memberTitleSidebar: {
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 10,
    marginBottom: 3,
    color: colors.primary,
    fontFamily: fonts.interSemi,
    letterSpacing: 0.3,
  },
  memberTitleMobile: {
    fontSize: 8,
    marginBottom: 2,
  },
  memberTitleSidebarMobile: {
    fontSize: 8,
    lineHeight: 11,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberRowSidebar: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 3,
  },
  memberLabel: {
    width: 62,
    flexShrink: 0,
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: fonts.interMedium,
  },
  memberLabelSidebar: {
    width: '100%',
    fontSize: 8,
    lineHeight: 11,
    textAlign: 'center',
    color: colors.onSurfaceVariant,
  },
  memberLabelMobile: {
    width: 64,
    fontSize: 9,
  },
  memberLabelSidebarMobile: {
    width: '100%',
    fontSize: 8,
    lineHeight: 10,
  },
  memberInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 10,
    minHeight: 32,
    paddingHorizontal: 6,
    color: colors.onSurface,
    fontSize: 12,
    fontFamily: fonts.inter,
    backgroundColor: colors.surfaceContainerLowest,
  },
  memberInputSidebar: {
    width: '100%',
    minHeight: 22,
    paddingHorizontal: 3,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: fonts.interSemi,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
  },
  memberInputMobile: {
    minHeight: 28,
    fontSize: 11,
  },
  memberInputSidebarMobile: {
    minHeight: 22,
    fontSize: 9,
    paddingHorizontal: 2,
  },
  chartsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  dasaCard: {
    marginTop: spacing.sm,
    backgroundColor: FIELD_BG,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    ...fieldShadow,
  },
  dasaCardMobile: {
    marginTop: 6,
    borderRadius: 10,
  },
  detailGridWrap: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  chartWrap: {
    flex: 1,
    minWidth: 150,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: HOROSCOPE_RED,
    padding: 4,
    backgroundColor: '#fff',
  },
  chartGrid: {
    width: '100%',
    aspectRatio: 1,
    flexDirection: 'column',
    backgroundColor: HOROSCOPE_RED,
    gap: 1,
    padding: 1,
  },
  chartGridMobile: {
    aspectRatio: 1,
  },
  chartGridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 1,
  },
  chartGridRowDouble: {
    flex: 2,
    flexDirection: 'row',
    gap: 1,
  },
  chartSideStack: {
    flex: 1,
    flexDirection: 'column',
    gap: 1,
  },
  chartCellWrap: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0,
    minWidth: 0,
  },
  chartCellWrapMobile: {},
  chartCellInput: {
    width: '100%',
    flex: 1,
    fontSize: 10,
    color: '#111',
    padding: 2,
    backgroundColor: 'transparent',
  },
  chartCellInputMobile: {
    fontSize: 8,
    padding: 1,
  },
  chartCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 2,
    paddingVertical: 4,
    gap: 2,
    minWidth: 0,
  },
  chartCenterMobile: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    gap: 2,
  },
  chartCenterLabel: {
    color: HOROSCOPE_RED,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  chartCenterLabelMobile: {
    fontSize: 10,
  },
  dasaRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  dasaRowMobile: {
    gap: 4,
  },
  dasaLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: fonts.interSemi,
    flexShrink: 0,
  },
  dasaLabelMobile: {
    fontSize: 9,
  },
  dasaInput: {
    width: 80,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: borderRadius.md,
    minHeight: 36,
    paddingHorizontal: 6,
    color: colors.onSurface,
    fontSize: 12,
    fontFamily: fonts.inter,
    backgroundColor: colors.surfaceContainerLowest,
    flexShrink: 0,
  },
  dasaInputMobile: {
    width: 64,
    minHeight: 32,
    fontSize: 11,
  },
  dasaInputSmall: {
    width: 40,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: borderRadius.md,
    minHeight: 36,
    paddingHorizontal: 4,
    textAlign: 'center',
    color: colors.onSurface,
    fontSize: 12,
    fontFamily: fonts.inter,
    backgroundColor: colors.surfaceContainerLowest,
    flexShrink: 0,
  },
  dasaInputSmallMobile: {
    width: 34,
    minHeight: 32,
    fontSize: 11,
  },
  detailGrid: {
    borderWidth: 1,
    borderColor: HOROSCOPE_RED,
  },
  detailGridRow: {
    flexDirection: 'row',
  },
  detailCellWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: HOROSCOPE_RED,
    alignItems: 'center',
    paddingVertical: 2,
    minWidth: 0,
  },
  detailCellWrapMobile: {
    paddingVertical: 1,
  },
  detailCellInput: {
    width: '100%',
    minHeight: 20,
    fontSize: 8,
    color: '#111',
    paddingHorizontal: 0,
  },
  detailCellInputMobile: {
    minHeight: 16,
    fontSize: 7,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(87, 0, 0, 0.08)',
    ...actionBarShadow,
  },
  actionBarMobile: {
    flexDirection: 'column',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  actionSecondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  actionButtonFull: {
    width: '100%',
    flex: undefined,
  },
  actionButtonHalf: {
    flex: 1,
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(87, 0, 0, 0.22)',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    minWidth: 0,
    minHeight: 48,
    ...fieldShadow,
  },
  actionButtonOutlineMobile: {
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
  },
  actionButtonOutlineText: {
    color: SHEET_BORDER,
    fontFamily: fonts.interSemi,
    fontSize: 13,
    flexShrink: 1,
  },
  actionButtonOutlineTextMobile: {
    fontSize: 10,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    minWidth: 0,
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(87, 0, 0, 0.32)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.32,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  actionButtonPrimaryMobile: {
    minHeight: 44,
    borderRadius: borderRadius.md,
  },
  actionButtonPrimaryText: {
    color: colors.onPrimary,
    fontFamily: fonts.interSemi,
    fontSize: 14,
    flexShrink: 1,
  },
  actionButtonPrimaryTextMobile: {
    fontSize: 14,
  },
});
