import { Language } from '@/constants/i18n';

export type FormOption = {
  value: string;
  label: Record<Language, string>;
};

export type FormOptionsKey =
  | 'gender'
  | 'education'
  | 'degreeDetail'
  | 'religion'
  | 'community'
  | 'subCaste'
  | 'subCastePreference'
  | 'workType'
  | 'occupation'
  | 'occupationType'
  | 'propertyHouseType'
  | 'propertyHouseCount'
  | 'propertyOwnHouseCount'
  | 'propertyLandUnit'
  | 'monthlyIncome'
  | 'annualIncome'
  | 'propertyType'
  | 'ownershipStatus'
  | 'propertyValue'
  | 'height'
  | 'skinColor'
  | 'weight'
  | 'physicalChallenge'
  | 'rasi'
  | 'nakshatra'
  | 'dosham'
  | 'familyType'
  | 'familyValues'
  | 'birthOrder'
  | 'ageRange'
  | 'partnerAge'
  | 'preferredLocation'
  | 'indianState'
  | 'district'
  | 'country'
  | 'siblingCount'
  | 'birthOrderRelation'
  | 'maritalStatusBiodata'
  | 'livingStatus'
  | 'eatingHabit'
  | 'complexionBiodata'
  | 'seervarisai'
  | 'dasaPlanet'
  | 'dasaYear'
  | 'dasaMonth'
  | 'dasaDay'
  | 'countryCode'
  | 'educationPreference'
  | 'anyOption';

function opt(value: string, en: string, ta: string): FormOption {
  return { value, label: { en, ta } };
}

export const FIXED_CASTE_VALUE = 'nadar';

