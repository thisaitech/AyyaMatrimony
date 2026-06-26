import { ScrollView } from 'react-native';
import { FormField, FormScreen, FormSelectField } from '@/components/FormScreen';
import { useLanguage } from '@/context/LanguageContext';
import { useProfileForm } from '@/context/ProfileFormContext';

function formatAgeRange(from: string, to: string): string {
  if (from && to && !from.includes('-')) {
    return `${from} - ${to}`;
  }

  return from || to || '';
}

export default function PartnerPreferencesScreen() {
  const { translate } = useLanguage();
  const { values, setValue } = useProfileForm();

  const ageRange = formatAgeRange(values.partnerAgeFrom ?? '', values.partnerAgeTo ?? '');

  const handleAgeRangeChange = (text: string) => {
    setValue('partnerAgeFrom', text);
    if (values.partnerAgeTo) {
      setValue('partnerAgeTo', '');
    }
  };

  return (
    <FormScreen
      titleKey="partnerPreferencesTitle"
      successKey="preferencesSaved"
      onSave={() => undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
        <FormField
          label={translate('ageRange')}
          value={ageRange}
          onChangeText={handleAgeRangeChange}
          placeholder={translate('ageRange')}
        />
        <FormField
          label={translate('preferredLocation')}
          value={values.partnerPreferredLocation ?? ''}
          onChangeText={(text) => setValue('partnerPreferredLocation', text)}
          placeholder={translate('preferredLocation')}
        />
        <FormField
          label={translate('educationPreference')}
          value={values.partnerEducation ?? ''}
          onChangeText={(text) => setValue('partnerEducation', text)}
          placeholder={translate('educationPreference')}
        />
        <FormSelectField
          label={translate('religion')}
          value={values.partnerReligion || 'hindu'}
          onValueChange={(value) => setValue('partnerReligion', value)}
          optionsKey="religion"
        />
        <FormField
          label={translate('caste')}
          value={values.partnerCaste ?? ''}
          onChangeText={(text) => setValue('partnerCaste', text)}
          placeholder={translate('caste')}
        />
      </ScrollView>
    </FormScreen>
  );
}
