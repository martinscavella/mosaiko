'use client'

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import * as XLSX from 'xlsx'
import { 
  Upload, 
  FileSpreadsheet, 
  Download,
  CheckCircle,
  FileText,
  RefreshCw,
  X,
  Info,
  Plus
} from 'lucide-react'

interface ImportRow {
  id: string
  date: string
  description: string
  amount: string
  type: string
  account?: string // Ora questo sarà l'UUID dell'account
  category?: string
  subcategory?: string
  targetTable: 'transactions' | 'refunds' | 'fund_transfers'
  status: 'pending' | 'success' | 'error'
  errors?: string[]
  isEditing?: boolean
  // Campi aggiuntivi per tutti i tipi di tabella
  code?: string
  currency?: string
  initialAmount?: string
  currentAmount?: string
  note?: string
  // Campi specifici per transazioni
  transactionType?: string
  // Campi specifici per rimborsi
  refundDetails?: string
  refundCode?: string
  // Campi specifici per trasferimenti
  transferDetails?: string
  transferCode?: string
}

interface BankParser {
  name: string
  identifier: string
  logo?: string
  detectFormat: (headers: string[], firstRow?: string[]) => boolean
  parseRow: (headers: string[], values: string[]) => Partial<ImportRow>
  transformAmount?: (amount: string) => string
  transformDate?: (date: string) => string
}

// Funzione helper per trovare valori nelle colonne
const findValue = (headers: string[], values: string[], possibleNames: string[]): string | undefined => {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => h.includes(name))
    if (index !== -1 && values[index]) {
      return values[index].replace(/"/g, '')
    }
  }
  return undefined
}

// Funzione per determinare automaticamente la tabella di destinazione
const determineTargetTable = (description: string, type: string, amount: number, category?: string): 'transactions' | 'refunds' | 'fund_transfers' => {
  const desc = description.toLowerCase()
  const cat = category?.toLowerCase() || ''
  
  // Prima controlla la categoria (più affidabile)
  if (cat) {
    // Rileva rimborsi dalla categoria
    if (cat.includes('rimborso') || cat.includes('refund') || cat.includes('storno') || 
        cat.includes('annullamento') || cat.includes('reso') || cat.includes('credito')) {
      return 'refunds'
    }
    
    // Rileva trasferimenti dalla categoria
    if (cat.includes('trasferimento') || cat.includes('bonifico') || cat.includes('transfer') || 
        cat.includes('giroconto') || cat.includes('versamento') || cat.includes('prelievo') ||
        cat.includes('deposito') || cat.includes('ricarica') || cat.includes('pagamento')) {
      return 'fund_transfers'
    }
  }
  
  // Fallback: controlla la descrizione
  if (desc.includes('rimborso') || desc.includes('refund') || desc.includes('storno') || desc.includes('annullamento')) {
    return 'refunds'
  }
  
  if (desc.includes('trasferimento') || desc.includes('bonifico') || desc.includes('transfer') || 
      desc.includes('giroconto') || desc.includes('versamento') || desc.includes('prelievo')) {
    return 'fund_transfers'
  }
  
  // Default: transazione normale
  return 'transactions'
}

