// Tipi condivisi per l'import finanziario

export interface ImportRow {
  id: string
  date: string
  description: string
  amount: string
  type: string
  account?: string
  category?: string
  subcategory?: string
  targetTable: 'transactions' | 'refunds' | 'funds_transfer'
  status: 'pending' | 'success' | 'error'
  errors?: string[]
  isEditing?: boolean
  code?: string
  currency?: string
  initialAmount?: string
  currentAmount?: string
  note?: string
  transactionType?: string
  refundDetails?: string
  refundCode?: string
  transferDetails?: string
  transferCode?: string
  is_refunded?: boolean
}

export interface BankParser {
  name: string
  identifier: string
  logo?: string
  detectFormat: (headers: string[], firstRow?: string[]) => boolean
  parseRow: (headers: string[], values: string[], accountMappings?: {[key: string]: string}) => Partial<ImportRow>
  transformAmount?: (amount: string) => string
  transformDate?: (date: string) => string
}
