// Modulo di parsing per import finanziari
// Contiene funzioni: parseCSV, parseExcel, parseEdenredExcel, costanti e tipi correlati

import type { ImportRow, BankParser } from './types.js';

// Tipo per le statistiche di import
export type ImportStats = {
  total: number;
  processed: number;
  success: number;
  errors: number;
}

// --- Interfaccia per Account ---
interface Account {
  id: string;
  name: string;
  type: string;
}

// --- Funzione helper per creare mapping account ---
const createAccountMappings = (accounts: Account[]): { [key: string]: string } => {
  const mappings: { [key: string]: string } = {};

  accounts.forEach(account => {
    const normalizedName = account.name.toUpperCase();
    mappings[normalizedName] = account.id;
  });

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

// Converte una stringa di importo in formato italiano ("1.234,56", punto per le
// migliaia e virgola per i decimali) o internazionale ("1234.56" / "1,234.56")
// in un numero corretto. Un semplice `.replace(',', '.')` tronca gli importi
// italiani >= 1000 (es. "2.500,00" diventava 2.5 invece di 2500): il secondo
// punto rimasto nella stringa fa fermare parseFloat al primo gruppo.
export const parseLocaleAmount = (raw: string | undefined | null): number => {
  if (!raw) return NaN;
  let s = raw.toString().trim().replace(/[€$£\s]/g, '');
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // Virgola = decimale, punto/i = separatore migliaia
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Punto = decimale, virgola/e = separatore migliaia
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Solo virgola: è decimale se seguita da al massimo 2 cifre (formato
    // valuta), altrimenti è un separatore delle migliaia senza decimali.
    const decimalDigits = s.length - lastComma - 1;
    s = decimalDigits <= 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  return parseFloat(s);
};

// Helper: somma tax all'amount se la colonna tax è popolata
const applyTax = (amountNum: number, headers: string[], values: string[]): number => {
  const taxStr = findValue(headers, values, ['tax', 'tassa', 'imposta', 'iva']);
  if (taxStr) {
    const taxNum = parseLocaleAmount(taxStr);
    if (!isNaN(taxNum) && taxNum !== 0) {
      return amountNum + taxNum;
    }
  }
  return amountNum;
};

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

// --- Mappa keyword nome file → identifier parser (unica fonte di verità) ---
// La selezione del parser avviene SOLO in base al nome del file.
// Se nessuna keyword matcha, viene usato il parser di default (fallback generico).
const BANK_FILE_KEYWORDS: { [identifier: string]: string[] } = {
  'edenred':       ['edenred'],
  'intesa':        ['intesa', 'sanpaolo', 'intesasanpaolo', 'contoxme', 'conto xme'],
  'revolut':       ['revolut'],
  'paypal':        ['paypal'],
  'postepay':      ['postepay', 'poste'],
  'contanti':      ['contanti', 'cash'],
  'traderepublic': ['traderepublic', 'trade republic'],
};

// Restituisce il parser corrispondente al nome file, o null se nessuno matcha (→ usa il default).
const detectParserByFilename = (fileName: string): BankParser | null => {
  const lowerName = fileName.toLowerCase();
  for (const parser of BANK_PARSERS) {
    const keywords = BANK_FILE_KEYWORDS[parser.identifier] || [];
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return parser;
    }
  }
  return null;
};

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
    parseRow: (headers: string[], values: string[], _accountMappings?: { [key: string]: string }) => {
      void _accountMappings;
      let date = ''
      date = findValue(headers, values, ['data operazione', 'data', 'data valuta', 'data registrazione']) || ''
      let description = ''
      description = findValue(headers, values, [
        'descrizione operazione', 'descrizione', 'dettagli', 'operazione', 'causale', 'note', 'dettaglio', 'descrizione causale']) || ''
      let amount = ''
      amount = findValue(headers, values, ['importo', 'importo valuta', 'valore']) || ''
      let category: string | undefined = findValue(headers, values, ['categoria', 'categoria operazione', 'tipo', 'tipologia'])
      let subcategory: string | undefined = undefined;
      let amountNum = parseLocaleAmount(amount)
      // Somma tax se presente
      amountNum = applyTax(amountNum, headers, values);
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
        } catch { }
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
    parseRow: (headers: string[], values: string[], _accountMappings?: { [key: string]: string }) => {
      void _accountMappings;
      // Mapping header Postepay: Data Contabile, Data Valuta, Importo (euro), Descrizione operazioni
      const date = findValue(headers, values, ['data contabile', 'data operazione', 'data', 'data valuta']) || '';
      const description = findValue(headers, values, ['descrizione operazioni', 'descrizione operazione', 'descrizione', 'causale', 'dettagli']) || '';
      const amountRaw = findValue(headers, values, ['importo (euro)', 'importo', 'importo valuta', 'valore']) || '';
      const saldo = findValue(headers, values, ['saldo', 'saldo contabile']) || '';
      const category = findValue(headers, values, ['categoria', 'category']);
      const subcategory = findValue(headers, values, ['sottocategoria', 'subcategory']);
      // Postepay: importo negativo = spesa, positivo = entrata
      let amountNum = parseLocaleAmount(amountRaw);
      // Somma tax se presente
      amountNum = applyTax(amountNum, headers, values);
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
        } catch { }
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
      // Paypal CSV: header italiani o inglesi
      return (
        (lowerHeaders.includes('data') || lowerHeaders.includes('date')) &&
        (lowerHeaders.includes('nome') || lowerHeaders.includes('name') || lowerHeaders.includes('descrizione') || lowerHeaders.includes('description')) &&
        (lowerHeaders.includes('netto') || lowerHeaders.includes('net') || lowerHeaders.includes('lordo') || lowerHeaders.includes('gross'))
      );
    },
    parseRow: (headers: string[], values: string[], _accountMappings?: { [key: string]: string }) => {
      void _accountMappings;
      // Paypal: header tipici italiani: Data, Ora, Fuso orario, Descrizione, Valuta, Lordo, Tariffa, Netto, Saldo, Nome
      // Header inglesi: Date, Time, Name, Type, Status, Currency, Gross, Fee, Net, Balance, Description
      const date = findValue(headers, values, ['data', 'date']) || '';
      const descriptionRaw = findValue(headers, values, ['descrizione', 'description']) || '';
      const name = findValue(headers, values, ['nome', 'name']) || '';
      // Descrizione: description + name (priorità description, poi nome)
      let description = descriptionRaw;
      if (name && !descriptionRaw) {
        description = name;
      } else if (name && descriptionRaw && !descriptionRaw.toLowerCase().includes(name.toLowerCase())) {
        description = `${descriptionRaw} - ${name}`;
      }
      // Importo: campo Netto (supporta varianti con spazi)
      const amountStr = findValue(headers, values, ['netto', 'net', 'netto ', ' netto']) || '';
      let amountNum = parseLocaleAmount(amountStr);
      if (isNaN(amountNum)) amountNum = 0;
      // Somma tax se presente
      amountNum = applyTax(amountNum, headers, values);
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
      // Paypal: normalizza D/M/YYYY (italiano) e YYYY-MM-DD in YYYY-MM-DD
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
    // MAPPING REVOLUT TYPE → MOSAIKO:
    // ═══════════════════════════════════════════════════════════════
    // Type (CSV)       → Mosaiko Type   TargetTable       Comportamento
    // ───────────────────────────────────────────────────────────────
    // CARD_PAYMENT     → Spesa          transactions      Forza negativo
    // CARD_REFUND      → Rimborso       refunds           Forza positivo
    // TRANSFER         → Entrata/Spesa  funds_transfer    Basato su segno
    // TOPUP            → Ricarica       funds_transfer    Forza positivo
    // EXCHANGE         → Entrata/Spesa  transactions      Cambio valuta
    // INTEREST         → Entrata        transactions      Interessi
    // REWARD           → Entrata        transactions      Premi/Referral
    // ═══════════════════════════════════════════════════════════════
    // MAPPING REVOLUT PRODUCT → ACCOUNT:
    // ═══════════════════════════════════════════════════════════════
    // Product (CSV)    → Mosaiko Account
    // ───────────────────────────────────────────────────────────────
    // Current          → Account "Revolut"
    // Savings          → Account "Revolut Savings"
    // Deposit          → Account "Revolut Deposit"
    // ═══════════════════════════════════════════════════════════════
    // Puoi aggiungere colonne al CSV per override:
    // - tipo: Mappa al tipo italiano (Spesa, Entrata, Rimborso, ecc.)
    // - categoria: Categoria Mosaiko (es. FOOD & DRINK, SPORT & WELLNESS)
    // - sottocategoria: Sottocategoria (es. Ristorante, Padel)
    parseRow: (headers: string[], values: string[], accountMappings?: { [key: string]: string }) => {
      // Header tipici: Type, Product, Started Date, Completed Date, Description, Amount, Fee, Currency, State, Balance
      const state = findValue(headers, values, ['state', 'stato']) || '';
      if (state.toUpperCase() === 'REVERTED') {
        // Riga da ignorare
        return {};
      }

      const typeRaw = findValue(headers, values, ['type']) || '';
      const description = findValue(headers, values, ['description', 'descrizione']) || '';
      const amountStr = findValue(headers, values, ['amount', 'importo']) || '';
      const date = findValue(headers, values, ['Started Date', 'data']) || '';
      const currency = findValue(headers, values, ['currency', 'valuta']) || 'EUR';
      const productRaw = findValue(headers, values, ['product']) || '';

      // Prova a leggere il Type dal CSV (category/subcategory sono lette piu' sotto)
      const typeFromCSV = findValue(headers, values, ['tipo']);

      // Parsing robusto dell'importo preservando il segno
      let amountNum = 0;
      if (amountStr) {
        amountNum = parseLocaleAmount(amountStr);
        if (isNaN(amountNum)) amountNum = 0;
      }

      // Somma tax se presente
      amountNum = applyTax(amountNum, headers, values);

      // Normalizza data: YYYY-MM-DD
      let dateISO = date;
      if (date && date.length >= 10) {
        dateISO = date.slice(0, 10);
      }
      // Determina tipo transazione picklist e normalizzato
      let type = '';
      const category = findValue(headers, values, ['categoria', 'category']);
      const subcategory = findValue(headers, values, ['sottocategoria', 'subcategory']);
      let targetTable: 'transactions' | 'refunds' | 'funds_transfer' = 'transactions';

      // Se abbiamo il Tipo dal CSV (formato italiano), usalo
      if (typeFromCSV) {
        type = typeFromCSV;

        // Determina targetTable in base al tipo
        if (type.toLowerCase().includes('rimborso') || type.toLowerCase().includes('refund')) {
          targetTable = 'refunds';
          amountNum = Math.abs(amountNum);
        } else if (type.toLowerCase().includes('transfer') || type.toLowerCase().includes('ricarica') ||
          type.toLowerCase().includes('bonifico') || type.toLowerCase().includes('prelievo')) {
          targetTable = 'funds_transfer';
        } else {
          targetTable = 'transactions';
        }
      } else {
        // Fallback: usa il mapping originale basato su typeRaw (Type field Revolut)
        // Mapping Revolut Types → Mosaiko Types:
        // CARD_PAYMENT → Spesa (transazioni con carta)
        // CARD_REFUND → Rimborso (rimborsi su carta)
        // TRANSFER → Trasferimento (trasferimenti da/a altri conti)
        // TOPUP → Ricarica (ricariche conto)
        // EXCHANGE → Cambio valuta (basato su segno)
        // INTEREST → Entrata (interessi)
        // REWARD → Entrata (premi/referral)
        switch (typeRaw.toUpperCase()) {
          case 'CARD_PAYMENT':
            type = 'Spesa';
            targetTable = 'transactions';
            amountNum = -Math.abs(amountNum);
            break;
          case 'CARD_REFUND':
            type = 'Rimborso';
            targetTable = 'refunds';
            amountNum = Math.abs(amountNum);
            break;
          case 'TRANSFER':
            type = amountNum >= 0 ? 'Entrata' : 'Spesa';
            targetTable = 'funds_transfer';
            break;
          case 'TOPUP':
            type = 'Ricarica';
            targetTable = 'funds_transfer';
            amountNum = Math.abs(amountNum);
            break;
          case 'INTEREST':
            type = 'Entrata';
            targetTable = 'transactions';
            break;
          case 'EXCHANGE':
            // Scambio valuta: determina da importo
            type = amountNum > 0 ? 'Entrata' : (amountNum < 0 ? 'Spesa' : 'Trasferimento');
            targetTable = 'transactions';
            break;
          case 'REWARD':
            // Premi/Referral bonus
            type = 'Entrata';
            targetTable = 'transactions';
            amountNum = Math.abs(amountNum);
            break;
          default:
            // Default fallback: determina da segno importo
            type = amountNum >= 0 ? 'Entrata' : 'Spesa';
            targetTable = 'transactions';
        }
      }

      // Determina account ID basandosi sul campo Product di Revolut
      let accountId = undefined;
      const productUpper = productRaw.toUpperCase();

      if (productUpper === 'SAVINGS') {
        accountId = '8f2b03f3-9316-48d6-936b-0960080f2296';
      }

      if (!accountId && accountMappings && productRaw) {
        if (productUpper === 'CURRENT') {
          if (accountMappings['REVOLUT']) {
            accountId = accountMappings['REVOLUT'];
          } else {
            const found = Object.keys(accountMappings).find(name => name.includes('REVOLUT') && !name.includes('SAVING') && !name.includes('DEPOSIT'));
            if (found) accountId = accountMappings[found];
          }
        } else if (productUpper === 'SAVINGS') {
          if (accountMappings['REVOLUT SAVINGS']) {
            accountId = accountMappings['REVOLUT SAVINGS'];
          } else if (accountMappings['REVOLUT SAVING']) {
            accountId = accountMappings['REVOLUT SAVING'];
          } else {
            const found = Object.keys(accountMappings).find(name => name.includes('REVOLUT') && name.includes('SAVING'));
            if (found) accountId = accountMappings[found];
          }
        } else if (productUpper === 'DEPOSIT') {
          if (accountMappings['REVOLUT DEPOSIT']) {
            accountId = accountMappings['REVOLUT DEPOSIT'];
          } else {
            const found = Object.keys(accountMappings).find(name => name.includes('REVOLUT') && name.includes('DEPOSIT'));
            if (found) accountId = accountMappings[found];
          }
        }
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
        // Usa sempre l'etichetta italiana (type) anche per transactionType:
        // la picklist UI (TransactionTypeCombobox) e la validazione in
        // page.tsx accettano solo le label italiane (es. "Spesa"), non i
        // valori inglesi usati internamente per il mapping DB ("expense").
        // La conversione verso l'enum DB avviene comunque a valle tramite
        // TRANSACTION_TYPE_MAP in processImport.
        transactionType: type,
        currency
      };
    },
    transformDate: (date: string) => {
      if (typeof date === 'string' && date.length >= 10) {
        return date.slice(0, 10);
      }
      return date;
    },
    transformAmount: (amount: string) => {
      return amount;
    }
  },
  // Contanti
  {
    name: 'Contanti',
    identifier: 'contanti',
    detectFormat: (headers: string[]) => {
      const lowerHeaders = headers.map(h => h.toLowerCase());
      // Riconosce header tipici Contanti custom: Transaction Date, Category, Amount (€), Note
      return (
        lowerHeaders.includes('transaction date') &&
        lowerHeaders.includes('category') &&
        (lowerHeaders.includes('amount (€)') || lowerHeaders.includes('amount')) &&
        lowerHeaders.includes('note')
      );
    },
    parseRow: (headers: string[], values: string[], _accountMappings?: { [key: string]: string }) => {
      void _accountMappings;
      // Header: Transaction Date, Category, Amount (€), Note
      const dateRaw = findValue(headers, values, ['transaction date', 'data']) || '';
      const categoryRaw = findValue(headers, values, ['category', 'categoria']) || '';
      const amountStr = findValue(headers, values, ['amount (€)', 'amount', 'importo']) || '';
      const note = findValue(headers, values, ['note', 'descrizione']) || '';

      // Parsing data: "31 dic 2025, 20:02" -> YYYY-MM-DD
      let dateISO = '';
      if (dateRaw) {
        // Formato italiano: "31 dic 2025, 20:02" o "31 dic 2025"
        const match = dateRaw.match(/(\d{1,2})\s+(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic)[a-z]*\s+(\d{4})/i);
        if (match) {
          const day = match[1].padStart(2, '0');
          const monthMap: { [key: string]: string } = {
            'gen': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'mag': '05', 'giu': '06',
            'lug': '07', 'ago': '08', 'set': '09', 'ott': '10', 'nov': '11', 'dic': '12'
          };
          const month = monthMap[match[2].toLowerCase()];
          const year = match[3];
          dateISO = `${year}-${month}-${day}`;
        }
      }

      // Parsing importo: preserva segno
      let amountNum = 0;
      if (amountStr) {
        amountNum = parseLocaleAmount(amountStr);
        if (isNaN(amountNum)) amountNum = 0;
      }
      // Somma tax se presente
      amountNum = applyTax(amountNum, headers, values);

      // Mapping categoria -> categoria/sottocategoria Mosaiko
      let category = '';
      let subcategory = '';
      let type = '';
      let targetTable: 'transactions' | 'refunds' | 'funds_transfer' = 'transactions';

      const catUpper = categoryRaw.toUpperCase();
      
      // Entrate
      if (catUpper.includes('ENTRATE VARIE') || (amountNum > 0 && note.toLowerCase().includes('rimborso'))) {
        category = 'INCOME & SALARY';
        if (note.toLowerCase().includes('rimborso')) {
          type = 'Rimborso';
          targetTable = 'refunds';
          amountNum = Math.abs(amountNum);
        } else if (note.toLowerCase().includes('regalo')) {
          subcategory = 'Regalo';
          type = 'Entrata';
        } else if (note.toLowerCase().includes('giochi')) {
          subcategory = 'Altro';
          type = 'Entrata';
        } else {
          subcategory = 'Altro';
          type = 'Entrata';
        }
      }
      // Sport
      else if (catUpper.includes('SPORT')) {
        category = 'SPORT & WELLNESS';
        if (note.toLowerCase().includes('padel')) {
          subcategory = 'Padel';
        } else if (note.toLowerCase().includes('tennis')) {
          subcategory = 'Tennis';
        } else if (note.toLowerCase().includes('calcio')) {
          subcategory = 'Calcio';
        } else {
          subcategory = 'Sport';
        }
        type = 'Spesa';
        amountNum = -Math.abs(amountNum);
      }
      // Food/Drink
      else if (catUpper.includes('FOOD') || catUpper.includes('DRINK')) {
        category = 'FOOD & DRINK';
        subcategory = 'Ristorante';
        type = 'Spesa';
        amountNum = -Math.abs(amountNum);
      }
      // Entertainment
      else if (catUpper.includes('ENTERTAINMENT')) {
        category = 'ENTERTAINMENT';
        subcategory = 'Giochi';
        type = 'Spesa';
        amountNum = -Math.abs(amountNum);
      }
      // Giroconto
      else if (catUpper.includes('GIROCONTO')) {
        type = 'Bonifico';
        targetTable = 'funds_transfer';
      }
      // Default: determina da importo
      else {
        type = amountNum >= 0 ? 'Entrata' : 'Spesa';
        category = amountNum >= 0 ? 'INCOME & SALARY' : 'OTHER';
        subcategory = amountNum >= 0 ? 'Altro' : 'Altro';
      }

      return {
        date: dateISO,
        description: note,
        amount: amountNum.toString(),
        type,
        category,
        subcategory,
        targetTable,
      };
    },
    transformDate: (date: string) => {
      // Già gestito in parseRow
      return date;
    },
    transformAmount: (amount: string) => {
      return amount.replace(',', '.');
    }
  },
  // Trade Republic
  {
    name: 'Trade Republic',
    identifier: 'traderepublic',
    detectFormat: (headers: string[]) => {
      const lowerHeaders = headers.map(h => h.toLowerCase().trim());
      // Trade Republic ha header UNICI che Revolut non ha
      // Controllo per header specifici di Trade Republic
      return (
        lowerHeaders.includes('datetime') &&
        lowerHeaders.includes('date') &&
        lowerHeaders.includes('account_type') && // Solo Trade Republic ha questo
        lowerHeaders.includes('asset_class') &&  // Solo Trade Republic ha questo
        lowerHeaders.includes('category') &&
        lowerHeaders.includes('type') &&
        lowerHeaders.includes('amount') &&
        lowerHeaders.includes('currency')
      );
    },
    parseRow: (headers: string[], values: string[], _accountMappings?: { [key: string]: string }) => {
      void _accountMappings;
      
      // Estrai i campi - Trade Republic ha SEMPRE questi header
      const dateISO = findValue(headers, values, ['date']) || '';
      const categoryTR = (findValue(headers, values, ['category']) || '').toUpperCase().trim();
      const typeRaw = (findValue(headers, values, ['type']) || '').toUpperCase().trim();
      const amountStr = (findValue(headers, values, ['amount']) || '0').trim();
      const feeStr = (findValue(headers, values, ['fee']) || '0').trim();
      const currency = findValue(headers, values, ['currency']) || 'EUR';
      const descriptionRaw = (findValue(headers, values, ['description']) || '').trim();
      const assetClass = (findValue(headers, values, ['asset_class']) || '').toUpperCase().trim();
      const assetName = (findValue(headers, values, ['name']) || '').trim();

      // Tutte le descrizioni Trade Republic hanno il prefisso "Trade Republic: "
      const description = descriptionRaw ? `Trade Republic: ${descriptionRaw}` : '';

      // Parsing importo
      let amountNum = parseLocaleAmount(amountStr);
      if (isNaN(amountNum)) amountNum = 0;

      // Parsing fee
      let feeNum = parseLocaleAmount(feeStr);
      if (isNaN(feeNum)) feeNum = 0;

      // Somma tax se presente
      amountNum = applyTax(amountNum, headers, values);
      
      // Determina il tipo italiano e la categoria/subcategoria basandosi su category e type di TR
      let type = '';
      let categoryItalian = '';
      let subcategoryItalian = '';
      let targetTable: 'transactions' | 'refunds' | 'funds_transfer' = 'transactions';
      
      // CASH transactions
      if (categoryTR === 'CASH') {
        if (typeRaw === 'CUSTOMER_INPAYMENT') {
          type = 'Entrata';
          categoryItalian = 'INCOME & SALARY';
          subcategoryItalian = 'Deposito';
          const finalAmount = amountNum + feeNum;
          const result = {
            date: dateISO,
            description: description || 'Trade Republic: Deposito in conto',
            amount: finalAmount.toString(),
            type,
            category: categoryItalian,
            subcategory: subcategoryItalian,
            targetTable: 'transactions' as const,
            currency,
          };
          if (typeof window !== 'undefined' && window.console) {
            console.log('DEBUG TR CUSTOMER_INPAYMENT:', result);
          }
          return result;
        } else if (typeRaw === 'CUSTOMER_INBOUND' || typeRaw === 'TRANSFER_INSTANT_INBOUND') {
          type = 'Bonifico';
          categoryItalian = 'TRANSFER';
          subcategoryItalian = 'Bonifico';
          targetTable = 'funds_transfer';
          return {
            date: dateISO,
            description: description || 'Trade Republic: Trasferimento ricevuto',
            amount: amountNum.toString(),
            type,
            category: categoryItalian,
            subcategory: subcategoryItalian,
            targetTable,
            transferCode: findValue(headers, values, ['transaction_id']) || '',
            currency,
          };
        } else if (typeRaw === 'INTEREST_PAYMENT') {
          // MODIFICATO: subcategory = 'Interessi maturati', description fissa
          type = 'Entrata';
          categoryItalian = 'INCOME & SALARY';
          subcategoryItalian = 'Interessi maturati';
          return {
            date: dateISO,
            description: 'Trade Republic: Pagamento degli interessi',
            amount: amountNum.toString(),
            type,
            category: categoryItalian,
            subcategory: subcategoryItalian,
            targetTable: 'transactions',
            currency,
          };
        } else if (typeRaw === 'CARD_REFUND') {
          type = 'Rimborso';
          categoryItalian = 'REFUND';
          subcategoryItalian = 'Rimborso Carta';
          targetTable = 'refunds';
          return {
            date: dateISO,
            description: description || 'Trade Republic: Rimborso carta',
            amount: Math.abs(amountNum).toString(),
            type,
            category: categoryItalian,
            subcategory: subcategoryItalian,
            targetTable,
            refundCode: findValue(headers, values, ['transaction_id']) || '',
            currency,
          };
        } else if (typeRaw === 'TAX_OPTIMIZATION') {
          type = 'Imposte';
          categoryItalian = 'FEES & COMMISSIONS';
          subcategoryItalian = 'Commissioni Bancarie';
          return {
            date: dateISO,
            description: description || 'Trade Republic: Ottimizzazione Fiscale',
            amount: Math.abs(amountNum).toString(),
            type,
            category: categoryItalian,
            subcategory: subcategoryItalian,
            targetTable: 'transactions',
            currency,
          };
        } else {
          // CASH generico
          type = amountNum >= 0 ? 'Entrata' : 'Spesa';
          categoryItalian = amountNum >= 0 ? 'INCOME & SALARY' : 'Varie';
          subcategoryItalian = 'Altro';
          return {
            date: dateISO,
            description: description || 'Trade Republic: Transazione in contanti',
            amount: amountNum.toString(),
            type,
            category: categoryItalian,
            subcategory: subcategoryItalian,
            targetTable: 'transactions',
            currency,
          };
        }
      }
      // TRADING transactions (BUY/SELL di fondi/azioni)
      else if (categoryTR === 'TRADING') {
        // MODIFICATO: categoria sempre 'ASSET & INVESTIMENTI'
        categoryItalian = 'ASSET & INVESTIMENTI';
        
        if (typeRaw === 'BUY') {
          const totalAmount = amountNum + feeNum;
          
          if (assetClass === 'FUND') {
            // MODIFICATO: categoria 'ASSET & INVESTIMENTI' per TRADING/BUY/FUND
            type = 'ETF';
            subcategoryItalian = 'Investimenti';
            return {
              date: dateISO,
              description: description || `Trade Republic: Acquisto ${assetName}`,
              amount: totalAmount.toString(),
              type,
              category: categoryItalian,
              subcategory: subcategoryItalian,
              targetTable: 'transactions',
              transactionType: 'ETF',
              note: feeNum !== 0 ? `Commissioni: €${Math.abs(feeNum).toFixed(2)}` : undefined,
              currency,
            };
          } else if (assetClass === 'STOCK') {
            // MODIFICATO: categoria 'ASSET & INVESTIMENTI' per TRADING/BUY/STOCK
            type = 'AZIONE';
            subcategoryItalian = 'Investimenti';
            return {
              date: dateISO,
              description: description || `Trade Republic: Acquisto ${assetName}`,
              amount: totalAmount.toString(),
              type,
              category: categoryItalian,
              subcategory: subcategoryItalian,
              targetTable: 'transactions',
              note: feeNum !== 0 ? `Commissioni: €${Math.abs(feeNum).toFixed(2)}` : undefined,
              currency,
            };
          } else {
            type = 'Acquisto';
            subcategoryItalian = 'Investimento';
            return {
              date: dateISO,
              description: description || `Trade Republic: Acquisto ${assetName}`,
              amount: totalAmount.toString(),
              type,
              category: categoryItalian,
              subcategory: subcategoryItalian,
              targetTable: 'transactions',
              currency,
            };
          }
        } else if (typeRaw === 'SELL') {
          const totalAmount = amountNum + feeNum;
          type = 'Vendita';
          subcategoryItalian = 'Vendita';
          
          return {
            date: dateISO,
            description: description || `Trade Republic: Vendita ${assetName}`,
            amount: totalAmount.toString(),
            type,
            category: categoryItalian,
            subcategory: subcategoryItalian,
            targetTable: 'transactions',
            note: feeNum !== 0 ? `Commissioni: €${Math.abs(feeNum).toFixed(2)}` : undefined,
            currency,
          };
        }
      }
      // DELIVERY transactions (normalmente MIGRATION - da ignorare)
      else if (categoryTR === 'DELIVERY') {
        if (typeRaw === 'MIGRATION') {
          return {
            date: dateISO,
            description: `Trade Republic: [MIGRATION] ${descriptionRaw}`,
            amount: '0',
            type: 'Migraggio',
            category: 'Varie',
            subcategory: 'Migraggio',
            targetTable: 'transactions',
            note: 'Transazione di migrazione - non importata',
          };
        }
      }
      
      // Fallback generico
      return {
        date: dateISO,
        description: description || typeRaw,
        amount: amountNum.toString(),
        type: amountNum >= 0 ? 'Entrata' : 'Spesa',
        category: amountNum >= 0 ? 'INCOME & SALARY' : 'Varie',
        subcategory: 'Altro',
        targetTable: 'transactions',
        currency,
      };
    },
    transformDate: (date: string) => {
      // Estrae data da datetime ISO se necessario, altrimenti ritorna come è
      if (!date) return date;
      // Se è già YYYY-MM-DD, ritorna come è
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) return date;
      // Se è ISO datetime con T, estrai la parte data
      if (date.includes('T')) return date.split('T')[0];
      return date;
    },
    transformAmount: (amount: string) => {
      return amount.replace(',', '.');
    }
  }
];