const BANK_PARSERS: BankParser[] = [
  // Intesa Sanpaolo
  {
    name: 'Intesa Sanpaolo',
    identifier: 'intesa',
    detectFormat: (headers: string[]) => {
      return headers.some(h => 
        h.toLowerCase().includes('data') && 
        headers.some(h2 => h2.toLowerCase().includes('operazione')) &&
        headers.some(h3 => h3.toLowerCase().includes('dettagli')) &&
        headers.some(h4 => h4.toLowerCase().includes('importo'))
      )
    },
    parseRow: (headers: string[], values: string[]) => {
      const amount = findValue(headers, values, ['importo']) || '';
      const amountNum = parseFloat(amount.replace(',', '.'));
      const description = findValue(headers, values, ['dettagli', 'operazione']) || '';
      const category = findValue(headers, values, ['categoria']);
      const targetTable = determineTargetTable(description, amountNum >= 0 ? 'Entrata' : 'Spesa', amountNum, category);
      
      return {
        date: findValue(headers, values, ['data']) || '',
        description: description,
        amount: amount,
        type: amountNum >= 0 ? 'Entrata' : 'Spesa',
        category: category,
        targetTable: targetTable
      };
    },
    transformAmount: (amount: string) => {
      // Intesa usa formato italiano: -100,00 o 1000,00
      return amount.replace(',', '.')
    },
    transformDate: (date: string) => {
      // Se la data è un numero seriale Excel, convertila
      if (!isNaN(Number(date)) && Number(date) > 1) {
        try {
          // Formula per convertire numero seriale Excel in data
          // Excel conta i giorni dal 1 gennaio 1900, ma ha un bug per l'anno 1900
          const excelDate = new Date((Number(date) - 25569) * 86400 * 1000)
          
          if (!isNaN(excelDate.getTime())) {
            const year = excelDate.getFullYear()
            const month = String(excelDate.getMonth() + 1).padStart(2, '0')
            const day = String(excelDate.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
          }
        } catch (error) {
          console.error('Errore conversione data Excel:', error)
        }
      }
      
      // Converte da DD/MM/YYYY a YYYY-MM-DD
      if (typeof date === 'string' && date.includes('/')) {
        const parts = date.split('/')
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
      }
      
      // Se è già in formato YYYY-MM-DD, restituiscilo così com'è
      if (typeof date === 'string' && date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        return date
      }
      
      return date
    }
  },

  // Revolut
  {
    name: 'Revolut',
    identifier: 'revolut',
    detectFormat: (headers: string[]) => {
      return headers.some(h => h.toLowerCase().includes('type')) && 
             headers.some(h => h.toLowerCase().includes('product')) &&
             headers.some(h => h.toLowerCase().includes('started date')) &&
             headers.some(h => h.toLowerCase().includes('completed date')) &&
             headers.some(h => h.toLowerCase().includes('description')) &&
             headers.some(h => h.toLowerCase().includes('amount')) &&
             headers.some(h => h.toLowerCase().includes('state'))
    },
    parseRow: (headers: string[], values: string[]) => {
      console.log('Parsing Revolut row:', { headers, values }) // Debug
      
      const type = findValue(headers, values, ['type']) || '';
      const description = findValue(headers, values, ['description']) || '';
      const amount = findValue(headers, values, ['amount']) || '';
      const completedDate = findValue(headers, values, ['completed date']) || '';
      const amountNum = parseFloat(amount);
      
      // Mappa il Type di Revolut al tipo di transazione e tabella
      let transactionType = 'expense'; // Default per il database
      let targetTable: 'transactions' | 'refunds' | 'fund_transfers' = 'transactions';
      
      switch (type) {
        case 'TOPUP':
          transactionType = 'transfer';
          targetTable = 'fund_transfers';
          break;
        case 'TRANSFER':
          transactionType = 'transfer';
          targetTable = 'fund_transfers';
          break;
        case 'CARD_PAYMENT':
          transactionType = 'expense';
          targetTable = 'transactions';
          break;
        case 'CARD_REFUND':
          transactionType = 'income';
          targetTable = 'refunds';
          break;
        case 'ATM':
          transactionType = 'expense';
          targetTable = 'transactions';
          break;
        case 'EXCHANGE':
          transactionType = 'transfer';
          targetTable = 'fund_transfers';
          break;
        default:
          // Determina in base al segno dell'importo
          if (amountNum > 0) {
            transactionType = 'income';
          } else {
            transactionType = 'expense';
          }
          targetTable = 'transactions';
      }
      
      const parsedRow = {
        date: completedDate || findValue(headers, values, ['started date']) || '',
        description: description, // Solo la descrizione, senza type
        amount: amount,
        type: transactionType === 'income' ? 'Entrata' : 
              transactionType === 'transfer' ? 'Trasferimento' : 'Spesa',
        code: undefined, // Revolut non ha un codice transazione specifico
        category: undefined, // Revolut non ha categorie predefinite
        subcategory: undefined,
        targetTable: targetTable,
        transactionType: transactionType
      }
      
      console.log('Parsed Revolut row:', parsedRow) // Debug
      return parsedRow
    },
    transformAmount: (amount: string) => {
      // Revolut usa il punto come separatore decimale
      return amount.trim()
    },
    transformDate: (date: string) => {
      // Converte da "2025-05-01 18:18:35" a "2025-05-01"
      if (typeof date === 'string' && date.includes(' ')) {
        return date.split(' ')[0]
      }
      
      // Se è già in formato YYYY-MM-DD, restituiscilo così com'è
      if (typeof date === 'string' && date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        return date
      }
      
      return date
    }
  },

  // PayPal
  {
    name: 'PayPal',
    identifier: 'paypal',
    detectFormat: (headers: string[]) => {
      return headers.some(h => h.toLowerCase().includes('data')) && 
             headers.some(h => h.toLowerCase().includes('ora')) &&
             headers.some(h => h.toLowerCase().includes('descrizione')) &&
             (headers.some(h => h.toLowerCase().includes('lordo')) || headers.some(h => h.toLowerCase().includes('netto'))) &&
             headers.some(h => h.toLowerCase().includes('codice transazione'))
    },
    parseRow: (headers: string[], values: string[]) => {
      console.log('Parsing PayPal row:', { headers, values }) // Debug
      
      // PayPal usa "Netto" come importo finale della transazione
      const nettoAmount = findValue(headers, values, ['netto']) || '';
      const baseDescription = findValue(headers, values, ['descrizione', 'description']) || '';
      const senderName = findValue(headers, values, ['nome']) || '';
      const transactionCode = findValue(headers, values, ['codice transazione']) || '';
      const amountNum = parseFloat(nettoAmount.replace(',', '.'));
      
      // Combina descrizione e nome per maggiore chiarezza
      let fullDescription = baseDescription;
      if (senderName && senderName.trim() !== '') {
        fullDescription = `${baseDescription} - ${senderName}`;
      }
      
      const targetTable = determineTargetTable(fullDescription, amountNum >= 0 ? 'Entrata' : 'Spesa', amountNum);
      
      const parsedRow = {
        date: findValue(headers, values, ['data', 'date']) || '',
        description: fullDescription,
        amount: nettoAmount,
        type: amountNum >= 0 ? 'Entrata' : 'Spesa',
        code: transactionCode,
        category: undefined, // PayPal non ha categorie predefinite
        subcategory: undefined,
        targetTable: targetTable
      }
      
      console.log('Parsed PayPal row:', parsedRow) // Debug
      return parsedRow
    },
    transformAmount: (amount: string) => {
      // PayPal usa la virgola come separatore decimale
      return amount.replace(',', '.').trim()
    },
    transformDate: (date: string) => {
      // Converte da "5/5/2025" a "2025-05-05"
      if (typeof date === 'string' && date.includes('/')) {
        const parts = date.split('/')
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0')
          const month = parts[1].padStart(2, '0')
          const year = parts[2]
          return `${year}-${month}-${day}`
        }
      }
      
      // Se è già in formato YYYY-MM-DD, restituiscilo così com'è
      if (typeof date === 'string' && date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        return date
      }
      
      return date
    }  },

  // Postepay
  {
    name: 'Postepay',
    identifier: 'postepay',
    detectFormat: (headers: string[]) => {
      return headers.some(h => h.toLowerCase().includes('data contabile')) && 
             headers.some(h => h.toLowerCase().includes('data valuta')) &&
             headers.some(h => h.toLowerCase().includes('importo (euro)')) &&
             headers.some(h => h.toLowerCase().includes('descrizione operazioni'))
    },
    parseRow: (headers: string[], values: string[]) => {
      console.log('Parsing Postepay row:', { headers, values }) // Debug
      
      const amount = findValue(headers, values, ['importo (euro)', 'importo']) || '';
      const description = findValue(headers, values, ['descrizione operazioni', 'descrizione']) || '';
      const dataContabile = findValue(headers, values, ['data contabile']) || '';
      const amountNum = parseFloat(amount.replace(',', '.'));
      
      // Determina il tipo di transazione e la tabella di destinazione
      const targetTable = determineTargetTable(description, amountNum >= 0 ? 'Entrata' : 'Spesa', amountNum);
      
      const parsedRow = {
        date: dataContabile,
        description: description,
        amount: amount,
        type: amountNum >= 0 ? 'Entrata' : 'Spesa',
        category: undefined, // Postepay non ha categorie predefinite
        subcategory: undefined,
        targetTable: targetTable
      }
      
      console.log('Parsed Postepay row:', parsedRow) // Debug
      return parsedRow
    },
    transformAmount: (amount: string) => {
      // Postepay usa la virgola come separatore decimale: 10,00
      return amount.replace(',', '.').trim()
    },
    transformDate: (date: string) => {
      // Converte da "22/05/2025" a "2025-05-22"
      if (typeof date === 'string' && date.includes('/')) {
        const parts = date.split('/')
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0')
          const month = parts[1].padStart(2, '0')
          const year = parts[2]
          return `${year}-${month}-${day}`
        }
      }
      
      // Se è un numero seriale Excel, convertilo
      if (!isNaN(Number(date)) && Number(date) > 1) {
        try {
          const excelDate = new Date((Number(date) - 25569) * 86400 * 1000)
          
          if (!isNaN(excelDate.getTime())) {
            const year = excelDate.getFullYear()
            const month = String(excelDate.getMonth() + 1).padStart(2, '0')
            const day = String(excelDate.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
          }
        } catch (error) {
          console.error('Errore conversione data Excel Postepay:', error)
        }
      }
      
      // Se è già in formato YYYY-MM-DD, restituiscilo così com'è
      if (typeof date === 'string' && date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        return date
      }
      
      return date
    }
  },

  // Contanti/Cash tracking
  {
    name: 'Contanti',
    identifier: 'cash',
    detectFormat: (headers: string[]) => {
      return headers.some(h => 
        h.toLowerCase().includes('transaction date') && 
        headers.some(h2 => h2.toLowerCase().includes('category')) &&
        headers.some(h3 => h3.toLowerCase().includes('amount'))
      )
    },
    parseRow: (headers: string[], values: string[]) => {
      // Debug: stampa headers e values per capire il mapping
      console.log('Headers:', headers);
      console.log('Values:', values);
      
      const amount = findValue(headers, values, ['amount (€)', 'amount']) || '';
      const amountNum = parseFloat(amount.replace(/[€,()]/g, ''));
      const description = findValue(headers, values, ['note']) || '';
      const category = findValue(headers, values, ['category']);
      const date = findValue(headers, values, ['transaction date']) || '';
      const targetTable = determineTargetTable(description, amountNum >= 0 ? 'Entrata' : 'Spesa', amountNum, category);
      
      console.log('Parsed data:', { date, description, amount, category });
      
      return {
        date: date,
        description: description,
        amount: amount.replace(/[€()]/g, ''),
        type: amountNum >= 0 ? 'Entrata' : 'Spesa',
        category: category,
        targetTable: targetTable
      };
    },
    transformAmount: (amount: string) => {
      // Rimuove il simbolo € e parentesi e gestisce i numeri negativi
      return amount.replace(/[€()]/g, '').trim()
    },
    transformDate: (date: string) => {
      // Converte da "19 giu 2025, 22:56" a "2025-06-19"
      if (typeof date === 'string' && (date.includes(',') || date.includes(' '))) {
        try {
          // Mappa dei mesi italiani
          const monthMap: {[key: string]: string} = {
            'gen': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'mag': '05', 'giu': '06', 'lug': '07', 'ago': '08',
            'set': '09', 'ott': '10', 'nov': '11', 'dic': '12'
          }
          
          // Estrae "19 giu 2025" dalla stringa "19 giu 2025, 22:56"
          const datePart = date.split(',')[0].trim()
          const parts = datePart.split(' ')
          
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0')
            const monthName = parts[1].toLowerCase()
            const month = monthMap[monthName] || '01'
            const year = parts[2]
            return `${year}-${month}-${day}`
          }
        } catch (error) {
          console.error('Errore conversione data contanti:', error)
        }
      }
      
      // Se è già in formato YYYY-MM-DD, restituiscilo così com'è
      if (typeof date === 'string' && date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        return date
      }
      
      return date
    }
  },

  // Parser generico (fallback)
  {
    name: 'Formato Generico',
    identifier: 'generic',
    detectFormat: () => true, // Sempre vero come fallback
    parseRow: (headers: string[], values: string[]) => ({
      date: findValue(headers, values, ['data', 'date']) || '',
      description: findValue(headers, values, ['descrizione', 'description', 'causale']) || '',
      amount: findValue(headers, values, ['importo', 'amount', 'valore']) || '',
      type: findValue(headers, values, ['tipo', 'type']) || 'Spesa',
      account: findValue(headers, values, ['conto', 'account']),
      category: findValue(headers, values, ['categoria', 'category']),
      subcategory: findValue(headers, values, ['sottocategoria', 'subcategory'])
    })
  }
]

