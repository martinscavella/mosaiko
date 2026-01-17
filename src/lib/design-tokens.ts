/**
 * Design Tokens - Sistema unificato per Mosaiko
 * Stile: Minimale, pulito, moderno
 */

// ============================================
// COLORI
// ============================================
export const colors = {
  // Primary palette - blu/indigo per azioni principali
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  // Success - verde per conferme/entrate
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
  },
  // Danger - rosso per errori/uscite
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
  },
  // Neutral - grigi per testi e background
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const

// ============================================
// SPACING
// ============================================
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
} as const

// ============================================
// BORDER RADIUS - Uniformato
// ============================================
export const radius = {
  sm: '0.375rem',  // 6px - per elementi piccoli (badge, chip)
  md: '0.5rem',    // 8px - per bottoni, input
  lg: '0.75rem',   // 12px - per card piccole
  xl: '1rem',      // 16px - per card, modali
  '2xl': '1.25rem', // 20px - per card grandi
  full: '9999px',  // per pill, avatar
} as const

// ============================================
// SHADOWS - Semplificati e uniformati
// ============================================
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
} as const

// ============================================
// TRANSITION - Uniformi
// ============================================
export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const

// ============================================
// TYPOGRAPHY
// ============================================
export const typography = {
  // Font sizes
  size: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  // Font weights
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const

// ============================================
// CLASSI TAILWIND PREDEFINITE
// ============================================

// Card base - stile unificato per tutti i widget/card
export const cardStyles = {
  base: 'bg-white border border-neutral-200 rounded-xl shadow-sm',
  hover: 'hover:shadow-md hover:border-neutral-300 transition-shadow duration-200',
  interactive: 'cursor-pointer active:scale-[0.98] transition-transform duration-150',
} as const

// Bottoni
export const buttonStyles = {
  base: 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
  sizes: {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  },
  variants: {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
    secondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300',
    ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800',
    success: 'bg-success-600 text-white hover:bg-success-700 active:bg-success-800',
  },
} as const

// Icon containers
export const iconContainerStyles = {
  base: 'flex items-center justify-center rounded-lg',
  sizes: {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  },
  colors: {
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-success-100 text-success-600',
    danger: 'bg-danger-100 text-danger-600',
    neutral: 'bg-neutral-100 text-neutral-600',
  },
} as const

// Badge / Chip
export const badgeStyles = {
  base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  variants: {
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    danger: 'bg-danger-100 text-danger-700',
    neutral: 'bg-neutral-100 text-neutral-700',
  },
} as const

// Widget header
export const widgetHeaderStyles = {
  container: 'flex items-center gap-3 mb-4',
  iconBox: 'flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg',
  title: 'text-base font-semibold text-neutral-900',
  subtitle: 'text-sm text-neutral-500',
} as const
