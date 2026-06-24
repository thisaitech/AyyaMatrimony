export const colors = {
  primary: '#570000',
  primaryContainer: '#800000',
  primaryFixedDim: '#ffb4a8',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#ff8371',
  secondary: '#735c00',
  secondaryContainer: '#fed65b',
  secondaryFixed: '#ffe088',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#745c00',
  surface: '#ffffff',
  surfaceBright: '#ffffff',
  surfaceContainer: '#f2f0ef',
  surfaceContainerLow: '#fdfbfa',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#ebe9e8',
  surfaceContainerHighest: '#e6e4e3',
  surfaceTint: '#b22b1d',
  onSurface: '#141d23',
  onSurfaceVariant: '#5a413d',
  background: '#faf8f6',
  outline: '#8e706c',
  outlineVariant: '#e2bfb9',
  error: '#ba1a1a',
  tertiary: '#491520',
  gold: '#D4AF37',
};

export const spacing = {
  xs: 10,
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  containerMargin: 24,
};

export const fonts = {
  playfair: 'PlayfairDisplay_700Bold',
  playfairSemi: 'PlayfairDisplay_600SemiBold',
  inter: 'NotoSansTamil_400Regular',
  interMedium: 'NotoSansTamil_500Medium',
  interSemi: 'NotoSansTamil_600SemiBold',
  interBold: 'NotoSansTamil_700Bold',
};

export const typography = {
  headlineLg: { fontSize: 32, lineHeight: 42, fontFamily: fonts.playfair },
  headlineMd: { fontSize: 26, lineHeight: 36, fontFamily: fonts.playfairSemi },
  titleLg: { fontSize: 22, lineHeight: 32, fontFamily: fonts.interSemi },
  bodyMd: { fontSize: 15, lineHeight: 24, fontFamily: fonts.inter },
  bodyLg: { fontSize: 17, lineHeight: 28, fontFamily: fonts.inter },
  labelSm: { fontSize: 13, lineHeight: 18, fontFamily: fonts.interSemi, letterSpacing: 0.6 },
  labelLg: { fontSize: 15, lineHeight: 24, fontFamily: fonts.interMedium },
};

export const borderRadius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};