export default function ImportPage() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClientComponentClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const [importData, setImportData] = useState<ImportRow[]>([])
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [detectedBank, setDetectedBank] = useState<BankParser | null>(null)
  const [showInfoPopup, setShowInfoPopup] = useState(false)
  const [userAccounts, setUserAccounts] = useState<Array<{id: string, name: string, type: string}>>([])
  const [userCategories, setUserCategories] = useState<Array<{id: string, name: string}>>([])
  const [userSubcategories, setUserSubcategories] = useState<Array<{id: string, name: string, category_id: string}>>([])
  const [detectedAccount, setDetectedAccount] = useState<string | null>(null)
  const [importStats, setImportStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    errors: 0
  })


  // Carica gli account dell'utente
  const loadUserAccounts = useCallback(async () => {
    if (!user) return

    try {
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, name, type')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setUserAccounts(accounts || [])
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }, [user, supabase])

  // Carica le categorie dell'utente
  const loadUserCategories = useCallback(async () => {
    if (!user) return

    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setUserCategories(categories || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }, [user, supabase])

  // Carica le sottocategorie dell'utente
  const loadUserSubcategories = useCallback(async () => {
    if (!user) return

    try {
      const { data: subcategories, error } = await supabase
        .from('subcategories')
        .select('id, name, category_id')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setUserSubcategories(subcategories || [])
    } catch (error) {
      console.error('Error loading subcategories:', error)
    }
  }, [user, supabase])

  // Rileva automaticamente l'account basandosi sul nome del file
  const detectAccountFromFilename = useCallback((filename: string): string | null => {
    if (!userAccounts.length) return null
    
    const lowerFilename = filename.toLowerCase()
    
    // Mappa delle banche/istituti con i loro possibili nomi nei file
    const bankMappings: {[key: string]: string[]} = {
      'contanti': ['contanti', 'cash', 'contante'],      
      'revolut': ['revolut'],
      'paypal': ['paypal'],
      'intesa': ['intesa', 'sanpaolo', 'intesasanpaolo'],
      'poste': ['poste', 'postepay', 'bancoposta', 'libretto postale'],
      'edenred': ['edenred', 'buoni pasto', 'ticket restaurant'],
    }
    
    // Prima prova a matchare per nome della banca
    for (const [bankKey, variations] of Object.entries(bankMappings)) {
      if (variations.some(variation => lowerFilename.includes(variation))) {
        // Cerca un account dell'utente che contenga il nome della banca
        const matchedAccount = userAccounts.find(account => 
          account.name.toLowerCase().includes(bankKey) ||
          variations.some(v => account.name.toLowerCase().includes(v))
        )
        if (matchedAccount) return matchedAccount.id
      }
    }
    
    // Se non trova una corrispondenza diretta, prova a matchare con i nomi degli account
    for (const account of userAccounts) {
      const accountWords = account.name.toLowerCase().split(' ')
      if (accountWords.some(word => word.length > 3 && lowerFilename.includes(word))) {
        return account.id
      }
    }
    
    return null
  }, [userAccounts])

  // Effetto per caricare gli account quando l'utente è disponibile
  useEffect(() => {
    if (user) {
      loadUserAccounts()
      loadUserCategories()
      loadUserSubcategories()
    }
  }, [loadUserAccounts, loadUserCategories, loadUserSubcategories, user])

  // Effetto per rilevare l'account quando viene caricato un file
  useEffect(() => {
    if (currentFile && userAccounts.length > 0) {
      const detected = detectAccountFromFilename(currentFile.name)
      setDetectedAccount(detected)
    }
  }, [currentFile, detectAccountFromFilename, userAccounts])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const file = event.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const processFile = (file: File) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Formato file non supportato. Utilizza file CSV o Excel (.xlsx, .xls)')
      return
    }

    setCurrentFile(file)
    parseFile(file)
  }

  const parseFile = async (file: File) => {
    setIsUploading(true)
    
    // Rileva l'account dal nome del file
    const detected = detectAccountFromFilename(file.name)
    setDetectedAccount(detected)
    
    try {
      if (file.type === 'text/csv') {
        await parseCSV(file, detected || undefined)
      } else {
        await parseExcel(file, detected || undefined)
      }
    } catch (error) {
      console.error('Error parsing file:', error)
      alert('Errore durante la lettura del file')
    } finally {
      setIsUploading(false)
    }
  }

  const parseCSV = async (file: File, accountId?: string) => {
    const text = await file.text()
    // Rilevamento formato Edenred
    if (text.toLowerCase().includes('edenred') || text.toLowerCase().includes('n. e importo buoni')) {
      alert('I file Edenred sono supportati solo in formato Excel (.xlsx).');
      return;
    }
    
    const lines = text.split('\n').filter(line => line.trim())
    
    // Funzione helper per parsare correttamente CSV con virgolette
    const parseCSVLine = (line: string): string[] => {
      const result = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      // Aggiungi l'ultimo campo
      result.push(current.trim())
      
      return result
    }
    
    // Trova la riga che contiene gli header (cerca colonne come "Date", "Amount", etc.)
    let headerRowIndex = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      if ((line.includes('date') || line.includes('data')) && 
          (line.includes('amount') || line.includes('importo'))) {
        headerRowIndex = i
        break
      }
    }
    
    const headers = parseCSVLine(lines[headerRowIndex]).map(h => h.toLowerCase().replace(/"/g, ''))
    const rows: ImportRow[] = []
    
    console.log('CSV Headers found:', headers) // Debug
    console.log('🔍 Starting bank detection process...') // Debug
    console.log('📁 File name:', file.name) // Debug
    
    // Prima prova a rilevare la banca dal nome del file
    let detectedParser: BankParser | null = null
    const fileName = file.name.toLowerCase()
    
    // Mappa dei nomi delle banche nei file
    const bankFileKeywords: {[key: string]: string[]} = {
      'edenred': ['edenred'],
      'intesa': ['intesa', 'sanpaolo', 'intesasanpaolo'],
      'revolut': ['revolut'],
      'paypal': ['paypal'],
      'postepay': ['postepay', 'poste'],
      'contanti': ['contanti', 'cash']
    }
    
    // Cerca corrispondenze nel nome del file
    for (const parser of BANK_PARSERS) {
      const keywords = bankFileKeywords[parser.identifier] || []
      if (keywords.some(keyword => fileName.includes(keyword))) {
        detectedParser = parser
        setDetectedBank(parser)
        console.log(`✅ DETECTED from filename: ${parser.name}`) // Debug
        break
      }
    }
    
    // Se non trova corrispondenze nel nome del file, usa gli header
    if (!detectedParser) {
      console.log('🔄 No match from filename, checking headers...') // Debug
      for (const parser of BANK_PARSERS) {
        console.log(`Checking parser: ${parser.name} (${parser.identifier})`) // Debug
        if (parser.detectFormat(headers)) {
          detectedParser = parser
          setDetectedBank(parser)
          console.log(`✅ DETECTED from headers: ${parser.name}`) // Debug
          break
        } else {
          console.log(`❌ NOT DETECTED: ${parser.name}`) // Debug
        }
      }    }
    
    // Processa le righe dopo l'header(per altri formati)
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, ''))
      
      console.log(`Row ${i} values:`, values) // Debug
      
      if (values.some(v => v.trim())) { // Salta righe vuote
        if (detectedParser) {
          // Usa il parser specifico della banca
          const parsedRow = detectedParser.parseRow(headers, values)
          const row: ImportRow = {
            id: `row-${i}`,
            date: parsedRow.date || '',
            description: parsedRow.description || '',
            amount: parsedRow.amount || '',
            type: parsedRow.type || 'Spesa',
            account: accountId || undefined,
            category: parsedRow.category,
            subcategory: parsedRow.subcategory,
            targetTable: parsedRow.targetTable || 'transactions',
            status: 'pending',
            // Inizializza i nuovi campi
            code: parsedRow.code || '',
            currency: 'EUR',
            initialAmount: parsedRow.amount || '',
            currentAmount: parsedRow.amount || '',
            note: '',
            transactionType: parsedRow.type || 'expense'
          }
          
          // Applica le trasformazioni se disponibili
          if (detectedParser.transformDate && row.date) {
            row.date = detectedParser.transformDate(row.date)
          }
          if (detectedParser.transformAmount && row.amount) {
            row.amount = detectedParser.transformAmount(row.amount)
          }
          
          rows.push(row)
        } else {
          // Fallback al parser generico
          const description = findValue(headers, values, ['descrizione', 'description', 'causale', 'note']) || '';
          const amount = findValue(headers, values, ['importo', 'amount', 'valore']) || '';
          const amountNum = parseFloat(amount.replace(',', '.'));
          const category = findValue(headers, values, ['categoria', 'category']);
          
          const row: ImportRow = {
            id: `row-${i}`,
            date: findValue(headers, values, ['data', 'date', 'transaction date']) || '',
            description: description,
            amount: amount,
            type: findValue(headers, values, ['tipo', 'type']) || 'Spesa',
            account: accountId || undefined,
            category: category,
            subcategory: findValue(headers, values, ['sottocategoria', 'subcategory']),
            targetTable: determineTargetTable(description, findValue(headers, values, ['tipo', 'type']) || 'Spesa', amountNum, category),
            status: 'pending',
            // Inizializza i nuovi campi
            code: findValue(headers, values, ['codice', 'code']) || '',
            currency: 'EUR',
            initialAmount: amount,
            currentAmount: amount,
            note: '',
            transactionType: 'expense'
          }
          
          rows.push(row)
        }
      }
    }
    
    setImportData(rows)
    setImportStats({
      total: rows.length,
      processed: 0,
      success: 0,
      errors: 0
    })
  }

  const parseExcel = async (file: File, accountId?: string) => {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    if (jsonData.length < 2) {
      alert('Il file Excel deve contenere almeno 2 righe (header e dati)')
      return
    }

    const headers = jsonData[0].map(h => h?.toString().toLowerCase() || '')

    if (headers.some(header => header.includes('n. e importo buoni') || header.includes('edenred'))) {
      const edenredRows = parseEdenredExcel(jsonData, accountId);
      setImportData(edenredRows);
      setImportStats({
        total: edenredRows.length,
        processed: 0,
        success: 0,
        errors: 0
      });
      setDetectedBank({
        name: 'Edenred',
        identifier: 'edenred',
        detectFormat: () => true,
        parseRow: () => ({}),
        transformDate: undefined,
        transformAmount: undefined
      });
      return;
    }

    // Trova la riga che contiene gli header (cerca la prima riga con "Data" e "Importo")
    let headerRowIndex = 0
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i].map(cell => cell?.toString().toLowerCase() || '')
      if (row.some(cell => cell.includes('data')) && row.some(cell => cell.includes('importo'))) {
        headerRowIndex = i
        break
      }
    }
    
    const rows: ImportRow[] = []
    
    console.log('Excel Headers found:', headers) // Debug    console.log('🔍 Starting bank detection process for Excel...') // Debug
    console.log('📁 File name:', file.name) // Debug
    
    // Prima prova a rilevare la banca dal nome del file
    let detectedParser: BankParser | null = null
    const fileName = file.name.toLowerCase()
    
    // Mappa dei nomi delle banche nei file
    const bankFileKeywords: {[key: string]: string[]} = {
      'intesa': ['intesa', 'sanpaolo', 'intesasanpaolo'],
      'revolut': ['revolut'],
      'paypal': ['paypal'],
      'postepay': ['postepay', 'poste'],
      'contanti': ['contanti', 'cash'],
      'edenred': ['edenred', 'buoni pasto', 'ticket restaurant']
    }
    
    // Cerca corrispondenze nel nome del file
    for (const parser of BANK_PARSERS) {
      const keywords = bankFileKeywords[parser.identifier] || []
      if (keywords.some(keyword => fileName.includes(keyword))) {
        detectedParser = parser
        setDetectedBank(parser)
        console.log(`✅ DETECTED from filename: ${parser.name}`) // Debug
        break
      }
    }
    
    // Se non trova corrispondenze nel nome del file, usa gli header
    if (!detectedParser) {
      console.log('🔄 No match from filename, checking headers...') // Debug
      for (const parser of BANK_PARSERS) {
        console.log(`Checking parser: ${parser.name} (${parser.identifier})`) // Debug
        if (parser.detectFormat(headers)) {
          detectedParser = parser
          setDetectedBank(parser)
          console.log(`✅ DETECTED from headers: ${parser.name}`) // Debug
          break
        } else {
          console.log(`❌ NOT DETECTED: ${parser.name}`) // Debug
        }
      }    }
    
    // Processa le righe dopo l'header
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const values = jsonData[i].map(v => v?.toString() || '')
      
      if (values.some(v => v.trim())) { // Salta righe vuote
        if (detectedParser) {
          // Usa il parser specifico della banca
          const parsedRow = detectedParser.parseRow(headers, values)
          const row: ImportRow = {
            id: `row-${i}`,
            date: parsedRow.date || '',
            description: parsedRow.description || '',
            amount: parsedRow.amount || '',
            type: parsedRow.type || 'Spesa',
            account: accountId || undefined,
            category: parsedRow.category,
            subcategory: parsedRow.subcategory,
            targetTable: parsedRow.targetTable || 'transactions',
            status: 'pending',
            // Inizializza i nuovi campi
            code: parsedRow.code || '',
            currency: 'EUR',
            initialAmount: parsedRow.amount || '',
            currentAmount: parsedRow.amount || '',
            note: '',
            transactionType: parsedRow.type || 'expense'
          }
          
          // Applica le trasformazioni se disponibili
          if (detectedParser.transformDate && row.date) {
            console.log('Data originale:', row.date) // Debug
            row.date = detectedParser.transformDate(row.date)
            console.log('Data trasformata:', row.date) // Debug
          }
          if (detectedParser.transformAmount && row.amount) {
            row.amount = detectedParser.transformAmount(row.amount)
          }
          
          rows.push(row)
        } else {
          // Fallback al parser generico
          const description = findValue(headers, values, ['descrizione', 'description', 'causale']) || '';
          const amount = findValue(headers, values, ['importo', 'amount', 'valore']) || '';
          const amountNum = parseFloat(amount.replace(',', '.'));
          const category = findValue(headers, values, ['categoria', 'category']);
          
          const row: ImportRow = {
            id: `row-${i}`,
            date: findValue(headers, values, ['data', 'date']) || '',
            description: description,
            amount: amount,
            type: findValue(headers, values, ['tipo', 'type']) || 'Spesa',
            account: accountId || undefined,
            category: category,
            subcategory: findValue(headers, values, ['sottocategoria', 'subcategory']),
            targetTable: determineTargetTable(description, findValue(headers, values, ['tipo', 'type']) || 'Spesa', amountNum, category),
            status: 'pending',
            // Inizializza i nuovi campi
            code: findValue(headers, values, ['codice', 'code']) || '',
            currency: 'EUR',
            initialAmount: amount,
            currentAmount: amount,
            note: '',
            transactionType: 'expense'
          }
          
          rows.push(row)
        }
      }
    }
    
    setImportData(rows)
    setImportStats({
      total: rows.length,
      processed: 0,
      success: 0,
      errors: 0
    })
  }

  // --- INIZIO: Funzione parseEdenredExcel aggiornata ---
  function parseEdenredExcel(jsonData: string[][], accountId?: string): ImportRow[] {
    let headerRowIndex = 0;
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i].map(cell => cell?.toString().toLowerCase() || '');
      if (row.some(cell => cell.includes('data')) && row.some(cell => cell.includes('importo'))) {
        headerRowIndex = i;
        break;
      }
    }
    const rows: ImportRow[] = [];
    const grouped: { [key: string]: { date: string, description: string, amount: number, type: string, transactionType: string } } = {};
    const headers = jsonData[headerRowIndex].map(h => h?.toString().toLowerCase() || '');
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const values = jsonData[i].map(v => v?.toString() || '');
      const dataOraRaw = values[0]?.trim();
      if (!dataOraRaw) continue;
      // Estrai data e ora (es: "21/06/2025 12:34")
      let dataISO = '';
      let ora = '';
      const match = dataOraRaw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
      if (match) {
        const giorno = match[1].padStart(2, '0');
        const mese = match[2].padStart(2, '0');
        const anno = match[3];
        dataISO = `${anno}-${mese}-${giorno}`;
        ora = match[4] || '';
      } else if (dataOraRaw.match(/^\d{4}-\d{2}-\d{2}/)) {
        // Già in formato ISO
        dataISO = dataOraRaw.split(' ')[0];
        ora = (dataOraRaw.split(' ')[1] || '').trim();
      } else {
        continue; // Data non valida
      }
      // Parsing importo: pattern "N da €X,XX"
      let amount = 0;
      const importoStr = values.find(v => v.includes('€')) || '';
      const matchImporto = importoStr.match(/(\d+)\s*da\s*€\s*([\d,.]+)/i);
      if (matchImporto) {
        const n = parseInt(matchImporto[1], 10);
        const val = parseFloat(matchImporto[2].replace('.', '').replace(',', '.'));
        amount = n * val;
      } else {
        // Fallback: cerca solo il valore
        const fallback = importoStr.match(/€\s*([\d,.]+)/);
        if (fallback) amount = parseFloat(fallback[1].replace('.', '').replace(',', '.'));
      }
      // Tipo movimento: di solito seconda colonna
      const tipoMov = (values[1] || '').toLowerCase();
      let tipo = 'Spesa';
      let transactionType = 'expense';
      if (tipoMov.includes('utilizzo')) {
        amount = -Math.abs(amount);
        tipo = 'Acquisto'; // Cambiato da 'Spesa' a 'Acquisto'
        transactionType = 'expense';
      } else if (tipoMov.includes('ordine cloud')) {
        amount = Math.abs(amount);
        tipo = 'Ricarica'; // Cambiato da 'Entrata' a 'Ricarica'
        transactionType = 'income';
      }
      // Descrizione
      let description = values[1]?.toString() || '';
      if (tipoMov.includes('ordine cloud')) {
        // Calcola mese precedente rispetto a dataISO
        const [anno, mese, giorno] = dataISO.split('-');
        let meseNum = parseInt(mese, 10) - 1;
        let annoNum = parseInt(anno, 10);
        if (meseNum === 0) {
          meseNum = 12;
          annoNum -= 1;
        }
        const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        const meseStr = mesi[meseNum - 1];
        description = `Retribuzione ${meseStr} ${annoNum}: Buoni Pasto`;
      } else if (tipoMov.includes('utilizzo')) {
        // Se "Utilizzo", prendi il campo dettagli/dettaglio per intero
        const dettaglioIdx = headers.findIndex((h: string) => h.includes('dettaglio'));
        if (dettaglioIdx !== -1 && values[dettaglioIdx]) {
          description = values[dettaglioIdx].toString().trim();
        } else {
          description = '';
        }
      } else {
        // Logica attuale per altri casi
        const dettaglioIdx = values.findIndex(v => v.toLowerCase().includes('dettaglio') || v.toLowerCase().includes('dettagli'));
        if (typeof dettaglioIdx !== 'undefined' && dettaglioIdx !== -1 && values[dettaglioIdx]) {
          description = values[dettaglioIdx].toString().trim();
        } else {
          let matchDesc = description.match(/Utilizzo BUONI\/VOUCHER presso\s*(.*)/i);
          if (matchDesc) {
            description = matchDesc[1] ? matchDesc[1].trim() : '';
          } else {
            matchDesc = description.match(/Ordine Cloud\s*(.*)/i);
            if (matchDesc) {
              description = matchDesc[1] ? matchDesc[1].trim() : '';
            }
          }
        }
      }
      const groupKey = ora ? `${dataISO} ${ora}` : dataISO;
      if (!grouped[groupKey]) {
        grouped[groupKey] = { date: dataISO, description, amount, type: tipo, transactionType };
      } else {
        grouped[groupKey].amount += amount;
      }
    }
    // Crea righe finali
    Object.values(grouped).forEach((g, idx) => {
      // Imposta la categoria e sottocategoria in base al tipo
      let categoria = '';
      let sottocategoria = '';
      if (g.type === 'Acquisto') {
        categoria = 'GROCERY';
        sottocategoria = 'Supermercato';
      } else if (g.type === 'Ricarica') {
        categoria = 'INCOME & SALARY';
        sottocategoria = 'Bonus';
      }
      rows.push({
        id: `edenred-${idx}`,
        date: g.date,
        description: g.description,
        amount: g.amount.toFixed(2),
        type: g.type,
        account: accountId || undefined,
        category: categoria, // Categoria dinamica
        subcategory: sottocategoria, // Sottocategoria dinamica
        targetTable: 'transactions',
        status: 'pending',
        code: '',
        currency: 'EUR',
        initialAmount: g.amount.toFixed(2),
        currentAmount: g.amount.toFixed(2),
        note: '',
        transactionType: g.type,
      });
    });
    return rows;
  }
  // --- FINE: Funzione parseEdenredExcel aggiornata ---

  const validateRow = (row: ImportRow): string[] => {
    const errors: string[] = []
    
    // Valida data
    if (!row.date) {
      errors.push('Data mancante')
    } else {
      const date = new Date(row.date)
      if (isNaN(date.getTime())) {
        errors.push('Formato data non valido')
      }
    }
    
    // Valida descrizione
    if (!row.description || row.description.trim().length === 0) {
      errors.push('Descrizione mancante')
    }
    
    // Valida categoria (se specificata, deve esistere nel database)
    if (row.category && row.category.trim() !== '') {
      const categoryExists = userCategories.some(cat => 
        cat.name.toLowerCase() === row.category?.toLowerCase()
      )
      if (!categoryExists) {
        errors.push('Categoria non valida - Seleziona da quelle disponibili')
      }
    }
    
    // Valida sottocategoria (se specificata, deve esistere e appartenere alla categoria)
    if (row.subcategory && row.subcategory.trim() !== '') {
      if (!row.category || row.category.trim() === '') {
        errors.push('Sottocategoria specificata senza categoria')
      } else {
        const category = userCategories.find(cat => 
          cat.name.toLowerCase() === row.category?.toLowerCase()
        )
        if (category) {
          const subcategoryExists = userSubcategories.some(subcat => 
            subcat.name.toLowerCase() === row.subcategory?.toLowerCase() && 
            subcat.category_id === category.id
          )
          if (!subcategoryExists) {
            errors.push('Sottocategoria non valida per questa categoria')
          }
        }
      }
    }
    
    // Validazioni specifiche per tipo di tabella
    switch (row.targetTable) {
      case 'transactions':
        // Valida importo iniziale e corrente
        if (!row.initialAmount || row.initialAmount === '') {
          errors.push('Importo iniziale mancante')
        } else {
          const initialAmount = parseFloat(row.initialAmount.toString().replace(',', '.'))
          if (isNaN(initialAmount)) {
            errors.push('Importo iniziale non valido')
          }
        }
        
        if (!row.currentAmount || row.currentAmount === '') {
          errors.push('Importo corrente mancante')
        } else {
          const currentAmount = parseFloat(row.currentAmount.toString().replace(',', '.'))
          if (isNaN(currentAmount)) {
            errors.push('Importo corrente non valido')
          }
        }
        
        // Valida tipo transazione
        if (row.transactionType && !['income', 'expense', 'transfer'].includes(row.transactionType)) {
          errors.push('Tipo transazione non valido')
        }
        break;
        
      case 'refunds':
        // Valida importi per rimborsi
        if (!row.initialAmount || row.initialAmount === '') {
          errors.push('Importo iniziale mancante')
        } else {
          const initialAmount = parseFloat(row.initialAmount.toString().replace(',', '.'))
          if (isNaN(initialAmount)) {
            errors.push('Importo iniziale non valido')
          }
        }
        
        if (!row.currentAmount || row.currentAmount === '') {
          errors.push('Importo corrente mancante')  
        } else {
          const currentAmount = parseFloat(row.currentAmount.toString().replace(',', '.'))
          if (isNaN(currentAmount)) {
            errors.push('Importo corrente non valido')
          }
        }
        break;
        
      case 'fund_transfers':
        // Valida importo per trasferimenti
        if (!row.amount || row.amount === '') {
          errors.push('Importo mancante')
        } else {
          const amount = parseFloat(row.amount.toString().replace(',', '.'))
          if (isNaN(amount)) {
            errors.push('Importo non valido')
          }
        }
        break;
        
      default:
        // Fallback per importo generico
        if (!row.amount) {
          errors.push('Importo mancante')
        } else {
          const amount = parseFloat(row.amount.toString().replace(',', '.'))
          if (isNaN(amount)) {
            errors.push('Importo non valido')
          }
        }
    }
    
    return errors
  }

  const processImport = async () => {
    if (!user || importData.length === 0) return

    setIsUploading(true)
    let successCount = 0
    let errorCount = 0

    const updatedData = [...importData]

    for (let i = 0; i < updatedData.length; i++) {
      const row = updatedData[i]
      const errors = validateRow(row)

      if (errors.length > 0) {
        row.status = 'error'
        row.errors = errors
        errorCount++
      } else {
        try {
          // Prepara i dati per l'inserimento
          const transactionDate = new Date(row.date).toISOString().split('T')[0]
          
          // Converte nomi di categorie e sottocategorie in ID
          let categoryId: string | null = null
          let subcategoryId: string | null = null
          
          if (row.category && row.category.trim() !== '') {
            const category = userCategories.find(cat => 
              cat.name.toLowerCase() === row.category?.toLowerCase()
            )
            if (category) {
              categoryId = category.id
              
              // Se c'è anche una sottocategoria, cerca l'ID
              if (row.subcategory && row.subcategory.trim() !== '') {
                const subcategory = userSubcategories.find(sub => 
                  sub.name.toLowerCase() === row.subcategory?.toLowerCase() && 
                  sub.category_id === category.id
                )
                if (subcategory) {
                  subcategoryId = subcategory.id
                }
              }
            }
          }
          
          let insertData: Record<string, unknown> = {
            user_id: user.id,
          }
          
          // Configura i dati basandosi sulla tabella di destinazione
          if (row.targetTable === 'transactions') {
            const initialAmount = parseFloat((row.initialAmount || row.amount).toString().replace(',', '.'))
            const currentAmount = parseFloat((row.currentAmount || row.amount).toString().replace(',', '.'))
            
            insertData = {
              ...insertData,
              transaction_date: transactionDate,
              transaction_type: row.transactionType || 'expense',
              transaction_details: row.description.trim(),
              transaction_code: row.code || null,
              account_id: row.account || null,
              category_id: categoryId,
              subcategory_id: subcategoryId,
              currency: row.currency || 'EUR',
              initial_amount: initialAmount,
              current_amount: currentAmount,
              transaction_note: row.note || null,
              is_refunded: false
            }
          } else if (row.targetTable === 'refunds') {
            const initialAmount = parseFloat((row.initialAmount || row.amount).toString().replace(',', '.'))
            const currentAmount = parseFloat((row.currentAmount || row.amount).toString().replace(',', '.'))
            
            insertData = {
              ...insertData,
              refund_date: transactionDate,
              refund_details: row.description.trim(),
              refund_code: row.code || null,
              account_id: row.account || null,
              currency: row.currency || 'EUR',
              initial_amount: Math.abs(initialAmount),
              current_amount: Math.abs(currentAmount)
            }
          } else if (row.targetTable === 'fund_transfers') {
            const amount = parseFloat(row.amount.toString().replace(',', '.'))
            
            insertData = {
              ...insertData,
              funds_transfer_date: transactionDate,
              funds_transfer_details: row.description.trim(),
              funds_transfer_code: row.code || null,
              account_id: row.account || null,
              currency: row.currency || 'EUR',
              amount: Math.abs(amount)
            }
          }
          
          // Inserisci nella tabella appropriata
          const { error } = await supabase
            .from(row.targetTable)
            .insert(insertData)

          if (error) throw error

          row.status = 'success'
          successCount++
        } catch (error) {
          console.error('Error inserting transaction:', error)
          row.status = 'error'
          row.errors = ['Errore durante il salvataggio']
          errorCount++
        }
      }

      // Aggiorna i stats in tempo reale
      setImportStats(prev => ({
        ...prev,
        processed: i + 1,
        success: successCount,
        errors: errorCount
      }))

      setImportData([...updatedData])
    }

    setIsUploading(false)
  }

  const clearImport = () => {
    setImportData([])
    setCurrentFile(null)
    setDetectedBank(null)
    setImportStats({ total: 0, processed: 0, success: 0, errors: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const loadNewFile = () => {
    clearImport()
    fileInputRef.current?.click()
  }

  const updateRow = (rowId: string, field: keyof ImportRow, value: string) => {
    setImportData(prevData =>
      prevData.map(row => {
        if (row.id === rowId) {
          const updatedRow = { ...row, [field]: value }
          
          // Se stiamo aggiornando l'amount, sincronizza initialAmount e currentAmount
          if (field === 'amount') {
            if (row.targetTable === 'transactions' || row.targetTable === 'refunds') {
              updatedRow.initialAmount = value
              updatedRow.currentAmount = value
            }
          }
          
          return updatedRow
        }
        return row
      })
    )
  }

  const deleteRow = (rowId: string) => {
    setImportData(prevData => prevData.filter (row => row.id !== rowId))
    
    // Aggiorna anche le statistiche
    const newTotal = importData.length - 1
    setImportStats(prev => ({
      ...prev,
      total: newTotal
    }))
  }

  // Funzione per renderizzare le celle in base al tipo di campo e tabella
  const renderCell = (row: ImportRow, columnKey: string): ReactNode => {
    const baseInputClasses = "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500";
    // DICHIARAZIONI VARIABILI DI SUPPORTO GLOBALI ALLO SCOPE DELLA FUNZIONE
    const rowCategoryStr = (row.category ?? '').toString().toLowerCase();
    const rowSubcategoryStr = (row.subcategory ?? '').toString().toLowerCase();
    
    switch (columnKey) {
      case 'actions':
        return (
          <div className="flex items-center justify-center">
            <button
              onClick={() => deleteRow(row.id)}
              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title="Elimina riga"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );

      case 'status':
        if (row.status === 'pending') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              In attesa
            </span>
          );
        }
        if (row.status === 'success') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Importato
            </span>
          );
        }
        if (row.status === 'error') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Errore
            </span>
          );
        }
        break;

      case 'targetTable':
        return (
          <select
            value={row.targetTable}
            onChange={(e) => updateRow(row.id, 'targetTable', e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="transactions">Transazioni</option>
            <option value="refunds">Rimborsi</option>
            <option value="fund_transfers">Trasferimenti</option>
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={row.date}
            onChange={(e) => updateRow(row.id, 'date', e.target.value)}
            className={baseInputClasses}
          />
        );

      case 'transactionType':
        // Opzioni tipo transazione personalizzate
        const tipoOptions = [
          'Abbonamento', 'Acquisto', 'AZIONE', 'Bonifico', 'Buono fruttifero',
          'Cancellazione rimborso', 'Commissione', 'Competenze', 'Delivery', 'Eccesso Rimborso',
          'Entrata', 'ETF', 'Imposte', 'Iscrizione', 'Ordine', 'Ordine cloud', 'Prelievo',
          'Quattordicesima', 'Rata', 'Refund', 'Ricarica', 'Spesa', 'Stipendio', 'TFR', 'Tredicesima'
        ];
        return (
          <select
            value={row.transactionType || row.type || ''}
            onChange={(e) => updateRow(row.id, 'transactionType', e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleziona</option>
            {tipoOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'description':
        return (
          <div>
            <textarea
              value={row.description}
              onChange={(e) => updateRow(row.id, 'description', e.target.value)}
              className={`${baseInputClasses} min-w-[200px]`}
              rows={2}
              placeholder="Dettagli transazione"
            />
            {row.errors && row.errors.length > 0 && (
              <div className="text-xs text-red-600 mt-1">
                {row.errors.join(', ')}
              </div>
            )}
          </div>
        );

      case 'code':
        return (
          <input
            type="text"
            value={row.code || ''}
            onChange={(e) => updateRow(row.id, 'code', e.target.value)}
            className={baseInputClasses}
            placeholder="Codice"
          />
        );

      case 'account':
        return (
          <select
            value={row.account || ''}
            onChange={(e) => updateRow(row.id, 'account', e.target.value)}
            className="min-w-[150px] px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleziona account</option>
            {userAccounts.length === 0 ? (
              <option disabled>Nessun account configurato</option>
            ) : (
              userAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type.replace('_', ' ')})
                </option>
              ))
            )}
          </select>
        );

      case 'category':
        // Controlla se la categoria dal file esiste nel database
        const currentCategoryExists = row.category && Array.isArray(userCategories) && userCategories.some(cat => 
          cat.name.toLowerCase() === rowCategoryStr
        )
        const hasInvalidCategory = row.category && !currentCategoryExists
        return (
          <div>
            <select
              value={currentCategoryExists ? row.category : ''}
              onChange={(e) => updateRow(row.id, 'category', e.target.value)}
              className={`min-w-[150px] px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasInvalidCategory ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Seleziona categoria</option>
              {userCategories.length === 0 ? (
                <option disabled>Nessuna categoria configurata</option>
              ) : (
                userCategories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))
              )}
            </select>
            {hasInvalidCategory && (
              <div className="text-xs text-red-600 mt-1">
                "{row.category}" non è valida - Seleziona da quelle disponibili
              </div>
            )}
          </div>
        );

      case 'subcategory':
        // Trova la categoria selezionata per filtrare le sottocategorie
        const selectedCategory = userCategories.find(cat => 
          cat.name.toLowerCase() === rowCategoryStr
        )
        const availableSubcategories = selectedCategory 
          ? userSubcategories.filter(sub => sub.category_id === selectedCategory.id)
          : []
        const currentSubcategoryExists = row.subcategory && availableSubcategories.some(sub => 
          sub.name.toLowerCase() === rowSubcategoryStr
        )
        const hasInvalidSubcategory = row.subcategory && !currentSubcategoryExists && selectedCategory
        return (
          <div>
            <select
              value={currentSubcategoryExists ? row.subcategory : ''}
              onChange={(e) => updateRow(row.id, 'subcategory', e.target.value)}
              className={`min-w-[150px] px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasInvalidSubcategory ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={!selectedCategory}
            >
              <option value="">
                {!selectedCategory ? 'Prima seleziona una categoria' : 'Seleziona sottocategoria'}
              </option>
              {availableSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.name}>
                  {subcategory.name}
                </option>
              ))}
            </select>
            {hasInvalidSubcategory && (
              <div className="text-xs text-red-600 mt-1">
                "{row.subcategory}" non è valida per questa categoria
              </div>
            )}
            {!selectedCategory && row.subcategory && (
              <div className="text-xs text-orange-600 mt-1">
                Seleziona prima una categoria
              </div>
            )}
          </div>
        );

      case 'currency':
        return (
          <select
            value={row.currency || 'EUR'}
            onChange={(e) => updateRow(row.id, 'currency', e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        );

      case 'amount':
        return (
          <input
            type="number"
            step="0.01"
            value={row.amount}
            onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'note':
        return (
          <input
            type="text"
            value={row.note || ''}
            onChange={(e) => updateRow(row.id, 'note', e.target.value)}
            className={`${baseInputClasses} min-w-[150px]`}
            placeholder="Note aggiuntive"
          />
        );

      default:
        return <span>-</span>; // Fallback per garantire un ReactNode valido
    }
  };

  const downloadTemplate = () => {
    const template = `data,descrizione,importo,tipo,categoria,sottocategoria
2025-01-01,"Spesa supermercato",-50.00,Spesa,Cibo & Bevande,Supermercato
2025-01-02,"Stipendio",2000.00,Entrata,Lavoro,Stipendio
2025-01-03,"Carburante",-45.50,Spesa,Trasporti,Auto
2025-01-04,"Pranzo ristorante",-25.00,Spesa,Cibo & Bevande,Ristorante
2025-01-05,"Partita padel",-10.00,Spesa,Sport,Padel
2025-01-06,"Rimborso spese",-15.30,Spesa,Varie,Altro`
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_import_mosaiko.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  if (!user) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-500">Devi effettuare il login per utilizzare l'import dati</p>
          </div>
        </div>
      </ModuleLayout>
    )
  }

 return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader 
          title="Import Dati" 
          subtitle={detectedBank ? `Importa da ${detectedBank.name}` : "Importa transazioni da file Excel/CSV"}
          icon={<Upload className="w-6 h-6 text-white" />}
          stats={importData.length > 0 ? [
            {
              label: 'Righe Totali',
              value: importStats.total.toString(),
              color: 'blue'
            },
            {
              label: 'Transazioni',
              value: importData.filter(r => r.targetTable === 'transactions').length.toString(),
              color: 'purple'
            },
            {
              label: 'Rimborsi',
              value: importData.filter(r => r.targetTable === 'refunds').length.toString(),
              color: 'green'
            },
            {
              label: 'Trasferimenti',
              value: importData.filter(r => r.targetTable === 'fund_transfers').length.toString(),
              color: 'orange'
            }
          ] : []}
          actions={[
            ...(importData.length > 0 ? [
              {
                label: 'Nuovo File',
                onClick: loadNewFile,
                icon: <Plus className="w-4 h-4" />,
                color: 'purple' as const,
                disabled: isUploading,
                hideTextOnMobile: true
              },
              {
                label: isUploading ? 'Importando...' : 'Avvia Import',
                onClick: processImport,
                icon: isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />,
                color: 'blue' as const,
                disabled: isUploading || importData.length === 0,
                loading: isUploading
              }
            ] : [])
          ]}
          statusIndicators={[
           {
              type: 'success',
              label: `Banca rilevata: ${detectedBank?.name || 'Nessuna'}`,
              show: !!detectedBank
            },
            {
              type: 'success',
              label: `Account rilevato: ${detectedAccount ? userAccounts.find(acc => acc.id === detectedAccount)?.name : 'Nessuno'}`,
              show: !!detectedAccount
            },
            {
              type: 'warning',
                           label: `Account non rilevato - Seleziona manualmente dalla picklist`,
              show: !!(currentFile && userAccounts.length > 0 && !detectedAccount)
            },
            {
              type: 'warning',
              label: 'Import in corso...',
              show: isUploading
            },
            {
              type: 'success',
              label: 'Import completato',
              show: !isUploading && importStats.processed > 0 && importStats.processed === importStats.total
            }
          ]}
        />

        {/* Resto del contenuto... */}
        {/* Sezione Upload - Solo se non c'è un file caricato */}
        {!currentFile && (
          <div className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 relative">
            <div className="flex itemscenter justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Upload className="w-6 h-6 text-white" />
                                              </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Carica File</h2>
                  <p className="text-gray-600">Supporta file CSV e Excel (.xlsx, .xls)</p>
                </div>
              </div>
              
              {/* Pulsante Info */}
              <button
                onClick={() => setShowInfoPopup(true)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Informazioni formato file"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>

            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="space-y-4">
                <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">Trascina il file qui</p>
                  <p className="text-gray-500">oppure clicca per selezionare</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Seleziona File
                </button>
              </div>
            </div>
            
            {/* Popup Info */}
            {showInfoPopup && (
                           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowInfoPopup(false)}>
                               <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Formato File Supportato</h3>
                    </div>
                                       <button
                      onClick={() => setShowInfoPopup(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4 text-sm text-gray-700">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Colonne Richieste:</h4>
                      <p>• Data, Descrizione, Importo</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Colonne Opzionali:</h4>
                      <p>• Tipo, Categoria, Sottocategoria, Conto</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Formati:</h4>
                      <p>• <strong>Data:</strong> YYYY-MM-DD (es: 2025-01-01)</p>
                      <p>• <strong>Importo:</strong> numeri con punto o virgola (es: -50.00 o 25,50)</p>
                      <p>• <strong>Tipi:</strong> Spesa, Entrata, Trasferimento</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Banche Supportate:</h4>
                      <p>• Contanti, Revolut, PayPal, Postepay, Edenred</p>
                      <p>• Intesa Sanpaolo, UniCredit, Banco BPM, Fineco</p>
                      <p>• Formato generico per altre banche</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-between">
                    <button
                      onClick={downloadTemplate}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Scarica Template
                    </button>
                    <button
                      onClick={() => setShowInfoPopup(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Ho Capito
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Informazioni File Caricato */}
        {currentFile && (
          <div className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-lg rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{currentFile.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{(currentFile.size / 1024).toFixed(1)} KB</span>
                    {detectedBank && (
                      <span className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{detectedBank.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar durante l'import */}
        {isUploading && importStats.total > 0 && (
          <div className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-lg rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Import in corso...</h3>
              <span className="text-sm text-gray-600">
                {importStats.processed} / {importStats.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(importStats.processed / importStats.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Preview Dati */}
        {importData.length > 0 && (
          <div className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-lg rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Preview Dati</h3>
                  <p className="text-gray-600">Tutti i record raggruppati per tabella di destinazione</p>
                </div>
                <div className="text-sm text-gray-500">
                  Totale: {importData.length} record
                </div>
              </div>
            </div>
            
            {/* Raggruppamento per tabella */}
            {(() => {
              const groupedData = importData.reduce<Record<string, ImportRow[]>>((acc, row) => {
                const table = row.targetTable;
                if (!acc[table]) acc[table] = [];
                acc[table].push(row);
                return acc;
              }, {});

              return Object.entries(groupedData).map(([targetTable, rows]: [string, ImportRow[]]) => {
                const tableLabel = targetTable === 'transactions' ? 'Transazioni' :
                                 targetTable === 'refunds' ? 'Rimborsi' : 'Trasferimenti';
                
                // Colonne dinamiche basate sul tipo di tabella
                const getColumns = () => {
                  switch (targetTable) {
                    case 'transactions':
                      return [
                        { key: 'actions', label: 'Azioni' },
                        { key: 'status', label: 'Status' },
                        { key: 'targetTable', label: 'Tabella' },
                        { key: 'date', label: 'Data' },
                        { key: 'transactionType', label: 'Tipo' },
                        { key: 'description', label: 'Dettagli' },
                        { key: 'code', label: 'Codice' },
                        { key: 'account', label: 'Conto' },
                        { key: 'category', label: 'Categoria' },
                        { key: 'subcategory', label: 'Sottocategoria' },
                        { key: 'currency', label: 'Valuta' },
                        { key: 'amount', label: 'Importo' },
                        { key: 'note', label: 'Note' }
                      ];
                    case 'refunds':
                      return [
                        { key: 'actions', label: 'Azioni' },
                        { key: 'status', label: 'Status' },
                        { key: 'targetTable', label: 'Tabella' },
                        { key: 'date', label: 'Data Rimborso' },
                        { key: 'description', label: 'Dettagli' },
                        { key: 'code', label: 'Codice' },
                        { key: 'account', label: 'Conto' },
                        { key: 'currency', label: 'Valuta' },
                        { key: 'amount', label: 'Importo' }
                      ];
                    case 'fund_transfers':
                      return [
                        { key: 'actions', label: 'Azioni' },
                        { key: 'status', label: 'Status' },
                        { key: 'targetTable', label: 'Tabella' },
                        { key: 'date', label: 'Data Trasferimento' },
                        { key: 'description', label: 'Dettagli' },
                        { key: 'code', label: 'Codice' },
                        { key: 'account', label: 'Conto' },
                        { key: 'currency', label: 'Valuta' },
                        { key: 'amount', label: 'Importo' }
                      ];
                    default:
                      return [];
                  }
                };

                const columns = getColumns();

                return (
                  <div key={targetTable} className="border-b border-gray-200 last:border-b-0">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h4 className="text-md font-medium text-gray-900 flex items-center">
                        <span className={`inline-block w-3 h-3 rounded-full mr-3 ${
                          targetTable === 'transactions' ? 'bg-blue-500' :
                          targetTable === 'refunds' ? 'bg-green-500' : 'bg-purple-500'
                        }`}></span>
                        {tableLabel} ({rows.length} record{rows.length !== 1 ? 's' : ''})
                      </h4>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            {columns.map((column) => (
                              <th 
                                key={column.key}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {column.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rows.map((row: ImportRow) => (
                            <tr key={row.id} className={`hover:bg-gray-50 ${row.status === 'error' ? 'bg-red-50' : ''}`}>
                              {columns.map((column) => (
                                <td key={column.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {renderCell(row, column.key)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}
