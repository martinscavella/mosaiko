/**
 * Tema condiviso per i grafici Recharts.
 * Tutti i colori puntano ai token CSS di designtoken.md, così i grafici
 * seguono automaticamente light/dark mode senza re-render.
 */
import type { CSSProperties } from 'react'

export const chartColors = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  grid: 'var(--chart-grid)',
  axis: 'var(--color-text-muted)',
  surface: 'var(--color-bg-surface)',
} as const

/**
 * Palette categorica validata (CVD-safe, contrasto >= 3:1 su surface,
 * light e dark). Assegnare in ordine fisso, mai ciclare oltre 8:
 * la nona serie va accorpata in "Altro".
 */
export const chartCategorical = [
  'var(--chart-cat-1)',
  'var(--chart-cat-2)',
  'var(--chart-cat-3)',
  'var(--chart-cat-4)',
  'var(--chart-cat-5)',
  'var(--chart-cat-6)',
  'var(--chart-cat-7)',
  'var(--chart-cat-8)',
] as const

export const chartTooltipStyle: CSSProperties = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  boxShadow: 'var(--shadow-elevated)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
}

export const chartTooltipLabelStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
}

export const chartAxisTick = {
  fontSize: 12,
  fill: 'var(--color-text-muted)',
} as const