export const formOptionLists: Record<FormOptionsKey, FormOption[]> = {
  gender: [
    opt('male', 'Male', 'ஆண்'),
    opt('female', 'Female', 'பெண்'),
  ],
  education: [
    opt('high-school', 'High School', 'உயர்நிலை பள்ளி'),
    opt('diploma', 'Diploma', 'டிப்ளோமா'),
    opt('bachelors', "Bachelor's Degree", 'இளங்கலை பட்டம்'),
    opt('masters', "Master's Degree", 'முதுகலை பட்டம்'),
    opt('doctorate', 'Doctorate / PhD', 'முனைவர் பட்டம்'),
    opt('other', 'Other Professional Qualification', 'பிற தொழில்முறை தகுதி'),
  ],
  degreeDetail: [
    opt('10th', '10th', '10th'),
    opt('12th', '12th', '12th'),
    opt('diploma', 'Diploma', 'டிப்ளோமா'),
    opt('iti', 'ITI', 'ITI'),
    opt('ba', 'BA', 'BA'),
    opt('bsc', 'BSc', 'BSc'),
    opt('bcom', 'BCom', 'BCom'),
    opt('bba', 'BBA', 'BBA'),
    opt('bca', 'BCA', 'BCA'),
    opt('be', 'BE', 'BE'),
    opt('btech', 'BTech', 'BTech'),
    opt('llb', 'LLB', 'LLB'),
    opt('ba-llb', 'BA LLB', 'BA LLB'),
    opt('bcom-llb', 'BCom LLB', 'BCom LLB'),
    opt('bba-llb', 'BBA LLB', 'BBA LLB'),
    opt('mbbs', 'MBBS', 'MBBS'),
    opt('bds', 'BDS', 'BDS'),
    opt('bams', 'BAMS', 'BAMS'),
    opt('bhms', 'BHMS', 'BHMS'),
    opt('bums', 'BUMS', 'BUMS'),
    opt('bpharm', 'B.Pharm', 'B.Pharm'),
    opt('bsc-nursing', 'BSc Nursing', 'BSc செவிலியர்'),
    opt('bpt', 'BPT', 'BPT'),
    opt('barch', 'B.Arch', 'B.Arch'),
    opt('bhm', 'BHM', 'BHM'),
    opt('bsc-agriculture', 'BSc Agriculture', 'BSc வேளாண்மை'),
    opt('ma', 'MA', 'MA'),
    opt('msc', 'MSc', 'MSc'),
    opt('mcom', 'MCom', 'MCom'),
    opt('mba', 'MBA', 'MBA'),
    opt('mca', 'MCA', 'MCA'),
    opt('me', 'ME', 'ME'),
    opt('mtech', 'MTech', 'MTech'),
    opt('llm', 'LLM', 'LLM'),
    opt('md', 'MD', 'MD'),
    opt('ms', 'MS', 'MS'),
    opt('mds', 'MDS', 'MDS'),
    opt('mpharm', 'M.Pharm', 'M.Pharm'),
    opt('ca', 'CA', 'CA'),
    opt('cma', 'CMA', 'CMA'),
    opt('cs', 'CS', 'CS'),
    opt('phd', 'PhD', 'PhD'),
    opt('other', 'Others', 'பிற'),
  ],
  religion: [
    opt('hindu', 'Hindu', 'இந்து'),
    opt('rc-christian', 'RC Christian', 'RC கிறிஸ்தவர்'),
    opt('csi-christian', 'CSI Christian', 'CSI கிறிஸ்தவர்'),
  ],
  community: [
    opt('adi-dravidar', 'Adi Dravidar', 'ஆதி திராவிடர்'),
    opt('brahmin', 'Brahmin', 'பிராமணர்'),
    opt('chettiar', 'Chettiar', 'செட்டியார்'),
    opt('gounder', 'Gounder', 'கவுண்டர்'),
    opt('iyer', 'Iyer', 'ஐயங்கார்'),
    opt('nadar', 'Nadar', 'நாடார்'),
    opt('pillai', 'Pillai', 'பிள்ளை'),
    opt('thevar', 'Thevar', 'தேவர்'),
    opt('vanniyar', 'Vanniyar', 'வன்னியர்'),
    opt('intercaste', 'Caste No Bar / Intercaste', 'சாதி இல்லை / இடைசாதி'),
    opt('any', 'Any', 'எதுவும்'),
  ],
  subCaste: [
    opt('sanar', 'Sanar', 'சனர்'),
    opt('shanar', 'Shanar', 'ஷனார்'),
    opt('karukku-nadar', 'Karukku Nadar', 'கருக்கு நாடார்'),
    opt('mel-nattu', 'Mel-nattu Nadar', 'மேல்நாட்டு நாடார்'),
    opt('mara-nadar', 'Mara Nadar', 'மர நாடார்'),
    opt('hindu-nadar', 'Hindu Nadar', 'இந்து நாடார்'),
    opt('christian-nadar', 'Christian Nadar', 'கிறிஸ்தவ நாடார்'),
    opt('servai', 'Servai', 'சervai'),
    opt('other', 'Other', 'பிற'),
  ],
  subCastePreference: [
    opt('any', 'Any', 'எதுவும்'),
    opt('sanar', 'Sanar', 'சனர்'),
    opt('shanar', 'Shanar', 'ஷனார்'),
    opt('karukku-nadar', 'Karukku Nadar', 'கருக்கு நாடார்'),
    opt('mel-nattu', 'Mel-nattu Nadar', 'மேல்நாட்டு நாடார்'),
    opt('mara-nadar', 'Mara Nadar', 'மர நாடார்'),
    opt('hindu-nadar', 'Hindu Nadar', 'இந்து நாடார்'),
    opt('christian-nadar', 'Christian Nadar', 'கிறிஸ்தவ நாடார்'),
    opt('servai', 'Servai', 'சervai'),
    opt('other', 'Other', 'பிற'),
  ],
  workType: [
    opt('government-job', 'Government Job', 'அரசு வேலை'),
    opt('private-job', 'Private Job', 'தனியார் வேலை'),
    opt('self-employed', 'Self Employed', 'சுயதொழில்'),
    opt('business', 'Business', 'வணிகம்'),
  ],
  educationPreference: [
    opt('any', 'Any', 'எதுவும்'),
    opt('high-school', 'High School', 'உயர்நிலை பள்ளி'),
    opt('diploma', 'Diploma', 'டிப்ளோமா'),
    opt('bachelors', "Bachelor's Degree", 'இளங்கலை பட்டம்'),
    opt('masters', "Master's Degree", 'முதுகலை பட்டம்'),
    opt('doctorate', 'Doctorate / PhD', 'முனைவர் பட்டம்'),
    opt('other', 'Other Professional Qualification', 'பிற தொழில்முறை தகுதி'),
  ],
  occupation: [
    opt('software', 'Software Professional', 'மென்பொருள் தொழில்முறை'),
    opt('engineer', 'Engineer (Non-IT)', 'பொறியாளர் (ஐடி அல்லாத)'),
    opt('doctor', 'Healthcare / Doctor', 'சுகாதாரம் / மருத்துவர்'),
    opt('teacher', 'Education / Teacher', 'கல்வி / ஆசிரியர்'),
    opt('business', 'Business / Entrepreneur', 'வணிகம் / தொழில்முனைவோர்'),
    opt('civil-services', 'Civil Services', 'குடிமைப் பணி'),
    opt('forest-officer', 'Forest Officer', 'வன அலுவலர்'),
    opt('creative', 'Creative / Arts / Media', 'கலை / ஊடகம்'),
    opt('banking', 'Banking / Finance', 'வங்கி / நிதி'),
    opt('farmer', 'Farmer / Agriculture', 'விவசாயி / விவசாயம்'),
    opt('homemaker', 'Homemaker', 'இல்லத்தரசி'),
    opt('other', 'Others', 'பிற'),
  ],
  occupationType: [
    opt('government-job', 'Government Job', 'அரசு வேலை'),
    opt('private-job', 'Private Job', 'தனியார் வேலை'),
    opt('business', 'Business', 'வணிகம்'),
    opt('self-employed', 'Self Employed', 'சுயதொழில்'),
    opt('agriculture', 'Agriculture', 'விவசாயம்'),
    opt('abroad-job', 'Abroad Job', 'வெளிநாட்டு வேலை'),
  ],
  propertyHouseType: [
    opt('own', 'Own House', 'சொந்த வீடு'),
    opt('rental', 'Rental House', 'வாடகை வீடு'),
  ],
  propertyHouseCount: [
    opt('1', '1', '1'),
    opt('2', '2', '2'),
    opt('3', '3', '3'),
    opt('4-plus', '4+', '4+'),
    opt('5-plus', '5+', '5+'),
  ],
  propertyOwnHouseCount: [
    opt('1', '1', '1'),
    opt('2', '2', '2'),
    opt('3-plus', '3+', '3+'),
  ],
  propertyLandUnit: [
    opt('cent', 'Cent', 'செண்ட்'),
    opt('acre', 'Acre', 'ஏக்கர்'),
  ],
  monthlyIncome: [
    opt('below-25k', 'Below ₹25,000', '₹25,000 க்கு கீழ்'),
    opt('25k-40k', '₹25,000 - ₹40,000', '₹25,000 - ₹40,000'),
    opt('40k-60k', '₹40,000 - ₹60,000', '₹40,000 - ₹60,000'),
    opt('60k-1l', '₹60,000 - ₹1,00,000', '₹60,000 - ₹1,00,000'),
    opt('1l-2l', '₹1,00,000 - ₹2,00,000', '₹1,00,000 - ₹2,00,000'),
    opt('above-2l', 'Above ₹2,00,000', '₹2,00,000 க்கு மேல்'),
    opt('not-specified', 'Prefer not to say', 'சொல்ல விரும்பவில்லை'),
  ],
  annualIncome: [
    opt('below-3l', 'Below ₹3,00,000', '₹3,00,000 க்கு கீழ்'),
    opt('3l-5l', '₹3,00,000 - ₹5,00,000', '₹3,00,000 - ₹5,00,000'),
    opt('5l-8l', '₹5,00,000 - ₹8,00,000', '₹5,00,000 - ₹8,00,000'),
    opt('8l-12l', '₹8,00,000 - ₹12,00,000', '₹8,00,000 - ₹12,00,000'),
    opt('12l-24l', '₹12,00,000 - ₹24,00,000', '₹12,00,000 - ₹24,00,000'),
    opt('above-24l', 'Above ₹24,00,000', '₹24,00,000 க்கு மேல்'),
    opt('not-specified', 'Prefer not to say', 'சொல்ல விரும்பவில்லை'),
  ],
  propertyType: [
    opt('house', 'House', 'வீடு'),
    opt('land', 'Land', 'நிலம்'),
    opt('apartment', 'Apartment', 'அபார்ட்மெண்ட்'),
    opt('commercial', 'Commercial', 'வணிக'),
    opt('other', 'Other', 'பிற'),
  ],
  ownershipStatus: [
    opt('owned', 'Owned', 'சொந்தம்'),
    opt('co-owned', 'Co-owned', 'இணை உரிமை'),
    opt('inherited', 'Inherited', 'பரம்பரை'),
    opt('family-owned', 'Family Owned', 'குடும்ப உரிமை'),
    opt('leased', 'Leased / Rented', 'வாடகை / Lease'),
  ],
  propertyValue: [
    opt('below-1l', 'Below ₹1,00,000', '₹1,00,000 க்கு கீழ்'),
    opt('1l-2l', '₹1,00,000 - ₹2,00,000', '₹1,00,000 - ₹2,00,000'),
    opt('2l-3l', '₹2,00,000 - ₹3,00,000', '₹2,00,000 - ₹3,00,000'),
    opt('3l-4l', '₹3,00,000 - ₹4,00,000', '₹3,00,000 - ₹4,00,000'),
    opt('4l-5l', '₹4,00,000 - ₹5,00,000', '₹4,00,000 - ₹5,00,000'),
    opt('5l-6l', '₹5,00,000 - ₹6,00,000', '₹5,00,000 - ₹6,00,000'),
    opt('6l-7l', '₹6,00,000 - ₹7,00,000', '₹6,00,000 - ₹7,00,000'),
    opt('7l-8l', '₹7,00,000 - ₹8,00,000', '₹7,00,000 - ₹8,00,000'),
    opt('8l-9l', '₹8,00,000 - ₹9,00,000', '₹8,00,000 - ₹9,00,000'),
    opt('9l-10l', '₹9,00,000 - ₹10,00,000', '₹9,00,000 - ₹10,00,000'),
    opt('above-10l', 'Above ₹10,00,000', '₹10,00,000 க்கு மேல்'),
    opt('not-specified', 'Prefer not to say', 'சொல்ல விரும்பவில்லை'),
  ],
  skinColor: [
    opt('very-fair', 'Very Fair', 'மிக வெள்ளை'),
    opt('fair', 'Fair', 'வெள்ளை'),
    opt('wheatish', 'Wheatish', 'கோதுமை நிறம்'),
    opt('wheatish-brown', 'Wheatish Brown', 'கோதுமை பழுப்பு'),
    opt('dark', 'Dark', 'கருமை'),
  ],
  weight: [
    opt('below-45', 'Below 45 kg', '45 kg க்கு கீழ்'),
    opt('45-50', '45 - 50 kg', '45 - 50 kg'),
    opt('50-55', '50 - 55 kg', '50 - 55 kg'),
    opt('55-60', '55 - 60 kg', '55 - 60 kg'),
    opt('60-65', '60 - 65 kg', '60 - 65 kg'),
    opt('65-70', '65 - 70 kg', '65 - 70 kg'),
    opt('70-75', '70 - 75 kg', '70 - 75 kg'),
    opt('75-80', '75 - 80 kg', '75 - 80 kg'),
    opt('above-80', 'Above 80 kg', '80 kg க்கு மேல்'),
  ],
  physicalChallenge: [
    opt('normal', 'Normal', 'இயல்பு'),
    opt('physically-challenged', 'Physically Challenged', 'உடல் ஊனம் உள்ளவர்'),
  ],
  height: [
    opt('152', '5\' 0" (152 cm)', '5\' 0" (152 செ.மீ)'),
    opt('155', '5\' 1" (155 cm)', '5\' 1" (155 செ.மீ)'),
    opt('157', '5\' 2" (157 cm)', '5\' 2" (157 செ.மீ)'),
    opt('160', '5\' 3" (160 cm)', '5\' 3" (160 செ.மீ)'),
    opt('163', '5\' 4" (163 cm)', '5\' 4" (163 செ.மீ)'),
    opt('165', '5\' 5" (165 cm)', '5\' 5" (165 செ.மீ)'),
    opt('168', '5\' 6" (168 cm)', '5\' 6" (168 செ.மீ)'),
    opt('170', '5\' 7" (170 cm)', '5\' 7" (170 செ.மீ)'),
    opt('173', '5\' 8" (173 cm)', '5\' 8" (173 செ.மீ)'),
    opt('175', '5\' 9" (175 cm)', '5\' 9" (175 செ.மீ)'),
    opt('178', '5\' 10" (178 cm)', '5\' 10" (178 செ.மீ)'),
    opt('180', '5\' 11" (180 cm)', '5\' 11" (180 செ.மீ)'),
    opt('183', '6\' 0" (183 cm)', '6\' 0" (183 செ.மீ)'),
  ],
  rasi: [
    opt('mesham', 'Mesham (Aries)', 'மேஷம்'),
    opt('rishabam', 'Rishabam (Taurus)', 'ரிஷபம்'),
    opt('mithunam', 'Mithunam (Gemini)', 'மிதுனம்'),
    opt('kadagam', 'Kadagam (Cancer)', 'கடகம்'),
    opt('simham', 'Simham (Leo)', 'சிம்மம்'),
    opt('kanni', 'Kanni (Virgo)', 'கன்னி'),
    opt('thulam', 'Thulam (Libra)', 'துலாம்'),
    opt('vrischikam', 'Vrischikam (Scorpio)', 'விருச்சிகம்'),
    opt('dhanusu', 'Dhanusu (Sagittarius)', 'தனுசு'),
    opt('makaram', 'Makaram (Capricorn)', 'மகரம்'),
    opt('kumbam', 'Kumbam (Aquarius)', 'கும்பம்'),
    opt('meenam', 'Meenam (Pisces)', 'மீனம்'),
  ],
  nakshatra: [
    opt('ashwini', 'Ashwini', 'அசுவினி'),
    opt('bharani', 'Bharani', 'பரணி'),
    opt('krittika', 'Krittika', 'கிருத்திகை'),
    opt('rohini', 'Rohini', 'ரோகிணி'),
    opt('mrigashira', 'Mrigashira', 'மிருகசீரிஷம்'),
    opt('ardra', 'Ardra', 'திருவாதிரை'),
    opt('punarvasu', 'Punarvasu', 'புனர்பூசம்'),
    opt('pushya', 'Pushya', 'ஆயில்யம்'),
    opt('ashlesha', 'Ashlesha', 'மகம்'),
    opt('magha', 'Magha', 'பூரம்'),
    opt('purva-phalguni', 'Purva Phalguni', 'உத்திரம்'),
    opt('uttara-phalguni', 'Uttara Phalguni', 'ஹஸ்தம்'),
    opt('hasta', 'Hasta', 'சித்திரை'),
    opt('chitra', 'Chitra', 'சுவாதி'),
    opt('swati', 'Swati', 'விசாகம்'),
    opt('vishakha', 'Vishakha', 'அனுஷம்'),
    opt('anuradha', 'Anuradha', 'கேட்டை'),
    opt('jyeshtha', 'Jyeshtha', 'மூலம்'),
    opt('mula', 'Mula', 'பூராடம்'),
    opt('purva-ashadha', 'Purva Ashadha', 'உத்திராடம்'),
    opt('uttara-ashadha', 'Uttara Ashadha', 'திருவோணம்'),
    opt('shravana', 'Shravana', 'அவிட்டம்'),
    opt('dhanishta', 'Dhanishta', 'சதயம்'),
    opt('shatabhisha', 'Shatabhisha', 'பூரட்டாதி'),
    opt('purva-bhadrapada', 'Purva Bhadrapada', 'உத்திரட்டாதி'),
    opt('uttara-bhadrapada', 'Uttara Bhadrapada', 'உத்திரட்டாதி'),
    opt('revati', 'Revati', 'ரேவதி'),
  ],
  dosham: [
    opt('none', 'No Dosham', 'தோஷம் இல்லை'),
    opt('chevvai', 'Chevvai Dosham (Manglik)', 'செவ்வாய் தோஷம் (மாங்கலிக்)'),
    opt('naga', 'Naga / Sarpa Dosham', 'நாக / சர்ப்ப தோஷம்'),
    opt('kalathra', 'Kalathra Dosham', 'கலத்திர தோஷம்'),
    opt('puthira', 'Puthira Dosham', 'புத்திர தோஷம்'),
    opt('raghu', 'Raghu Dosham', 'ராகு தோஷம்'),
    opt('kethu', 'Kethu Dosham', 'கேது தோஷம்'),
    opt('partial', 'Partial Dosham', 'பகுதியளவு தோஷம்'),
    opt('multiple', 'Multiple Dosham', 'பல தோஷம்'),
    opt('not-sure', "Don't Know", 'தெரியவில்லை'),
  ],
  familyType: [
    opt('joint', 'Joint Family', 'கூட்டு குடும்பம்'),
    opt('nuclear', 'Nuclear Family', 'தனி குடும்பம்'),
  ],
  familyValues: [
    opt('traditional', 'Traditional', 'பாரம்பரிய'),
    opt('moderate', 'Moderate', 'மிதமான'),
    opt('liberal', 'Liberal', 'தாரால'),
  ],
  birthOrder: [
    opt('eldest', 'Eldest', 'மூத்தவர்'),
    opt('youngest', 'Youngest', 'இளையவர்'),
    opt('middle', 'Middle', 'நடுவில்'),
    opt('only-child', 'Only Child', 'ஒரே பிள்ளை'),
  ],
  ageRange: [
    opt('21-25', '21 - 25', '21 - 25'),
    opt('25-30', '25 - 30', '25 - 30'),
    opt('25-32', '25 - 32', '25 - 32'),
    opt('30-35', '30 - 35', '30 - 35'),
    opt('35-40', '35 - 40', '35 - 40'),
  ],
  partnerAge: Array.from({ length: 43 }, (_, index) => {
    const age = String(18 + index);
    return opt(age, age, age);
  }),
  preferredLocation: [
    opt('any', 'Any', 'எதுவும்'),
    opt('tamil-nadu', 'Tamil Nadu', 'தமிழ்நாடு'),
    opt('chennai', 'Chennai', 'சென்னை'),
    opt('coimbatore', 'Coimbatore', 'கோயம்புத்தூர்'),
    opt('madurai', 'Madurai', 'மதுரை'),
    opt('bangalore', 'Bangalore', 'பெங்களூர்'),
    opt('abroad', 'Abroad', 'வெளிநாடு'),
  ],
  indianState: [
    opt('tamil-nadu', 'Tamil Nadu', 'தமிழ்நாடு'),
    opt('kerala', 'Kerala', 'கேரளா'),
    opt('karnataka', 'Karnataka', 'கர்நாடகா'),
    opt('andhra-pradesh', 'Andhra Pradesh', 'ஆந்திரப் பிரதேசம்'),
    opt('telangana', 'Telangana', 'தெலங்கானா'),
    opt('maharashtra', 'Maharashtra', 'மகாராஷ்டிரா'),
    opt('delhi', 'Delhi', 'டெல்லி'),
    opt('puducherry', 'Puducherry', 'புதுச்சேரி'),
    opt('other', 'Other', 'பிற'),
  ],
  district: [
    opt('ariyalur', 'Ariyalur', 'அரியலூர்'),
    opt('chengalpattu', 'Chengalpattu', 'செங்கல்பட்டு'),
    opt('chennai', 'Chennai', 'சென்னை'),
    opt('coimbatore', 'Coimbatore', 'கோயம்புத்தூர்'),
    opt('cuddalore', 'Cuddalore', 'கடலூர்'),
    opt('dharmapuri', 'Dharmapuri', 'தரமபுரி'),
    opt('dindigul', 'Dindigul', 'திண்டுகல்'),
    opt('erode', 'Erode', 'ஈரோடு'),
    opt('kallakurichi', 'Kallakurichi', 'கள்ளக்குரிச்சி'),
    opt('kanchipuram', 'Kanchipuram', 'காஞ்சிபுரம்'),
    opt('kanyakumari', 'Kanyakumari', 'கன்னியாகுமரி'),
    opt('karur', 'Karur', 'கருர்'),
    opt('krishnagiri', 'Krishnagiri', 'கர்ஷ்ணகிரி'),
    opt('madurai', 'Madurai', 'மதுரை'),
    opt('mayiladuthurai', 'Mayiladuthurai', 'மயிலாதுதுரை'),
    opt('nagapattinam', 'Nagapattinam', 'நாக்பட்டினம்'),
    opt('namakkal', 'Namakkal', 'நாமக்கள்'),
    opt('nilgiris', 'Nilgiris', 'நீலகிரி'),
    opt('perambalur', 'Perambalur', 'பேரம்பருர்'),
    opt('pudukkottai', 'Pudukkottai', 'புதுக்குட்டை'),
    opt('ramanathapuram', 'Ramanathapuram', 'ராமநாதபுரம்'),
    opt('ranipet', 'Ranipet', 'ரணிபேட்'),
    opt('salem', 'Salem', 'சேலம்'),
    opt('sivaganga', 'Sivaganga', 'சிவகங்க'),
    opt('tenkasi', 'Tenkasi', 'தேன்காசி'),
    opt('thanjavur', 'Thanjavur', 'தஞ்சாவூர்'),
    opt('theni', 'Theni', 'தேனி'),
    opt('thoothukudi', 'Thoothukudi', 'தூத்துக்குடி'),
    opt('tiruchirappalli', 'Tiruchirappalli', 'திருச்சிராப்பள்ளி'),
    opt('tirunelveli', 'Tirunelveli', 'திருநேல்வேலி'),
    opt('tirupathur', 'Tirupathur', 'திருப்பதுர்'),
    opt('tiruppur', 'Tiruppur', 'திருப்பூர்'),
    opt('tiruvallur', 'Tiruvallur', 'திருவள்ளுர்'),
    opt('tiruvannamalai', 'Tiruvannamalai', 'திருவண்ணாமலை'),
    opt('tiruvarur', 'Tiruvarur', 'திருவருர்'),
    opt('vellore', 'Vellore', 'வேல்லூர்'),
    opt('viluppuram', 'Viluppuram', 'விலுப்புரம்'),
    opt('virudhunagar', 'Virudhunagar', 'விருத்துநகர்'),
    opt('other', 'Other', 'பிற'),
  ],
  country: [
    opt('india', 'India', 'இந்தியா'),
    opt('usa', 'United States', 'அமெரிக்கா'),
    opt('uk', 'United Kingdom', 'இங்கிலாந்து'),
    opt('uae', 'United Arab Emirates', 'ஐக்கிய அரபு எமிரேட்ஸ்'),
    opt('singapore', 'Singapore', 'சிங்கப்பூர்'),
    opt('australia', 'Australia', 'ஆஸ்திரேலியா'),
    opt('canada', 'Canada', 'கனடா'),
    opt('other', 'Other', 'பிற'),
  ],
  siblingCount: [
    opt('0', '-', '-'),
    opt('1', '1', '1'),
    opt('2', '2', '2'),
    opt('3', '3', '3'),
    opt('4', '4', '4'),
    opt('5', '5', '5'),
    opt('6', '6', '6'),
    opt('7', '7', '7'),
    opt('8', '8', '8'),
    opt('9', '9', '9'),
  ],
  birthOrderRelation: [
    opt('elder-brother', 'Elder Brother', 'அண்ணன்'),
    opt('younger-brother', 'Younger Brother', 'தம்பி'),
    opt('elder-sister', 'Elder Sister', 'அக்கா'),
    opt('younger-sister', 'Younger Sister', 'தங்கை'),
  ],
  maritalStatusBiodata: [
    opt('unmarried', 'Unmarried', 'திருமணமாகாதவர்'),
    opt('divorced', 'Divorced', 'மறுமணம்'),
  ],
  livingStatus: [
    opt('with-family', 'With Family', 'குடும்பத்துடன்'),
    opt('separate', 'Separate', 'தனியாக'),
  ],
  eatingHabit: [
    opt('veg', 'Veg', 'சைவம்'),
    opt('non-veg', 'Non-Veg', 'அசைவம்'),
    opt('eggetarian', 'Eggetarian', 'முட்டை சைவம்'),
  ],
  complexionBiodata: [
    opt('fair', 'Fair', 'கலர்'),
    opt('wheatish', 'Wheatish', 'மாநிறம்'),
  ],
  seervarisai: [
    opt('no', 'No', 'இல்லை'),
    opt('as-agreed', 'As agreed', 'பேச்சுவார்த்தையில்'),
    opt('as-per-custom', 'As per custom', 'வழக்கப்படி'),
  ],
  dasaPlanet: [
    opt('kethu', 'Kethu', 'கேது'),
    opt('sukran', 'Sukran', 'சுக்ரன்'),
    opt('suriyan', 'Suriyan', 'சூரியன்'),
    opt('chandran', 'Chandran', 'சந்திரன்'),
    opt('sevvai', 'Sevvai', 'செவ்வாய்'),
    opt('rahu', 'Rahu', 'ராகு'),
    opt('guru', 'Guru', 'குரு'),
    opt('sani', 'Sani', 'சனி'),
    opt('budhan', 'Budhan', 'புதன்'),
  ],
  dasaYear: Array.from({ length: 20 }, (_, index) => {
    const year = String(index + 1).padStart(2, '0');
    return opt(year, year, year);
  }),
  dasaMonth: Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0');
    return opt(month, month, month);
  }),
  dasaDay: Array.from({ length: 31 }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return opt(day, day, day);
  }),
  countryCode: [
    opt('+91', 'India (+91)', 'இந்தியா (+91)'),
    opt('+1', 'USA (+1)', 'அமெரிக்கா (+1)'),
    opt('+44', 'UK (+44)', 'இங்கிலாந்து (+44)'),
    opt('+971', 'UAE (+971)', 'ஐக்கிய அரபு எமிரேட்ஸ் (+971)'),
  ],
  anyOption: [
    opt('any', 'Any', 'எதுவும்'),
  ],
};

