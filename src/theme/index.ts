export const Theme = {
  colors: {
    background: '#F8FAFC', // Off-white
    card: '#FFFFFF',
    textPrimary: '#0F172A', // Slate-900
    textSecondary: '#64748B', // Slate-500
    primary: '#3B82F6', // Soft Blue
    primaryLight: '#EFF6FF',
    accent: '#0EA5E9',
    safe: '#10B981', // Emerald
    safeLight: '#ECFDF5',
    warning: '#F59E0B', // Amber
    warningLight: '#FFFBEB',
    danger: '#EF4444', // Red
    dangerLight: '#FEF2F2',
    border: '#E2E8F0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700', color: '#0F172A' },
    h2: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
    h3: { fontSize: 20, fontWeight: '600', color: '#0F172A' },
    body: { fontSize: 16, color: '#334155' },
    caption: { fontSize: 14, color: '#64748B' },
    small: { fontSize: 12, color: '#94A3B8' },
  },
  shadows: {
    card: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    button: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
  },
} as const;
