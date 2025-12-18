// Modulo di parsing per import finanziari
// Contiene funzioni: parseCSV, parseExcel, parseEdenredExcel, costanti e tipi correlati

import type { ImportRow, BankParser } from './types.js';
import * as XLSX from 'xlsx';

// --- Interfaccia per Account ---
interface Account {
  id: string;
  name: string;
  type: string;
}

// --- Funzione helper per creare mapping account ---
const createAccountMappings = (accounts: Account[]): { [key: string]: string } => {
  const mappings: { [key: string]: string } = {};

  // Debug: logga gli account ricevuti
  if (typeof window !== 'undefined' && window.console) {
    console.log('DEBUG createAccountMappings - Account ricevuti:', accounts);
  }

  accounts.forEach(account => {
    const normalizedName = account.name.toUpperCase();
    mappings[normalizedName] = account.id;

    // Debug: logga ogni mapping creato
    if (typeof window !== 'undefined' && window.console) {
      console.log(`DEBUG createAccountMappings - Mapping creato: "${normalizedName}" -> ${account.id}`);
    }
  });

  // Debug: logga il mapping finale
  if (typeof window !== 'undefined' && window.console) {
    console.log('DEBUG createAccountMappings - Mappings finali:', mappings);
  }

  return mappings;
};

// --- Costanti e helper comuni ---

export const TRANSACTION_TYPE_MAP: Record<string, string> = {
  'Spesa': 'expense',
  'Entrata': 'income',
  'Rimborso': 'refund',
  'Trasferimento': 'transfer',
  'Acquisto': 'expense',
  'Ricarica': 'income',
  'Refund': 'refund',
  'Bonifico': 'transfer',
  'Prelievo': 'expense',
  'Stipendio': 'income',
  'Ordine': 'expense',
  'Ordine cloud': 'income',
};

// Funzione helper per trovare un valore dato un header tra possibili nomi
export const findValue = (headers: string[], values: string[], possibleNames: string[]): string | undefined => {
  // Normalizza header e nomi possibili: lowercase, trim, rimuovi spazi
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '').trim();
  const normHeaders = headers.map(h => norm(h));
  for (const name of possibleNames) {
    const idx = normHeaders.findIndex(h => h === norm(name));
    if (idx !== -1 && values[idx]) {
      return values[idx].replace(/"/g, '');
    }
  }
  return undefined;
}

// Funzione per determinare automaticamente la tabella di destinazione
export const determineTargetTable = (description: string, type: string, amount: number, category?: string): 'transactions' | 'refunds' | 'funds_transfer' => {
  const desc = description.toLowerCase();
  const cat = category?.toLowerCase() || '';
  // Prima: refund/annullamento/credito
  if (
    desc.includes('rimborso') || desc.includes('refund') || desc.includes('storno') || desc.includes('annullamento') || desc.includes('reso') ||
    cat.includes('rimborso') || cat.includes('refund') || cat.includes('storno') || cat.includes('annullamento') || cat.includes('reso')
  ) {
    return 'refunds';
  }
  // Poi: trasferimenti/giroconto/bonifico/versamento/prelievo/ricarica/pagamento
  if (
    desc.includes('trasferimento') || desc.includes('fund transfer') || desc.includes('giroconto') || desc.includes('prelievo') || desc.includes('ricarica') ||
    cat.includes('trasferimento') || cat.includes('fund transfer') || cat.includes('giroconto') || cat.includes('bonifico') || cat.includes('versamento') || cat.includes('prelievo')
  ) {
    return 'funds_transfer';
  }
  // Default: sempre transazione
  return 'transactions';
}