export function getFormOptions(key: FormOptionsKey, language: Language) {
  return formOptionLists[key].map((option) => ({
    value: option.value,
    label: option.label[language],
  }));
}

export function getOptionLabel(
  key: FormOptionsKey,
  value: string | undefined,
  language: Language,
  fallback = '',
) {
  if (!value) {
    return fallback;
  }
  const match = formOptionLists[key].find((option) => option.value === value);
  return match?.label[language] ?? value;
}

export type ProfileFieldConfig = {
  fieldKey: string;
  kind: 'text' | 'select' | 'date' | 'readonly';
  optionsKey?: FormOptionsKey;
  multiline?: boolean;
  fixedValue?: string;
  optional?: boolean;
  keyboardType?: 'default' | 'phone-pad';
  maxLength?: number;
  rowGroup?: string;
};

type FamilyFieldDisplay = {
  label: string;
  placeholder: string;
};

type FamilyFieldDefinition = {
  config: ProfileFieldConfig;
  display: Record<Language, FamilyFieldDisplay>;
};

const familyInformationFields: FamilyFieldDefinition[] = [
  {
    config: { fieldKey: 'familyType', kind: 'select', optionsKey: 'familyType' },
    display: {
      en: { label: 'Family Type', placeholder: 'Joint / Nuclear' },
      ta: { label: 'குடும்ப வகை', placeholder: 'கூட்டு / தனி குடும்பம்' },
    },
  },
  {
    config: { fieldKey: 'familyValues', kind: 'select', optionsKey: 'familyValues' },
    display: {
      en: { label: 'Family Values', placeholder: 'Traditional / Moderate / Liberal' },
      ta: { label: 'குடும்ப மதிப்புகள்', placeholder: 'பாரம்பரிய / மிதமான / தாராள' },
    },
  },
  {
    config: { fieldKey: 'totalFamilyMembers', kind: 'select', optionsKey: 'siblingCount' },
    display: {
      en: { label: 'Total Family Members', placeholder: 'Select count' },
      ta: { label: 'மொத்த குடும்ப உறுப்பினர்கள்', placeholder: 'எண்ணிக்கையைத் தேர்ந்தெடுக்கவும்' },
    },
  },
  {
    config: { fieldKey: 'birthOrder', kind: 'select', optionsKey: 'birthOrder' },
    display: {
      en: { label: 'Birth Order', placeholder: 'Select birth order' },
      ta: { label: 'பிறப்பு வரிசை', placeholder: 'பிறப்பு வரிசையைத் தேர்ந்தெடுக்கவும்' },
    },
  },
  {
    config: { fieldKey: 'marriedMembers', kind: 'select', optionsKey: 'siblingCount', optional: true },
    display: {
      en: { label: 'Married Members (Optional)', placeholder: 'Select count' },
      ta: { label: 'திருமணமான உறுப்பினர்கள் (விருப்பம்)', placeholder: 'எண்ணிக்கையைத் தேர்ந்தெடுக்கவும்' },
    },
  },
  {
    config: { fieldKey: 'unmarriedMembers', kind: 'select', optionsKey: 'siblingCount', optional: true },
    display: {
      en: { label: 'Unmarried Members (Optional)', placeholder: 'Select count' },
      ta: { label: 'திருமணமாகாத உறுப்பினர்கள் (விருப்பம்)', placeholder: 'எண்ணிக்கையைத் தேர்ந்தெடுக்கவும்' },
    },
  },
];

