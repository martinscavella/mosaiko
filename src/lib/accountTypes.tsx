import { CreditCard, TrendingUp, Wallet, PiggyBank, Building2, type LucideIcon } from 'lucide-react'

export const ACCOUNT_TYPE_VALUES = [
  'bank_account',
  'debit_card',
  'credit_card',
  'saving_account',
  'foreign_account',
  'investment_account',
  'cash',
  'voucher',
  'digital_wallet'
] as const

export type AccountType = typeof ACCOUNT_TYPE_VALUES[number]

interface AccountTypeMeta {
  label: string
  badgeClass: string
  icon: LucideIcon
}

const ACCOUNT_TYPE_META: Record<string, AccountTypeMeta> = {
  bank_account: { label: 'Conto Bancario', badgeClass: 'bg-primary-subtle text-primary', icon: Building2 },
  debit_card: { label: 'Carta di Debito', badgeClass: 'bg-primary-subtle text-primary', icon: CreditCard },
  credit_card: { label: 'Carta di Credito', badgeClass: 'bg-danger-subtle text-danger', icon: CreditCard },
  saving_account: { label: 'Conto Risparmio', badgeClass: 'bg-success-subtle text-success-strong', icon: PiggyBank },
  foreign_account: { label: 'Conto Estero', badgeClass: 'bg-module-health-subtle text-module-health', icon: Building2 },
  investment_account: { label: 'Conto Investimenti', badgeClass: 'bg-warning-subtle text-warning', icon: TrendingUp },
  cash: { label: 'Contanti', badgeClass: 'bg-warning-subtle text-warning', icon: Wallet },
  voucher: { label: 'Voucher', badgeClass: 'bg-module-health-subtle text-module-health', icon: CreditCard },
  digital_wallet: { label: 'Portafoglio Digitale', badgeClass: 'bg-module-tasks-subtle text-module-tasks', icon: Wallet }
}

export function getAccountTypeLabel(type: string): string {
  return ACCOUNT_TYPE_META[type]?.label || type
}

export function getAccountTypeBadgeClass(type: string): string {
  return ACCOUNT_TYPE_META[type]?.badgeClass || 'bg-inset text-ink'
}

export function getAccountTypeIcon(type: string): LucideIcon {
  return ACCOUNT_TYPE_META[type]?.icon || CreditCard
}

export const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPE_VALUES.map((value) => ({
  value,
  label: ACCOUNT_TYPE_META[value].label
}))

export const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - Dollaro' },
  { value: 'GBP', label: 'GBP - Sterlina' },
  { value: 'CHF', label: 'CHF - Franco Svizzero' }
]
