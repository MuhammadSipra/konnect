type GradientColors = readonly [string, string, ...string[]];

export const lightColors = {
  bg: '#F8FAFC',
  bgGradient: ['#F8FAFC', '#FFFFFF', '#F1F5F9'] as GradientColors,
  cardGradient: ['#FFFFFF', '#F1F5F9'] as GradientColors,
  surface: 'rgba(255, 255, 255, 0.85)',
  surfaceSolid: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  green: '#16A34A',
  greenDark: '#15803D',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  gold: '#CA8A04',
  red: '#DC2626',
  glowGreenBg: 'rgba(22, 163, 74, 0.08)',
  glowBlueBg: 'rgba(37, 99, 235, 0.06)',
};

export const darkColors = {
  bg: '#020617',
  bgGradient: ['#0f172a', '#020617', '#0a0f1a'] as GradientColors,
  cardGradient: ['#1e293b', '#0f172a'] as GradientColors,
  surface: 'rgba(30, 41, 59, 0.6)',
  surfaceSolid: '#1e293b',
  border: '#1e293b',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  green: '#22c55e',
  greenDark: '#16a34a',
  blue: '#3b82f6',
  blueDark: '#2563eb',
  gold: '#fbbf24',
  red: '#ef4444',
  glowGreenBg: 'rgba(34, 197, 94, 0.1)',
  glowBlueBg: 'rgba(59, 130, 246, 0.08)',
};

export type ThemeColors = typeof darkColors;