const parentSiblingFields: FamilyFieldDefinition[] = [
  {
    config: { fieldKey: 'fatherName', kind: 'text' },
    display: {
      en: { label: "Father's Name", placeholder: 'Enter name' },
      ta: { label: 'தந்தையின் பெயர்', placeholder: 'பெயரை உள்ளிடவும்' },
    },
  },
  {
    config: { fieldKey: 'fatherOccupation', kind: 'select', optionsKey: 'occupation', optional: true },
    display: {
      en: { label: "Father's Occupation (Optional)", placeholder: 'Select occupation' },
      ta: { label: 'தந்தையின் தொழில் (விருப்பம்)', placeholder: 'தொழிலைத் தேர்ந்தெடுக்கவும்' },
    },
  },
  {
    config: { fieldKey: 'motherName', kind: 'text' },
    display: {
      en: { label: "Mother's Name", placeholder: 'Enter name' },
      ta: { label: 'தாயின் பெயர்', placeholder: 'பெயரை உள்ளிடவும்' },
    },
  },
  {
    config: { fieldKey: 'motherOccupation', kind: 'select', optionsKey: 'occupation', optional: true },
    display: {
      en: { label: "Mother's Occupation (Optional)", placeholder: 'Select occupation' },
      ta: { label: 'தாயின் தொழில் (விருப்பம்)', placeholder: 'தொழிலைத் தேர்ந்தெடுக்கவும்' },
    },
  },
  {
    config: { fieldKey: 'brotherDetails', kind: 'text', multiline: true, optional: true },
    display: {
      en: {
        label: 'Brother Details (Optional)',
        placeholder: 'e.g. 1 elder brother (married), 1 younger brother (unmarried)',
      },
      ta: {
        label: 'சகோதரர் விவரங்கள் (விருப்பம்)',
        placeholder: 'எ.கா. 1 மூத்த சகோதரர் (திருமணம்), 1 இளைய சகோதரர் (திருமணமில்லை)',
      },
    },
  },
  {
    config: { fieldKey: 'sisterDetails', kind: 'text', multiline: true, optional: true },
    display: {
      en: {
        label: 'Sister Details (Optional)',
        placeholder: 'e.g. 1 elder sister (married), 1 younger sister (unmarried)',
      },
      ta: {
        label: 'சகோதரி விவரங்கள் (விருப்பம்)',
        placeholder: 'எ.கா. 1 மூத்த சகோதரி (திருமணம்), 1 இளைய சகோதரி (திருமணமில்லை)',
      },
    },
  },
];