// --- parseCSV ---
export async function parseCSV(file: File, accountId?: string, setDetectedBank?: (parser: BankParser | null) => void, setImportData?: (rows: ImportRow[]) => void, setImportStats?: (stats: ImportStats) => void, accounts?: Account[]) {
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

  // Selezione parser: SOLO per nome file. Se nessuna keyword matcha → null → fallback generico.
  const detectedParser = detectParserByFilename(file.name);
  if (setDetectedBank) setDetectedBank(detectedParser);

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
          parsedRow.amount = detectedParser.transformAmount(parsedRow.amount);
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

        rows.push(row);
      } else {
        // Nessun parser trovato dal nome file → fallback generico
        const description = findValue(headers, values, ['descrizione', 'description', 'causale', 'note']) || '';
        const amountRaw = findValue(headers, values, ['importo', 'amount', 'valore']) || '';
        let amountNum = parseLocaleAmount(amountRaw);
        // Somma tax se presente
        amountNum = applyTax(amountNum, headers, values);
        const category = findValue(headers, values, ['categoria', 'category']);
        // Determina il tipo coerente per la tabella (Entrata/Spesa)
        const type = amountNum >= 0 ? 'Entrata' : 'Spesa';
        const row: ImportRow = {
          id: `row-${i}`,
          date: findValue(headers, values, ['data', 'date', 'transaction date']) || '',
          description: description,
          amount: amountNum.toString(),
          type: type,
          account: accountId || undefined,
          category: category,
          subcategory: findValue(headers, values, ['sottocategoria', 'subcategory']),
          targetTable: determineTargetTable(description, type, amountNum, category),
          status: 'pending',
          code: findValue(headers, values, ['codice', 'code']) || '',
          currency: 'EUR',
          initialAmount: amountNum.toString(),
          currentAmount: amountNum.toString(),
          note: '',
          transactionType: type === 'Entrata' ? 'income' : 'expense'
        };
        rows.push(row);
      }
    }
  }
  if (setImportData) setImportData(rows);
  if (setImportStats) setImportStats({
    total: rows.length,
    processed: 0,
    success: 0,
    errors: 0
  });
}

