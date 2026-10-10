// Krishi Saathi visual theme: high contrast, large text and large touch targets.

export const colors = {
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  primaryLight: '#E8F5E9',
  onPrimary: '#FFFFFF',

  accent: '#795548',
  accentLight: '#EFEBE9',
  onAccent: '#FFFFFF',

  warning: '#B26A00',
  warningLight: '#FFF3E0',
  danger: '#C62828',
  dangerLight: '#FFEBEE',
  info: '#1565C0',
  infoLight: '#E3F2FD',
  success: '#2E7D32',

  background: '#F6F5EF',
  surface: '#FFFFFF',
  surfaceMuted: '#F0EEE6',
  border: '#D6D2C4',
  text: '#1A1A1A',
  textMuted: '#545454',
  textInverse: '#FFFFFF',
  disabled: '#A5A5A5',
  overlay: 'rgba(0,0,0,0.35)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  small: 15,
  body: 17,
  large: 19,
  title: 22,
  heading: 26,
  display: 34,
} as const;

export const touch = {
  /** Minimum touch target (dp). */
  min: 48,
  /** Primary buttons. */
  primary: 56,
} as const;

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

export const theme = { colors, spacing, radius, fontSize, touch, shadow };
export default theme;