function mapFamilyStepFields(definitions: FamilyFieldDefinition[], language: Language) {
  return {
    configs: definitions.map((definition) => definition.config),
    fields: definitions.map((definition) => definition.display[language]),
  };
}

export function getFamilyInformationStepFields(language: Language) {
  return mapFamilyStepFields(familyInformationFields, language);
}

export function getParentSiblingStepFields(language: Language) {
  return mapFamilyStepFields(parentSiblingFields, language);
}

const horoscopeFields: FamilyFieldDefinition[] = [
  {
    config: { fieldKey: 'rasi', kind: 'select', optionsKey: 'rasi', optional: true },
    display: {
      en: { label: 'Rasi', placeholder: 'Select rasi' },
      ta: { label: 'ராசி', placeholder: 'ராசியைத் தேர்ந்தெடுக்கவும்' },
    },
  },
  {
    config: { fieldKey: 'nakshatra', kind: 'select', optionsKey: 'nakshatra', optional: true },
    display: {
      en: { label: 'Natchathiram', placeholder: 'Select natchathiram' },
      ta: { label: 'நட்சத்திரம்', placeholder: 'நட்சத்திரத்தைத் தேர்ந்தெடுக்கவும்' },
    },
  },
  {
    config: { fieldKey: 'lagnam', kind: 'select', optionsKey: 'rasi', optional: true },
    display: {
      en: { label: 'Laknam', placeholder: 'Select laknam' },
      ta: { label: 'லக்னம்', placeholder: 'லக்னத்தைத் தேர்ந்தெடுக்கவும்' },
    },
  },
];

