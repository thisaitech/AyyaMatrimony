import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SelectOptionsField, TextField } from '@/components/FormControls';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Language } from '@/constants/i18n';
import {
  createEmptyProperty,
  PropertyEntry,
} from '@/constants/propertyDetails';
import { colors, spacing, typography } from '@/constants/theme';

type PropertyDetailsStepProps = {
  language: Language;
  properties: PropertyEntry[];
  onChange: (properties: PropertyEntry[]) => void;
  labels: {
    propertyHeading: string;
    propertyType: string;
    location: string;
    ownershipStatus: string;
    estimatedValue: string;
    monthlyRentalIncome: string;
    selectPropertyType: string;
    enterLocation: string;
    selectOwnershipStatus: string;
    selectEstimatedValue: string;
    rentalIncomePlaceholder: string;
    addProperty: string;
    removeProperty: string;
  };
};

export function PropertyDetailsStep({
  language,
  properties,
  onChange,
  labels,
}: PropertyDetailsStepProps) {
  const updateProperty = (index: number, patch: Partial<PropertyEntry>) => {
    onChange(
      properties.map((property, propertyIndex) =>
        propertyIndex === index ? { ...property, ...patch } : property,
      ),
    );
  };

  const addProperty = () => {
    onChange([...properties, createEmptyProperty()]);
  };

  const removeProperty = (index: number) => {
    if (properties.length === 1) {
      return;
    }
    onChange(properties.filter((_, propertyIndex) => propertyIndex !== index));
  };

  return (
    <View style={styles.container}>
      {properties.map((property, index) => (
        <View key={property.id} style={styles.propertyCard}>
          <View style={styles.propertyHeader}>
            <Text style={styles.propertyTitle}>
              {labels.propertyHeading.replace('{number}', String(index + 1))}
            </Text>
            {properties.length > 1 ? (
              <Pressable onPress={() => removeProperty(index)} hitSlop={8}>
                <Text style={styles.removeText}>{labels.removeProperty}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.fields}>
            <SelectOptionsField
              label={labels.propertyType}
              value={property.propertyType}
              onValueChange={(value) => updateProperty(index, { propertyType: value })}
              optionsKey="propertyType"
              language={language}
              placeholder={labels.selectPropertyType}
            />
            <TextField
              label={labels.location}
              value={property.location}
              onChangeText={(value) => updateProperty(index, { location: value })}
              placeholder={labels.enterLocation}
            />
            <SelectOptionsField
              label={labels.ownershipStatus}
              value={property.ownershipStatus}
              onValueChange={(value) => updateProperty(index, { ownershipStatus: value })}
              optionsKey="ownershipStatus"
              language={language}
              placeholder={labels.selectOwnershipStatus}
            />
            <SelectOptionsField
              label={labels.estimatedValue}
              value={property.estimatedValue}
              onValueChange={(value) => updateProperty(index, { estimatedValue: value })}
              optionsKey="propertyValue"
              language={language}
              placeholder={labels.selectEstimatedValue}
            />
            <SelectOptionsField
              label={labels.monthlyRentalIncome}
              value={property.monthlyRentalIncome}
              onValueChange={(value) => updateProperty(index, { monthlyRentalIncome: value })}
              optionsKey="monthlyIncome"
              language={language}
              placeholder={labels.rentalIncomePlaceholder}
            />
          </View>
        </View>
      ))}

      <PrimaryButton
        label={labels.addProperty}
        icon="add"
        variant="outline"
        onPress={addProperty}
        style={styles.addButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  propertyCard: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 191, 185, 0.3)',
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  propertyTitle: {
    ...typography.titleLg,
    color: colors.primary,
  },
  removeText: {
    ...typography.labelLg,
    color: colors.surfaceTint,
    textDecorationLine: 'underline',
  },
  fields: {
    gap: spacing.lg,
  },
  addButton: {
    borderRadius: 12,
  },
});

export function getPropertyStepLabels(language: Language) {
  if (language === 'ta') {
    return {
      propertyHeading: 'சொத்து {number}',
      propertyType: 'சொத்து வகை',
      location: 'இடம்',
      ownershipStatus: 'உரிமை நிலை',
      estimatedValue: 'மதிப்பிடப்பட்ட சொத்து மதிப்பு',
      monthlyRentalIncome: 'மாத வாடகை வருமானம் (விருப்பம்)',
      selectPropertyType: 'சொத்து வகையைத் தேர்ந்தெடுக்கவும்',
      enterLocation: 'எ.கா. மதுரை, தமிழ்நாடு',
      selectOwnershipStatus: 'உரிமை நிலையைத் தேர்ந்தெடுக்கவும்',
      selectEstimatedValue: 'மதிப்பைத் தேர்ந்தெடுக்கவும்',
      rentalIncomePlaceholder: 'விருப்பம்',
      addProperty: 'மற்றொரு சொத்தைச் சேர்',
      removeProperty: 'நீக்கு',
    };
  }

  return {
    propertyHeading: 'Property {number}',
    propertyType: 'Property Type',
    location: 'Location',
    ownershipStatus: 'Ownership Status',
    estimatedValue: 'Estimated Property Value',
    monthlyRentalIncome: 'Monthly Rental Income (Optional)',
    selectPropertyType: 'Select property type',
    enterLocation: 'e.g. Madurai, Tamil Nadu',
    selectOwnershipStatus: 'Select ownership status',
    selectEstimatedValue: 'Select estimated value',
    rentalIncomePlaceholder: 'Optional',
    addProperty: 'Add Another Property',
    removeProperty: 'Remove',
  };
}