// --- parseExcel ---
export async function parseExcel(file: File, accountId?: string, setDetectedBank?: (parser: BankParser | null) => void, setImportData?: (rows: ImportRow[]) => void, setImportStats?: (stats: ImportStats) => void, accounts?: Account[]) {
  // Import dinamico: xlsx e' pesante e serve solo quando l'utente importa un file Excel
  const XLSX = await import('xlsx');
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

  // Selezione parser: SOLO per nome file. Se nessuna keyword matcha → null → fallback generico.
  const detectedParser = detectParserByFilename(file.name);
  if (setDetectedBank) setDetectedBank(detectedParser);

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
          parsedRow.amount = detectedParser.transformAmount(parsedRow.amount);
        }
        // Assicura che targetTable sia sempre valorizzato
        let targetTable = parsedRow.targetTable;
        if (!targetTable) {
          const amountNum = parseLocaleAmount(parsedRow.amount);
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
        // Nessun parser trovato dal nome file → fallback generico
        const description = findValue(headers, values, ['descrizione', 'description', 'causale']) || '';
        const amountRaw = findValue(headers, values, ['importo', 'amount', 'valore']) || '';
        let amountNum = parseLocaleAmount(amountRaw);
        // Somma tax se presente
        amountNum = applyTax(amountNum, headers, values);
        const category = findValue(headers, values, ['categoria', 'category']);
        const tipo = findValue(headers, values, ['tipo', 'type']) || 'Spesa';
        const row: ImportRow = {
          id: `row-${i}`,
          date: findValue(headers, values, ['data', 'date']) || '',
          description: description,
          amount: amountNum.toString(),
          type: tipo,
          account: accountId || undefined,
          category: category,
          subcategory: findValue(headers, values, ['sottocategoria', 'subcategory']),
          targetTable: determineTargetTable(description, tipo, amountNum, category),
          status: 'pending',
          code: findValue(headers, values, ['codice', 'code']) || '',
          currency: 'EUR',
          initialAmount: amountNum.toString(),
          currentAmount: amountNum.toString(),
          note: '',
          transactionType: tipo
        };
        rows.push(row);
      }
    }
  }
  if (setImportData) setImportData(rows);
  if (setImportStats) setImportStats({
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
        const [anno, mese] = dataISO.split('-');
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
// Ricorda: per aggiungere il supporto al rilevamento per nome file,
// aggiungi le keyword del nuovo parser in BANK_FILE_KEYWORDS sopra.
