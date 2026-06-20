import { useCallback, useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { SelectField } from '@/components/FormControls';
import {
  formatPropertyDetailsSummary,
  getPropertyCountLabelKey,
  getPropertyDisplayValue,
  needsCommercialType,
  needsHouseCount,
  needsLandFields,
  parsePropertyDetails,
  PROPERTY_OPTIONS,
  PropertyOptionId,
  PropertySelectionItem,
  PropertySelectionState,
  serializePropertyDetails,
  validatePropertySelections,
} from '@/constants/biodataProperty';
import { getFormOptions } from '@/constants/formOptions';
import { useLanguage } from '@/context/LanguageContext';
import { borderRadius, colors, fonts, spacing } from '@/constants/theme';

const FIELD_BG = colors.surfaceContainerLowest;
const FIELD_BORDER = 'rgba(87, 0, 0, 0.1)';
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

function BottomSheetModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.bottomSheetRoot}>
        <Pressable style={styles.bottomSheetBackdrop} onPress={onClose} />
        <View style={styles.bottomSheetCard}>
          <View style={styles.bottomSheetHandle} />
          {title ? <Text style={styles.bottomSheetTitle}>{title}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

function IconFieldShell({
  children,
  dense,
}: {
  icon?: keyof typeof MaterialIcons.glyphMap;
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <View style={[styles.iconFieldShell, dense && styles.iconFieldShellDense]}>
      <View style={styles.iconFieldBody}>{children}</View>
    </View>
  );
}

function cloneState(state: PropertySelectionState): PropertySelectionState {
  return {
    selections: state.selections.map((item) => ({ ...item })),
  };
}

function toggleSelection(state: PropertySelectionState, id: PropertyOptionId): PropertySelectionState {
  const existing = state.selections.find((item) => item.id === id);

  if (id === 'no-property') {
    return existing ? { selections: [] } : { selections: [{ id: 'no-property' }] };
  }

  const withoutNoProperty = state.selections.filter((item) => item.id !== 'no-property');
  if (existing) {
    return { selections: withoutNoProperty.filter((item) => item.id !== id) };
  }

  const nextItem: PropertySelectionItem = { id };
  if (needsHouseCount(id)) {
    nextItem.houseCount = '';
  }
  if (needsLandFields(id)) {
    nextItem.landSize = '';
    nextItem.landUnit = 'cent';
  }
  if (needsCommercialType(id)) {
    nextItem.commercialType = '';
  }

  return { selections: [...withoutNoProperty, nextItem] };
}

function updateSelection(
  state: PropertySelectionState,
  id: PropertyOptionId,
  patch: Partial<PropertySelectionItem>,
): PropertySelectionState {
  return {
    selections: state.selections.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  };
}

type BiodataPropertyFieldProps = {
  label: string;
  propertyDetails: string;
  legacyHouseType?: string;
  legacyHouseCount?: string;
  onSave: (serialized: string) => void;
  editable: boolean;
  dense?: boolean;
};

export function BiodataPropertyField({
  label,
  propertyDetails,
  legacyHouseType = '',
  legacyHouseCount = '',
  onSave,
  editable,
  dense,
}: BiodataPropertyFieldProps) {
  const { language, translate } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<PropertySelectionState>({ selections: [] });
  const [error, setError] = useState('');

  const openSheet = useCallback(() => {
    setDraft(
      cloneState(parsePropertyDetails(propertyDetails, legacyHouseType, legacyHouseCount)),
    );
    setError('');
    setVisible(true);
  }, [legacyHouseCount, legacyHouseType, propertyDetails]);

  const handleCancel = useCallback(() => {
    setVisible(false);
    setError('');
  }, []);

  const handleSave = useCallback(() => {
    const validationError = validatePropertySelections(draft, translate);
    if (validationError) {
      setError(validationError);
      return;
    }

    onSave(serializePropertyDetails(draft));
    setVisible(false);
    setError('');
  }, [draft, onSave, translate]);

  const displayValue = getPropertyDisplayValue(
    propertyDetails,
    language,
    translate,
    legacyHouseType,
    legacyHouseCount,
  );

  const houseCountOptions = getFormOptions('propertyOwnHouseCount', language);
  const landUnitOptions = getFormOptions('propertyLandUnit', language);

  if (!editable) {
    return (
      <View style={[styles.fieldGroup, dense && styles.fieldGroupDense]}>
        <Text style={[styles.fieldLabel, dense && styles.fieldLabelDense]}>{label}</Text>
        <View style={[styles.fieldInput, styles.fieldInputReadonly, dense && styles.fieldInputDense]}>
          <Text style={styles.fieldReadonlyText}>{displayValue || '—'}</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.fieldGroup, dense && styles.fieldGroupDense]}>
        <Text style={[styles.fieldLabel, dense && styles.fieldLabelDense]}>{label}</Text>
        <Pressable onPress={openSheet}>
          <IconFieldShell dense={dense}>
            <View style={[styles.propertyFieldTrigger, dense && styles.fieldInputDense]}>
              <Text
                style={displayValue ? styles.propertyFieldValue : styles.propertyFieldPlaceholder}
                numberOfLines={2}
              >
                {displayValue || translate('propertySelectDetails')}
              </Text>
              <MaterialIcons name="expand-more" size={dense ? 16 : 18} color={colors.primary} />
            </View>
          </IconFieldShell>
        </Pressable>
      </View>

      <BottomSheetModal
        visible={visible}
        onClose={handleCancel}
        title={translate('propertyInformation')}
      >
        <ScrollView
          style={styles.bottomSheetScroll}
          contentContainerStyle={styles.bottomSheetScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {PROPERTY_OPTIONS.map((option) => {
            const selected = draft.selections.find((item) => item.id === option.id);
            const isChecked = Boolean(selected);

            return (
              <View key={option.id} style={styles.optionBlock}>
                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => {
                    setDraft((current) => toggleSelection(current, option.id));
                    setError('');
                  }}
                >
                  <MaterialIcons
                    name={isChecked ? 'check-box' : 'check-box-outline-blank'}
                    size={22}
                    color={isChecked ? colors.primary : colors.onSurfaceVariant}
                  />
                  <Text style={styles.checkboxLabel}>{translate(option.labelKey)}</Text>
                </Pressable>

                {selected && needsHouseCount(option.id) ? (
                  <Animated.View
                    entering={FadeInDown.duration(200)}
                    exiting={FadeOutUp.duration(160)}
                    style={styles.conditionalBlock}
                  >
                    <Text style={styles.conditionalLabel}>
                      {translate(getPropertyCountLabelKey(option.id))}
                    </Text>
                    <View style={styles.chipRow}>
                      {houseCountOptions.map((countOption) => {
                        const active = selected.houseCount === countOption.value;
                        return (
                          <Pressable
                            key={countOption.value}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => {
                              setDraft((current) =>
                                updateSelection(current, option.id, { houseCount: countOption.value }),
                              );
                              setError('');
                            }}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {countOption.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Animated.View>
                ) : null}

                {selected && needsLandFields(option.id) ? (
                  <Animated.View
                    entering={FadeInDown.duration(200)}
                    exiting={FadeOutUp.duration(160)}
                    style={styles.conditionalBlock}
                  >
                    <Text style={styles.conditionalLabel}>{translate('propertyLandSize')}</Text>
                    <TextInput
                      value={selected.landSize ?? ''}
                      onChangeText={(text) => {
                        const normalized = text.replace(/[^\d.]/g, '');
                        setDraft((current) =>
                          updateSelection(current, option.id, { landSize: normalized }),
                        );
                        setError('');
                      }}
                      placeholder={translate('propertyLandSizePlaceholder')}
                      placeholderTextColor={PLACEHOLDER}
                      keyboardType="decimal-pad"
                      style={styles.landInput}
                    />
                    <Text style={styles.conditionalLabel}>{translate('propertyLandUnit')}</Text>
                    <View style={styles.chipRow}>
                      {landUnitOptions.map((unitOption) => {
                        const active = selected.landUnit === unitOption.value;
                        return (
                          <Pressable
                            key={unitOption.value}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => {
                              setDraft((current) =>
                                updateSelection(current, option.id, {
                                  landUnit: unitOption.value as 'cent' | 'acre',
                                }),
                              );
                              setError('');
                            }}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {unitOption.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Animated.View>
                ) : null}

                {selected && needsCommercialType(option.id) ? (
                  <Animated.View
                    entering={FadeInDown.duration(200)}
                    exiting={FadeOutUp.duration(160)}
                    style={styles.conditionalBlock}
                  >
                    <SelectField
                      label={translate('propertyCommercialType')}
                      value={selected.commercialType ?? ''}
                      onValueChange={(value) => {
                        setDraft((current) =>
                          updateSelection(current, option.id, { commercialType: value }),
                        );
                        setError('');
                      }}
                      options={getFormOptions('propertyType', language)}
                      placeholder={translate('selectPropertyCommercialType')}
                      compact
                      embedded
                    />
                  </Animated.View>
                ) : null}
              </View>
            );
          })}

          {draft.selections.length > 0 ? (
            <View style={styles.previewBlock}>
              <Text style={styles.previewLabel}>{translate('propertySummaryPreview')}</Text>
              <Text style={styles.previewValue}>
                {formatPropertyDetailsSummary(draft, language, translate)}
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.propertySheetError}>{error}</Text> : null}

          <View style={styles.bottomSheetActions}>
            <Pressable style={styles.bottomSheetCancelBtn} onPress={handleCancel}>
              <Text style={styles.bottomSheetCancelText}>{translate('cancel')}</Text>
            </Pressable>
            <Pressable style={styles.bottomSheetSaveBtn} onPress={handleSave}>
              <Text style={styles.bottomSheetSaveText}>{translate('save')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 6,
  },
  fieldGroupDense: {
    gap: 5,
  },
  fieldLabel: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: fonts.interBold,
    letterSpacing: 0.35,
    opacity: 1,
  },
  fieldLabelDense: {
    fontSize: 11,
    lineHeight: 15,
    opacity: 1,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 10,
    backgroundColor: FIELD_BG,
    minHeight: 38,
    paddingHorizontal: 10,
    justifyContent: 'center',
    ...fieldShadow,
  },
  fieldInputDense: {
    minHeight: 38,
  },
  fieldInputReadonly: {
    backgroundColor: 'rgba(255, 248, 246, 0.7)',
  },
  fieldReadonlyText: {
    color: colors.onSurface,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.interMedium,
  },
  iconFieldShell: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 10,
    backgroundColor: FIELD_BG,
    overflow: 'hidden',
    minHeight: 38,
    ...fieldShadow,
  },
  iconFieldShellDense: {
    minHeight: 38,
    borderRadius: 10,
  },
  iconFieldBadge: {
    width: 34,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: FIELD_BORDER,
    backgroundColor: 'rgba(255, 240, 237, 0.5)',
  },
  iconFieldBadgeDense: {
    width: 32,
    minWidth: 32,
  },
  iconFieldBody: {
    flex: 1,
    minWidth: 0,
  },
  propertyFieldTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  propertyFieldValue: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.interMedium,
  },
  propertyFieldPlaceholder: {
    flex: 1,
    color: PLACEHOLDER,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.interMedium,
  },
  bottomSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 0, 0, 0.42)',
  },
  bottomSheetCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '82%',
    ...fieldShadow,
  },
  bottomSheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(87, 0, 0, 0.18)',
    marginBottom: spacing.sm,
  },
  bottomSheetTitle: {
    color: colors.primary,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.playfairSemi,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  bottomSheetScroll: {
    maxHeight: 480,
  },
  bottomSheetScrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  optionBlock: {
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 36,
  },
  checkboxLabel: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.interMedium,
  },
  conditionalBlock: {
    marginLeft: 30,
    gap: 6,
    paddingTop: 2,
  },
  conditionalLabel: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.interSemi,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: colors.surfaceContainerLowest,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 240, 237, 0.75)',
  },
  chipText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontFamily: fonts.interMedium,
  },
  chipTextActive: {
    color: colors.primary,
    fontFamily: fonts.interSemi,
  },
  landInput: {
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLowest,
    minHeight: 40,
    paddingHorizontal: 10,
    color: colors.onSurface,
    fontSize: 14,
    fontFamily: fonts.inter,
  },
  previewBlock: {
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 248, 246, 0.85)',
    padding: spacing.sm,
    gap: 4,
  },
  previewLabel: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.interSemi,
  },
  previewValue: {
    color: colors.onSurface,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.interMedium,
  },
  bottomSheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  bottomSheetCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: colors.surfaceContainerLowest,
  },
  bottomSheetCancelText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: fonts.interSemi,
  },
  bottomSheetSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  bottomSheetSaveText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontFamily: fonts.interSemi,
  },
  propertySheetError: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.inter,
    textAlign: 'center',
  },
});