const physicalDetailsFields: FamilyFieldDefinition[] = [
  {
    config: { fieldKey: 'skinColor', kind: 'select', optionsKey: 'skinColor', optional: true },
    display: {
      en: { label: 'Skin Color (Optional)', placeholder: 'Select skin color' },
      ta: { label: 'நிறம் (விருப்பம்)', placeholder: 'நிறத்தைத் தேர்ந்தெடுக்கவும்' },
    },
  },
  {
    config: { fieldKey: 'height', kind: 'select', optionsKey: 'height' },
    display: {
      en: { label: 'Height', placeholder: 'Select height' },
      ta: { label: 'உயரம்', placeholder: 'உயரத்தைத் தேர்ந்தெடுக்கவும்' },
    },
  },
  {
    config: { fieldKey: 'weight', kind: 'select', optionsKey: 'weight', optional: true },
    display: {
      en: { label: 'Weight (Optional)', placeholder: 'Select weight range' },
      ta: { label: 'எடை (விருப்பம்)', placeholder: 'எடை வரம்பைத் தேர்ந்தெடுக்கவும்' },
    },
  },
  {
    config: { fieldKey: 'physicalChallenge', kind: 'select', optionsKey: 'physicalChallenge' },
    display: {
      en: { label: 'Physical Challenge', placeholder: 'Normal / Physically Challenged' },
      ta: { label: 'உடல் நிலை', placeholder: 'இயல்பு / உடல் ஊனம் உள்ளவர்' },
    },
  },
];

