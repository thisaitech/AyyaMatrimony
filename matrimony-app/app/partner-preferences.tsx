import { useState } from 'react';
import { ScrollView } from 'react-native';
import { FormFixedCasteField, FormScreen, FormSelectField } from '@/components/FormScreen';
import { useLanguage } from '@/context/LanguageContext';

export default function PartnerPreferencesScreen() {
  const { translate } = useLanguage();
  const [ageRange, setAgeRange] = useState('25-32');
  const [preferredLocation, setPreferredLocation] = useState('tamil-nadu');
  const [educationPreference, setEducationPreference] = useState('any');
  const [religion, setReligion] = useState('hindu');
  const [subCaste, setSubCaste] = useState('any');

  return (
    <FormScreen
      titleKey="partnerPreferencesTitle"
      successKey="preferencesSaved"
      onSave={() => undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
        <FormSelectField
          label={translate('ageRange')}
          value={ageRange}
          onValueChange={setAgeRange}
          optionsKey="ageRange"
        />
        <FormSelectField
          label={translate('preferredLocation')}
          value={preferredLocation}
          onValueChange={setPreferredLocation}
          optionsKey="preferredLocation"
        />
        <FormSelectField
          label={translate('educationPreference')}
          value={educationPreference}
          onValueChange={setEducationPreference}
          optionsKey="educationPreference"
        />
        <FormSelectField
          label={translate('religion')}
          value={religion}
          onValueChange={setReligion}
          optionsKey="religion"
        />
        <FormFixedCasteField label={translate('caste')} />
        <FormSelectField
          label={translate('subCaste')}
          value={subCaste}
          onValueChange={setSubCaste}
          optionsKey="subCastePreference"
          placeholder={translate('selectSubCaste')}
        />
      </ScrollView>
    </FormScreen>
  );
}
