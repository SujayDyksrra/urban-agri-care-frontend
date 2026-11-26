/** Font family names registered in app/_layout.tsx. Use these instead of fontWeight. */
export const font = {
  regular: 'Jakarta-Regular',
  medium: 'Jakarta-Medium',
  semibold: 'Jakarta-SemiBold',
  bold: 'Jakarta-Bold',
} as const;

// Leafora-inspired palette: soft cream backgrounds, deep forest green, sage accents.
export const theme = {
  background: '#F4F1E8',
  surface: '#FFFDF7',
  surfaceAlt: '#EFEBDF',
  primary: '#2F4B32',
  primaryDark: '#22382A',
  primarySoft: '#E3E8DA',
  sage: '#8FA487',
  sageLight: '#DCE3D2',
  text: '#1F2A20',
  muted: '#6D7266',
  border: '#E6E1D3',
  danger: '#B23A2E',
  dangerSoft: '#F5DCD6',
  warning: '#9A7420',
  warningSoft: '#F6ECD2',
  demoBackground: '#F6ECD2',
  demoText: '#7A5B14',
  radius: 18,
} as const;

export const shadow = {
  shadowColor: '#2F4B32',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

/**
 * One type scale for the whole app, so headings and body text never drift.
 * display: page titles · title: section and card headings
 * body: normal text and buttons · small: secondary text · caption: labels, tab names, pills.
 */
export const type = {
  display: 20,
  title: 16,
  body: 14,
  small: 12,
  caption: 10,
} as const;
export const lineHeight = (size: number) => Math.round(size * (size >= 20 ? 1.25 : 1.45));

/** Status colours: green for Healthy, red for Unhealthy, amber for anything uncertain. */
export type StatusColors = { main: string; soft: string; tint: string };
export function statusColors(status?: string): StatusColors {
  if (status === 'Healthy') return { main: '#3C7A43', soft: '#DCEBD6', tint: '#EEF4EA' };
  if (status === 'Unhealthy') return { main: '#B23A2E', soft: '#F5D9D3', tint: '#FAEDEA' };
  return { main: '#A87A12', soft: '#F4E6C2', tint: '#FAF3E2' };
}
export const statusTone = (status?: string): 'green' | 'danger' | 'warn' => (status === 'Healthy' ? 'green' : status === 'Unhealthy' ? 'danger' : 'warn');
