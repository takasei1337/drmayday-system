/**
 * DR. MAYDAY DESIGN SYSTEM — CANONICAL TOKENS (v2.0)
 * Aligned with Uber Base Design System & National Hospital of Dermatology
 * Zero external logos, strictly medical-grade design tokens.
 */

export const colors = {
  primary: {
    50: '#F0F3FA',
    100: '#DCE3F2',
    200: '#BAC8E5',
    300: '#8FA5D2',
    400: '#5D79B5',
    500: '#294A8A',
    600: '#091F5B', // Core Brand Navy
    700: '#071947',
    800: '#051333',
    900: '#030D22',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  semantic: {
    success: { bg: '#DCFCE7', fg: '#15803D', text: '#166534', contrastWhite: '5.13:1 (WCAG AA)' },
    warning: { bg: '#FEF3C7', fg: '#B45309', text: '#92400E', contrastWhite: '5.02:1 (WCAG AA)' },
    error: { bg: '#FEE2E2', fg: '#DC2626', text: '#991B1B', contrastWhite: '4.83:1 (WCAG AA)' },
    info: { bg: '#E0F2FE', fg: '#0369A1', text: '#075985', contrastWhite: '5.93:1 (WCAG AA)' },
    teal: { bg: '#CCFBF1', fg: '#0F766E', text: '#115E59', contrastWhite: '5.47:1 (WCAG AA)' },
  },
  uas7Bands: [
    { range: '0', label: 'Sạch bệnh', fg: '#0F766E', bg: '#CCFBF1', border: '#5EEAD4' },
    { range: '1–6', label: 'Kiểm soát tốt', fg: '#15803D', bg: '#DCFCE7', border: '#86EFAC' },
    { range: '7–15', label: 'Nhẹ', fg: '#0369A1', bg: '#E0F2FE', border: '#7DD3FC' },
    { range: '16–27', label: 'Trung bình', fg: '#B45309', bg: '#FEF3C7', border: '#FCD34D' },
    { range: '28–42', label: 'Nặng', fg: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
  ],
  darkRoles: {
    bgPage: '#090F1D',
    bgSurface: '#111A2E',
    bgElevated: '#18233C',
    borderDefault: '#2B3B5E',
    borderStrong: '#3B507D',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
  },
  roles: {
    bgPage: '#F3F6FC',
    bgSurface: '#FFFFFF',
    bgElevated: '#FFFFFF',
    borderDefault: '#E2E8F0',
    borderStrong: '#CBD5E1',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textInverse: '#FFFFFF',
    iconDefault: '#334155',
    iconMuted: '#94A3B8',
  },
};

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  // Semantic aliases
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
};

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  monoFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  primaryFont: 'Inter',
  scale: {
    display: { size: '36px', weight: 700, lineHeight: '44px' },
    h1: { size: '28px', weight: 700, lineHeight: '36px' },
    h2: { size: '24px', weight: 600, lineHeight: '32px' },
    h3: { size: '20px', weight: 600, lineHeight: '28px' },
    h4: { size: '18px', weight: 600, lineHeight: '24px' },
    bodyLg: { size: '16px', weight: 400, lineHeight: '24px' },
    body: { size: '14px', weight: 400, lineHeight: '20px' },
    bodyMd: { size: '14px', weight: 500, lineHeight: '20px' },
    label: { size: '12px', weight: 600, lineHeight: '16px' },
    caption: { size: '12px', weight: 400, lineHeight: '16px' },
    button: { size: '14px', weight: 600, lineHeight: '20px' },
  },
};

export const radii = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '10px',
  button: '6px',
  input: '6px',
  card: '8px',
  modal: '10px',
  badge: '4px',
  full: '999px',
  round: '50%',
};

export const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.10), 0 1px 2px -1px rgba(0, 0, 0, 0.10)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -2px rgba(0, 0, 0, 0.10)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.10)',
  focus: '0 2px 10px rgba(9, 31, 91, 0.16)',
  focusError: '0 2px 10px rgba(220, 38, 38, 0.16)',
};

export const layout = {
  desktopRefWidth: 1440,
  sidebarWidth: 272,
  topbarHeight: 80,
  contentInset: 20,
  maxContentWidth: 1200,
  gridGutter: 24,
};

export default {
  colors,
  spacing,
  typography,
  radii,
  shadows,
  layout,
};