// --- BANK_PARSERS ---
export const BANK_PARSERS: BankParser[] = [
  // Intesa Sanpaolo
  {
    name: 'Intesa Sanpaolo',
    identifier: 'intesa',
    detectFormat: (headers: string[]) => {
      const lowerHeaders = headers.map(h => h.toLowerCase())
      const oldFormat = lowerHeaders.some(h => h.includes('data')) &&
        (lowerHeaders.some(h => h.includes('operazione')) || lowerHeaders.some(h => h.includes('dettagli'))) &&
        lowerHeaders.some(h => h.includes('importo'));
      const xmeFormat = lowerHeaders.some(h => h.includes('data operazione')) &&
        lowerHeaders.some(h => h.includes('descrizione operazione')) &&
        lowerHeaders.some(h => h.includes('importo'));
      const genericFormat = lowerHeaders.includes('data') &&
        lowerHeaders.includes('operazione') &&
        lowerHeaders.includes('dettagli') &&
        lowerHeaders.includes('importo');
      return oldFormat || xmeFormat || genericFormat;
    },
    parseRow: (headers: string[], values: string[], accountMappings?: { [key: string]: string }) => {
      // DEBUG: logga header e valori per capire cosa arriva
      if (typeof window !== 'undefined' && window.console) {
        console.log('DEBUG Intesa parseRow headers:', headers);
        console.log('DEBUG Intesa parseRow values:', values);
      }
      let date = ''
      date = findValue(headers, values, ['data operazione', 'data', 'data valuta', 'data registrazione']) || ''
      let description = ''
      description = findValue(headers, values, [
        'descrizione operazione', 'descrizione', 'dettagli', 'operazione', 'causale', 'note', 'dettaglio', 'descrizione causale']) || ''
      let amount = ''
      amount = findValue(headers, values, ['importo', 'importo valuta', 'valore']) || ''
      let category: string | undefined = findValue(headers, values, ['categoria', 'categoria operazione', 'tipo', 'tipologia'])
      let subcategory: string | undefined = undefined;
      const amountNum = parseFloat(amount.replace(',', '.'))
      // Determina il segno corretto
      let signedAmount = amountNum
      if (
        amountNum > 0 && (
          (['spesa', 'acquisto', 'prelievo'].some(k => (category || '').toLowerCase().includes(k))) ||
          (description.toLowerCase().includes('spesa') || description.toLowerCase().includes('acquisto') || description.toLowerCase().includes('prelievo'))
        )
      ) {
        signedAmount = -Math.abs(amountNum)
      } else if (
        amountNum < 0 && (
          (['entrata', 'stipendio', 'ricarica', 'income'].some(k => (category || '').toLowerCase().includes(k))) ||
          (description.toLowerCase().includes('entrata') || description.toLowerCase().includes('stipendio') || description.toLowerCase().includes('ricarica'))
        )
      ) {
        signedAmount = Math.abs(amountNum)
      }
      const targetTable = determineTargetTable(description, signedAmount >= 0 ? 'Entrata' : 'Spesa', signedAmount, category)
      // Gestione caso speciale Stipendi e pensioni
      if (category && category.toLowerCase().includes('stipendi')) {
        // Parsing robusto per dettagli Intesa senza quadre
        // Esempio: COD.DISP. 0125060000355209 ... MESE DI MAGGIO 2025 ... MITT. GAMMA INNOVATION S.R.L.
        let codice = ''
        let mese = ''
        let anno = ''
        let azienda = ''
        // COD.DISP. codice
        const codDispMatch = description.match(/COD\.DISP\.\s*([A-Z0-9]+)/i)
        if (codDispMatch) codice = codDispMatch[1].trim()
        // MESE DI mese anno
        const meseAnnoMatch = description.match(/MESE DI\s+([A-ZÀ-Ùa-zà-ù]+)\s+(\d{4})/i)
        if (meseAnnoMatch) {
          mese = meseAnnoMatch[1].charAt(0).toUpperCase() + meseAnnoMatch[1].slice(1).toLowerCase()
          anno = meseAnnoMatch[2]
        }
        // MITT. azienda (tutto tra MITT. e BENEF. oppure fine stringa)
        const mittMatch = description.match(/MITT\.\s+(.+?)(?:\s+BENEF\.|$)/i)
        if (mittMatch) azienda = mittMatch[1].trim()
        category = 'INCOME & SALARY'
        subcategory = 'Stipendio'
        description = `Retribuzione ${mese} ${anno}: Bonifico A Vostro Favore Disposto Da ${azienda}`
        return {
          date,
          description,
          amount: signedAmount.toString(),
          type: 'Stipendio',
          category,
          subcategory,
          targetTable,
          code: codice
        }
      }
      return {
        date,
        description,
        amount: signedAmount.toString(),
        type: signedAmount >= 0 ? 'Entrata' : 'Spesa',
        category,
        subcategory,
        targetTable,
      }
    },
    transformAmount: (amount: string) => {
      return amount.replace(',', '.')
    },
    transformDate: (date: string) => {
      if (!isNaN(Number(date)) && Number(date) > 1) {
        try {
          const excelDate = new Date((Number(date) - 25569) * 86400 * 1000)
          if (!isNaN(excelDate.getTime())) {
            const year = excelDate.getFullYear()
            const month = String(excelDate.getMonth() + 1).padStart(2, '0')
            const day = String(excelDate.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
          }
        } catch (error) { }
      }
      if (typeof date === 'string' && date.includes('/')) {
        const parts = date.split('/')
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
      }
      if (typeof date === 'string' && date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        return date
      }
      return date
    }
  },
  // Postepay
  {
    name: 'Postepay',
    identifier: 'postepay',
    detectFormat: (headers: string[]) => {
      const lowerHeaders = headers.map(h => h.toLowerCase())
      // Riconoscimento robusto: almeno 2 header tra quelli reali Postepay
      const postepayHeaders = [
        'data contabile',
        'data valuta',
        'importo (euro)',
        'descrizione operazioni',
        'data operazione',
        'descrizione operazione',
        'importo',
        'saldo'
      ];
      let matchCount = 0;
      for (const h of postepayHeaders) {
        if (lowerHeaders.some(lh => lh.includes(h))) matchCount++;
      }
      // Considera Postepay solo se almeno 2 header tipici sono presenti
      return matchCount >= 2;
    },
    parseRow: (headers: string[], values: string[], accountMappings?: { [key: string]: string }) => {
      // Mapping header Postepay: Data Contabile, Data Valuta, Importo (euro), Descrizione operazioni
      const date = findValue(headers, values, ['data contabile', 'data operazione', 'data', 'data valuta']) || '';
      const description = findValue(headers, values, ['descrizione operazioni', 'descrizione operazione', 'descrizione', 'causale', 'dettagli']) || '';
      const amountRaw = findValue(headers, values, ['importo (euro)', 'importo', 'importo valuta', 'valore']) || '';
      const saldo = findValue(headers, values, ['saldo', 'saldo contabile']) || '';
      const category = findValue(headers, values, ['categoria', 'category']);
      const subcategory = findValue(headers, values, ['sottocategoria', 'subcategory']);
      // Postepay: importo negativo = spesa, positivo = entrata
      const amountNum = parseFloat(amountRaw.replace(',', '.'));
      let signedAmount = amountNum;
      if (amountNum > 0 && (description.toLowerCase().includes('spesa') || description.toLowerCase().includes('prelievo'))) {
        signedAmount = -Math.abs(amountNum);
      } else if (amountNum < 0 && (description.toLowerCase().includes('ricarica') || description.toLowerCase().includes('entrata'))) {
        signedAmount = Math.abs(amountNum);
      }
      return {
        date,
        description,
        amount: signedAmount.toString(),
        type: signedAmount >= 0 ? 'Entrata' : 'Spesa',
        category,
        subcategory,
        targetTable: determineTargetTable(description, signedAmount >= 0 ? 'Entrata' : 'Spesa', signedAmount),
        note: saldo ? `Saldo: ${saldo}` : undefined
      };
    },
    transformDate: (date: string) => {
      if (!isNaN(Number(date)) && Number(date) > 1) {
        try {
          const excelDate = new Date((Number(date) - 25569) * 86400 * 1000)
          if (!isNaN(excelDate.getTime())) {
            const year = excelDate.getFullYear()
            const month = String(excelDate.getMonth() + 1).padStart(2, '0')
            const day = String(excelDate.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
          }
        } catch (error) { }
      }
      if (typeof date === 'string' && date.includes('/')) {
        const parts = date.split('/')
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
      }
      if (typeof date === 'string' && date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        return date
      }
      return date
    }
  },
  // Paypal
  {
    name: 'Paypal',
    identifier: 'paypal',
    detectFormat: (headers: string[]) => {
      const lowerHeaders = headers.map(h => h.toLowerCase());
      // Paypal CSV: tipici header inglesi
      return (
        lowerHeaders.includes('date') &&
        (lowerHeaders.includes('name') || lowerHeaders.includes('description')) &&
        (lowerHeaders.includes('amount') || lowerHeaders.includes('net'))
      );
    },
    parseRow: (headers: string[], values: string[], accountMappings?: { [key: string]: string }) => {
      // Paypal: header tipici: Date, Name, Type, Status, Currency, Gross, Fee, Net, Description
      const date = findValue(headers, values, ['date', 'data']) || '';
      const descriptionRaw = findValue(headers, values, ['description', 'descrizione']) || '';
      const name = findValue(headers, values, ['name', 'nome']) || '';
      // Descrizione: description + name
      let description = descriptionRaw;
      if (name && descriptionRaw && !descriptionRaw.includes(name)) {
        description = `${descriptionRaw} - ${name}`;
      } else if (name && !descriptionRaw) {
        description = name;
      }
      // Importo: solo campo Netto (supporta anche 'Netto' con spazi)
      const amountStr = findValue(headers, values, ['net', 'netto', 'netto ', ' netto']) || '';
      let amountNum = parseFloat(amountStr.replace(',', '.'));
      if (isNaN(amountNum)) amountNum = 0;
      // Tipo: entrata se >0, spesa se <0
      const type = amountNum >= 0 ? 'Entrata' : 'Spesa';
      return {
        date,
        description,
        amount: amountNum.toString(),
        type,
        targetTable: determineTargetTable(description, type, amountNum),
      };
    },
    transformDate: (date: string) => {
      // Paypal: normalizza DD/MM/YYYY (italiano) e YYYY-MM-DD in YYYY-MM-DD
      if (typeof date === 'string') {
        // YYYY-MM-DD
        if (date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
          return date;
        }
        // DD/MM/YYYY (italiano Paypal)
        const parts = date.split('/');
        if (parts.length === 3) {
          // Interpreta sempre come DD/MM/YYYY
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      }
      return date;
    },
    transformAmount: (amount: string) => {
      return amount.replace(',', '.');
    }
  },
  // Revolut
  {
    name: 'Revolut',
    identifier: 'revolut',
    detectFormat: (headers: string[]) => {
      const lowerHeaders = headers.map(h => h.toLowerCase());
      // Riconosce header tipici Revolut
      return (
        lowerHeaders.includes('type') &&
        lowerHeaders.includes('description') &&
        lowerHeaders.includes('amount') &&
        lowerHeaders.includes('currency')
      );
    },
    parseRow: (headers: string[], values: string[], accountMappings?: { [key: string]: string }) => {
      // Header tipici: Type, Product, Started Date, Completed Date, Description, Amount, Fee, Currency, State, Balance
      const state = findValue(headers, values, ['state']) || '';
      if (state.toUpperCase() === 'REVERTED') {
        // Riga da ignorare
        return {};
      }
      const typeRaw = findValue(headers, values, ['type']) || '';
      const description = findValue(headers, values, ['description']) || '';
      const amountStr = findValue(headers, values, ['amount']) || '';
      const date = findValue(headers, values, ['Started Date']) || '';
      const currency = findValue(headers, values, ['currency']) || 'EUR';
      const productRaw = findValue(headers, values, ['product']) || '';

      // Debug: logga l'importo grezzo prima del parsing
      if (typeof window !== 'undefined' && window.console) {
        console.log('DEBUG Revolut - Amount raw:', amountStr, 'Type:', typeRaw);
      }

      // Parsing robusto dell'importo preservando il segno
      let amountNum = 0;
      if (amountStr) {
        // Rimuovi spazi e normalizza virgole/punti
        const cleanAmount = amountStr.trim().replace(',', '.');
        amountNum = parseFloat(cleanAmount);
        if (isNaN(amountNum)) amountNum = 0;
      }
      // Normalizza data: YYYY-MM-DD
      let dateISO = date;
      if (date && date.length >= 10) {
        // Prende solo la parte data se c'è anche l'orario
        dateISO = date.slice(0, 10);
      }
      // Determina tipo transazione picklist e normalizzato
      let type = '';
      const category = findValue(headers, values, ['categoria', 'category']);
      const subcategory = findValue(headers, values, ['sottocategoria', 'subcategory']);
      let transactionType = '';
      let targetTable: 'transactions' | 'refunds' | 'funds_transfer' = 'transactions';
      // Mapping robusto - per i TRANSFER NON tocchiamo MAI il segno
      switch (typeRaw.toUpperCase()) {
        case 'CARD_PAYMENT':
          type = 'Spesa';
          transactionType = 'Spesa';
          targetTable = 'transactions';
          // Per i pagamenti con carta, forza negativo
          amountNum = -Math.abs(amountNum);
          break;
        case 'TRANSFER':
          // PER I TRASFERIMENTI: NON TOCCARE MAI IL SEGNO ORIGINALE!
          type = amountNum >= 0 ? 'Entrata' : 'Spesa';
          transactionType = amountNum >= 0 ? 'Entrata' : 'Spesa';
          targetTable = 'funds_transfer';
          // NON modificare amountNum - lascia il segno originale
          break;
        case 'TOPUP':
          type = 'Ricarica';
          transactionType = 'Ricarica';
          targetTable = 'funds_transfer';
          // Per le ricariche, forza positivo
          amountNum = Math.abs(amountNum);
          break;
        case 'CARD_REFUND':
          type = 'Rimborso';
          transactionType = 'Rimborso';
          targetTable = 'refunds';
          // Per i rimborsi, forza positivo
          amountNum = Math.abs(amountNum);
          break;
        default:
          // Fallback: mantieni il segno originale
          type = amountNum >= 0 ? 'Entrata' : 'Spesa';
          transactionType = amountNum >= 0 ? 'Entrata' : 'Spesa';
          targetTable = 'transactions';
      }
      // Determina account ID basandosi sul campo Product di Revolut
      let accountId = undefined;
      const productUpper = productRaw.toUpperCase();

      // HARDCODED FIX: Mapping diretto per Revolut
      if (productUpper === 'SAVINGS') {  // Era SAVING, ora SAVINGS
        accountId = '8f2b03f3-9316-48d6-936b-0960080f2296'; // ID del tuo account REVOLUT SAVINGS
      }

      // Fallback al mapping normale se disponibile
      if (!accountId && accountMappings && productRaw) {
        if (productUpper === 'CURRENT') {
          // Cerca un account Revolut principale (non Savings)
          accountId = accountMappings['REVOLUT'] ||
            Object.keys(accountMappings).find(name =>
              name.includes('REVOLUT') && !name.includes('SAVING')
            ) ? accountMappings[Object.keys(accountMappings).find(name =>
              name.includes('REVOLUT') && !name.includes('SAVING')
            )!] : undefined;
        } else if (productUpper === 'SAVINGS') {  // Era SAVING, ora SAVINGS
          // Cerca un account Revolut Savings
          accountId = accountMappings['REVOLUT SAVINGS'] ||
            accountMappings['REVOLUT SAVING'] ||
            Object.keys(accountMappings).find(name =>
              name.includes('REVOLUT') && name.includes('SAVING')
            ) ? accountMappings[Object.keys(accountMappings).find(name =>
              name.includes('REVOLUT') && name.includes('SAVING')
            )!] : undefined;
        }
      }

      // Debug: logga l'account trovato e l'importo finale
      if (typeof window !== 'undefined' && window.console) {
        console.log('DEBUG Revolut - Product:', productUpper, '-> Account ID:', accountId);
        console.log('DEBUG Revolut - Final amount:', amountNum, 'Type:', type, 'TransactionType:', transactionType, 'TargetTable:', targetTable);
        console.log('DEBUG Revolut - Returning amount as string:', amountNum.toString());
      }

      return {
        date: dateISO,
        description,
        amount: amountNum.toString(),
        type,
        account: accountId,
        category,
        subcategory,
        targetTable,
        transactionType,
        currency
      };
    },
    transformDate: (date: string) => {
      // Normalizza sempre in YYYY-MM-DD
      if (typeof date === 'string' && date.length >= 10) {
        return date.slice(0, 10);
      }
      return date;
    },
    transformAmount: (amount: string) => {
      // Per Revolut: NON fare nessuna trasformazione, restituisci così com'è
      return amount;
    }
  },
  // ...altri parser da page.tsx...
];

// --- parseCSV ---
export async function parseCSV(file: File, accountId?: string, setDetectedBank?: (parser: BankParser | null) => void, setImportData?: (rows: ImportRow[]) => void, setImportStats?: (stats: any) => void, accounts?: Account[]) {
  const text = await file.text();
  if (text.toLowerCase().includes('edenred') || text.toLowerCase().includes('n. e importo buoni')) {
    alert('I file Edenred sono supportati solo in formato Excel (.xlsx).');
    return;
  }
  const lines = text.split('\n').filter(line => line.trim());
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  let headerRowIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if ((line.includes('date') || line.includes('data')) &&
      (line.includes('amount') || line.includes('importo'))) {
      headerRowIndex = i;
      break;
    }
  }
  const headers = parseCSVLine(lines[headerRowIndex]).map(h => h.toLowerCase().replace(/"/g, ''));
  const rows: ImportRow[] = [];
  const fileName = file.name.toLowerCase();
  const bankFileKeywords: { [key: string]: string[] } = {
    'edenred': ['edenred'],
    'intesa': ['intesa', 'sanpaolo', 'intesasanpaolo', 'contoxme', 'conto xme'],
    'revolut': ['revolut'],
    'paypal': ['paypal'],
    'postepay': ['postepay', 'poste'],
    'contanti': ['contanti', 'cash']
  };
  let detectedParser: BankParser | null = null;
  let foundByFilename = false;
  for (const parser of BANK_PARSERS) {
    const keywords = bankFileKeywords[parser.identifier] || [];
    if (keywords.some(keyword => fileName.includes(keyword))) {
      detectedParser = parser;
      setDetectedBank && setDetectedBank(parser);
      foundByFilename = true;
      break;
    }
  }
  // Se trovato dal nome file, non tentare il rilevamento tramite header
  if (!detectedParser && !foundByFilename) {
    for (const parser of BANK_PARSERS) {
      if (parser.detectFormat(headers.map(h => h.toLowerCase()))) {
        detectedParser = parser;
        setDetectedBank && setDetectedBank(parser);
        break;
      }
    }
  }

  // Crea mappings degli account se disponibili
  const accountMappings = accounts ? createAccountMappings(accounts) : undefined;

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map(v => v.replace(/"/g, ''));
    if (values.some(v => v.trim())) {
      if (detectedParser) {
        const parsedRow = detectedParser.parseRow(headers, values, accountMappings);
        // Filtra righe vuote (es. Revolut REVERTED)
        if (!parsedRow || Object.keys(parsedRow).length === 0) continue;
        // Applica normalizzazione se il parser la fornisce
        if (detectedParser.transformDate && parsedRow.date) {
          parsedRow.date = detectedParser.transformDate(parsedRow.date);
        }
        if (detectedParser.transformAmount && parsedRow.amount) {
          const originalAmount = parsedRow.amount;
          parsedRow.amount = detectedParser.transformAmount(parsedRow.amount);

          // Debug: traccia la trasformazione dell'importo per Revolut
          if (typeof window !== 'undefined' && window.console && detectedParser.identifier === 'revolut') {
            console.log('DEBUG parseCSV - Transform amount:', originalAmount, '->', parsedRow.amount);
          }
        }
        const row: ImportRow = {
          id: `row-${i}`,
          date: parsedRow.date || '',
          description: parsedRow.description || '',
          amount: parsedRow.amount || '',
          type: parsedRow.type || 'Spesa',
          account: parsedRow.account || accountId || undefined,
          category: parsedRow.category,
          subcategory: parsedRow.subcategory,
          targetTable: parsedRow.targetTable || 'transactions',
          status: 'pending',
          code: parsedRow.code || '',
          currency: 'EUR',
          initialAmount: parsedRow.amount || '',
          currentAmount: parsedRow.amount || '',
          note: '',
          transactionType: parsedRow.transactionType || parsedRow.type || 'expense'
        };

        // Debug: logga la riga finale per Revolut
        if (typeof window !== 'undefined' && window.console && detectedParser.identifier === 'revolut') {
          console.log('DEBUG parseCSV - Final row amount:', row.amount, 'Type:', row.type, 'TransactionType:', row.transactionType);
        }

        rows.push(row);
      } else {
        const description = findValue(headers, values, ['descrizione', 'description', 'causale', 'note']) || '';
        const amount = findValue(headers, values, ['importo', 'amount', 'valore']) || '';
        const amountNum = parseFloat(amount.replace(',', '.'));
        const category = findValue(headers, values, ['categoria', 'category']);
        // Determina il tipo coerente per la tabella (Entrata/Spesa)
        const type = amountNum >= 0 ? 'Entrata' : 'Spesa';
        const row: ImportRow = {
          id: `row-${i}`,
          date: findValue(headers, values, ['data', 'date', 'transaction date']) || '',
          description: description,
          amount: amount,
          type: type,
          account: accountId || undefined,
          category: category,
          subcategory: findValue(headers, values, ['sottocategoria', 'subcategory']),
          targetTable: determineTargetTable(description, type, amountNum, category),
          status: 'pending',
          code: findValue(headers, values, ['codice', 'code']) || '',
          currency: 'EUR',
          initialAmount: amount,
          currentAmount: amount,
          note: '',
          transactionType: type === 'Entrata' ? 'income' : 'expense'
        };
        rows.push(row);
      }
    }
  }
  setImportData && setImportData(rows);
  setImportStats && setImportStats({
    total: rows.length,
    processed: 0,
    success: 0,
    errors: 0
  });
}

// --- parseExcel ---
export async function parseExcel(file: File, accountId?: string, setDetectedBank?: (parser: BankParser | null) => void, setImportData?: (rows: ImportRow[]) => void, setImportStats?: (stats: any) => void, accounts?: Account[]) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
  if (jsonData.length < 2) {
    alert('Il file Excel deve contenere almeno 2 righe (header e dati)');
    return;
  }
  // Cerca la riga header scorrendo tutte le righe
  let headerRowIndex = 0;
  let headers: string[] = [];
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i].map(cell => cell?.toString().toLowerCase() || '');
    // Cerca header tipici Intesa: Data, Operazione, Dettagli, Importo
    if (
      row.some(cell => cell.includes('data')) &&
      (row.some(cell => cell.includes('operazione')) || row.some(cell => cell.includes('dettagli'))) &&
      row.some(cell => cell.includes('importo'))
    ) {
      headerRowIndex = i;
      headers = jsonData[i].map(h => h?.toString() || '');
      break;
    }
  }
  if (!headers.length) {
    headers = jsonData[0].map(h => h?.toString() || '');
  }
  // Normalizza header: trim, lowercase, rimuovi spazi
  headers = headers.map(h => h.trim());
  const rows: ImportRow[] = [];
  const fileName = file.name.toLowerCase();
  const bankFileKeywords: { [key: string]: string[] } = {
    'intesa': ['intesa', 'sanpaolo', 'intesasanpaolo', 'contoxme', 'conto xme'],
    'revolut': ['revolut'],
    'paypal': ['paypal'],
    'postepay': ['postepay', 'poste'],
    'contanti': ['contanti', 'cash'],
    'edenred': ['edenred', 'buoni pasto', 'ticket restaurant']
  };
  let detectedParser: BankParser | null = null;
  for (const parser of BANK_PARSERS) {
    const keywords = bankFileKeywords[parser.identifier] || [];
    if (keywords.some(keyword => fileName.includes(keyword))) {
      detectedParser = parser;
      setDetectedBank && setDetectedBank(parser);
      break;
    }
  }
  if (!detectedParser) {
    for (const parser of BANK_PARSERS) {
      if (parser.detectFormat(headers.map(h => h.toLowerCase()))) {
        detectedParser = parser;
        setDetectedBank && setDetectedBank(parser);
        break;
      }
    }
  }

  // Crea mappings degli account se disponibili
  const accountMappings = accounts ? createAccountMappings(accounts) : undefined;

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    let values = jsonData[i].map(v => v?.toString() || '');
    // Allinea la lunghezza dei valori agli header
    if (values.length < headers.length) {
      values = values.concat(Array(headers.length - values.length).fill(''));
    } else if (values.length > headers.length) {
      values = values.slice(0, headers.length);
    }
    if (values.some(v => v.trim())) {
      if (detectedParser) {
        const parsedRow = detectedParser.parseRow(headers, values, accountMappings);
        // Applica normalizzazione se il parser la fornisce
        if (detectedParser.transformDate && parsedRow.date) {
          parsedRow.date = detectedParser.transformDate(parsedRow.date);
        }
        if (detectedParser.transformAmount && parsedRow.amount) {
          const originalAmount = parsedRow.amount;
          parsedRow.amount = detectedParser.transformAmount(parsedRow.amount);

          // Debug: traccia la trasformazione dell'importo per Revolut
          if (typeof window !== 'undefined' && window.console && detectedParser.identifier === 'revolut') {
            console.log('DEBUG parseExcel - Transform amount:', originalAmount, '->', parsedRow.amount);
          }
        }
        // Assicura che targetTable sia sempre valorizzato
        let targetTable = parsedRow.targetTable;
        if (!targetTable) {
          const amountNum = parseFloat((parsedRow.amount || '').replace(',', '.'));
          targetTable = determineTargetTable(parsedRow.description || '', parsedRow.type || 'Spesa', amountNum, parsedRow.category);
        }
        const row: ImportRow = {
          id: `row-${i}`,
          date: parsedRow.date || '',
          description: parsedRow.description || '',
          amount: parsedRow.amount || '',
          type: parsedRow.type || 'Spesa',
          account: parsedRow.account || accountId || undefined,
          category: parsedRow.category,
          subcategory: parsedRow.subcategory,
          targetTable: targetTable,
          status: 'pending',
          code: parsedRow.code || '',
          currency: 'EUR',
          initialAmount: parsedRow.amount || '',
          currentAmount: parsedRow.amount || '',
          note: '',
          transactionType: parsedRow.transactionType || parsedRow.type || 'expense'
        };
        rows.push(row);
      } else {
        // Fallback generico: calcola sempre targetTable
        const description = findValue(headers, values, ['descrizione', 'description', 'causale']) || '';
        const amount = findValue(headers, values, ['importo', 'amount', 'valore']) || '';
        const amountNum = parseFloat(amount.replace(',', '.'));
        const category = findValue(headers, values, ['categoria', 'category']);
        const tipo = findValue(headers, values, ['tipo', 'type']) || 'Spesa';
        const row: ImportRow = {
          id: `row-${i}`,
          date: findValue(headers, values, ['data', 'date']) || '',
          description: description,
          amount: amount,
          type: tipo,
          account: accountId || undefined,
          category: category,
          subcategory: findValue(headers, values, ['sottocategoria', 'subcategory']),
          targetTable: determineTargetTable(description, tipo, amountNum, category),
          status: 'pending',
          code: findValue(headers, values, ['codice', 'code']) || '',
          currency: 'EUR',
          initialAmount: amount,
          currentAmount: amount,
          note: '',
          transactionType: tipo
        };
        rows.push(row);
      }
    }
  }
  setImportData && setImportData(rows);
  setImportStats && setImportStats({
    total: rows.length,
    processed: 0,
    success: 0,
    errors: 0
  });
}

// --- parseEdenredExcel ---
export function parseEdenredExcel(jsonData: string[][], accountId?: string): ImportRow[] {
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
      dataISO = dataOraRaw.split(' ')[0];
      ora = (dataOraRaw.split(' ')[1] || '').trim();
    } else {
      continue;
    }
    let amount = 0;
    const importoStr = values.find(v => v.includes('€')) || '';
    const matchImporto = importoStr.match(/(\d+)\s*da\s*€\s*([\d,.]+)/i);
    if (matchImporto) {
      const n = parseInt(matchImporto[1], 10);
      const val = parseFloat(matchImporto[2].replace('.', '').replace(',', '.'));
      amount = n * val;
    } else {
      const fallback = importoStr.match(/€\s*([\d,.]+)/);
      if (fallback) amount = parseFloat(fallback[1].replace('.', '').replace(',', '.'));
    }
    const tipoMov = (values[1] || '').toLowerCase();
    let tipo = 'Spesa';
    let transactionType = 'expense';
    if (tipoMov.includes('utilizzo')) {
      amount = -Math.abs(amount);
      tipo = 'Acquisto';
      transactionType = 'expense';
    } else if (tipoMov.includes('ordine cloud')) {
      amount = Math.abs(amount);
      tipo = 'Ricarica';
      transactionType = 'income';
    }
    let description = values[1]?.toString() || '';
    if (tipoMov.includes('ordine cloud')) {
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
      const dettaglioIdx = headers.findIndex((h: string) => h.includes('dettaglio'));
      if (dettaglioIdx !== -1 && values[dettaglioIdx]) {
        description = values[dettaglioIdx].toString().trim();
      } else {
        description = '';
      }
    } else {
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
  Object.values(grouped).forEach((g, idx) => {
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
      category: categoria,
      subcategory: sottocategoria,
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

// --- PARSER CUSTOM ---
// Parser Edenred (già presente ed esportato)
// Se in futuro aggiungi altri parser custom, inseriscili qui ed esportali
// Esempio:
// export function parseNomeBancaExcel(...) { ... }
//
// Ricorda: per il rilevamento automatico, aggiungi il parser anche a BANK_PARSERS se serve
