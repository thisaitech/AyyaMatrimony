import { Platform, type TextInputProps } from 'react-native';

type TamilWebTextInputProps = TextInputProps & {
  lang?: string;
  dir?: 'ltr' | 'rtl';
};

/** Props that hint Tamil input on web and reduce English autocorrect on native. */
export function getTamilTextInputProps(): TextInputProps {
  const props: TamilWebTextInputProps = {
    autoCorrect: false,
    spellCheck: false,
    autoCapitalize: 'none',
  };

  if (Platform.OS === 'web') {
    props.lang = 'ta';
    props.dir = 'ltr';
  } else if (Platform.OS === 'ios') {
    props.keyboardType = 'default';
    props.textContentType = 'none';
    props.accessibilityLanguage = 'ta-IN';
  } else if (Platform.OS === 'android') {
    props.keyboardType = 'default';
    props.importantForAutofill = 'no';
    props.accessibilityLanguage = 'ta-IN';
  }

  return props;
}