export function getHoroscopeStepFields(language: Language) {
  return mapFamilyStepFields(horoscopeFields, language);
}

export function getPhysicalDetailsStepFields(language: Language) {
  return mapFamilyStepFields(physicalDetailsFields, language);
}

export const HOROSCOPE_STEP_ID = '13';
export const PHYSICAL_DETAILS_STEP_ID = '18';

export const profileStepFieldConfig: Record<string, ProfileFieldConfig[]> = {
  '2': [
    { fieldKey: 'fullName', kind: 'text' },
    { fieldKey: 'gender', kind: 'select', optionsKey: 'gender' },
    { fieldKey: 'religion', kind: 'select', optionsKey: 'religion' },
    {
      fieldKey: 'caste',
      kind: 'readonly',
      fixedValue: FIXED_CASTE_VALUE,
      optionsKey: 'community',
    },
    { fieldKey: 'subCaste', kind: 'select', optionsKey: 'subCaste', optional: true },
  ],
  '3': [{ fieldKey: 'dateOfBirth', kind: 'date' }],
  '7': [{ fieldKey: 'education', kind: 'select', optionsKey: 'education' }],
  '8': [
    { fieldKey: 'occupation', kind: 'select', optionsKey: 'occupation' },
    { fieldKey: 'workType', kind: 'select', optionsKey: 'workType' },
  ],
  '9': [
    { fieldKey: 'monthlyIncome', kind: 'select', optionsKey: 'monthlyIncome' },
    { fieldKey: 'annualIncome', kind: 'select', optionsKey: 'annualIncome', optional: true },
  ],
  '10': [
    { fieldKey: 'nativePlace', kind: 'text' },
    { fieldKey: 'nativeDistrict', kind: 'select', optionsKey: 'district' },
    { fieldKey: 'nativeState', kind: 'select', optionsKey: 'indianState' },
    { fieldKey: 'nativeCountry', kind: 'select', optionsKey: 'country' },
  ],
  final: [
    { fieldKey: 'partnerAgeFrom', kind: 'select', optionsKey: 'partnerAge', rowGroup: 'partnerAge' },
    { fieldKey: 'partnerAgeTo', kind: 'select', optionsKey: 'partnerAge', rowGroup: 'partnerAge' },
    { fieldKey: 'partnerEducation', kind: 'select', optionsKey: 'educationPreference' },
    { fieldKey: 'partnerPreferredLocation', kind: 'select', optionsKey: 'preferredLocation' },
  ],
};

export const PHOTOS_STEP_ID = 'photos';
export const PARTNER_PREFERENCES_STEP_ID = 'final';

export const profileOptionStepKeys: Record<string, string> = {
  '1': 'profileFor',
  '4': 'maritalStatus',
};
