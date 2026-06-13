/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

const tintColorLight = '#6b46c1'; // Brand purple
const tintColorDark = '#9f7aea';  // Lighter brand purple for dark mode

export const Colors = {
  light: {
    text: '#111827',
    textSecondary: '#6b7280',
    background: '#F7F7FA',
    brandBackground: '#F3F1FA',
    card: '#ffffff',
    cardAlt: '#f9fafb',
    tint: tintColorLight,
    icon: '#6b7280',
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorLight,
    border: '#e5e7eb',
    error: '#ef4444',
    success: '#10b981',
    primary: '#6b46c1',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: '#121620',
    brandBackground: '#121620',
    card: '#1b202e',
    cardAlt: '#242b3d',
    tint: tintColorDark,
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
    border: '#293247',
    error: '#f87171',
    success: '#34d399',
    primary: '#a78bfa',
  },
};
