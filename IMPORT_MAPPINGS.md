# Mappature Import Banche - Mosaiko

## Banche Supportate

### 1. **CONTANTI** (Nuovo)
**File riconosciuti**: file con nome contenente `contanti` o `cash`

**Header CSV richiesti**:
- `Transaction Date`
- `Category`
- `Amount (€)`
- `Note`

**Mappature campi**:
| Campo CSV | Campo Mosaiko | Trasformazione |
|-----------|---------------|----------------|
| Transaction Date | date | "31 dic 2025, 20:02" → "2025-12-31" |
| Note | description | Diretto |
| Amount (€) | amount | Preserva segno, applica logica categoria |
| Category | category + subcategory | Vedi mapping categorie |

**Mapping Categorie**:
| Category CSV | Mosaiko Category | Subcategory | Type | Note |
|--------------|------------------|-------------|------|------|
| ENTRATE VARIE | INCOME & SALARY | Regalo/Altro | Entrata | Se nota contiene "regalo" → Regalo |
| ENTRATE VARIE + "rimborso" | INCOME & SALARY | - | Rimborso | Tabella: refunds |
| SPORT | SPORT & WELLNESS | Padel/Tennis/Calcio/Sport | Spesa | Rileva sport da nota |
| FOOD/DRINK | FOOD & DRINK | Ristorante | Spesa | - |
| ENTERTAINMENT | ENTERTAINMENT | Giochi | Spesa | - |
| GIROCONTO | - | - | Bonifico | Tabella: funds_transfer |

---

### 2. **PAYPAL** (Aggiornato)
**File riconosciuti**: file con nome contenente `paypal`

**Header CSV richiesti** (formato italiano):
- `Data` o `Date`
- `Nome` o `Name`
- `Descrizione` o `Description`
- `Netto` o `Net`

**Mappature campi**:
| Campo CSV | Campo Mosaiko | Trasformazione |
|-----------|---------------|----------------|
| Data | date | "2/12/2025" → "2025-12-02" |
| Descrizione + Nome | description | Combina descrizione e nome |
| Netto | amount | Preserva segno |
| - | type | Se amount ≥ 0 → Entrata, altrimenti Spesa |

**Note**: 
- Usa solo il campo **Netto** (non Lordo)
- Supporta sia formato italiano che inglese
- Determina automaticamente targetTable in base a keywords nella descrizione

---

### 3. **REVOLUT** (Esistente)
**File riconosciuti**: file con nome contenente `revolut`

**Header CSV richiesti**:
- `Type`
- `Product`
- `Started Date`
- `Completed Date`
- `Description`
- `Amount`
- `Fee`
- `Currency`
- `State`
- `Balance`

**Mappature campi**:
| Campo CSV | Campo Mosaiko | Trasformazione |
|-----------|---------------|----------------|
| Started Date | date | Prende primi 10 caratteri (YYYY-MM-DD) |
| Description | description | Diretto |
| Amount | amount | Preserva segno, applica logica Type |
| Currency | currency | Diretto |
| Product | account | Vedi mapping Product |
| Type | type + targetTable | Vedi mapping Type |

**Mapping Type Revolut**:
| Type | Mosaiko Type | TargetTable | transactionType | Comportamento |
|------|--------------|-------------|-----------------|------|
| CARD_PAYMENT | Spesa | transactions | expense | Forza negativo |
| CARD_REFUND | Rimborso | refunds | refund | Forza positivo |
| TRANSFER | Entrata/Spesa | funds_transfer | income/expense | Basato su segno |
| TOPUP | Ricarica | funds_transfer | income | Forza positivo |
| EXCHANGE | Entrata/Spesa | transactions | income/expense | Cambio valuta, basato su segno |
| INTEREST | Entrata | transactions | income | Interessi sul conto |
| REWARD | Entrata | transactions | income | Premi/Referral bonus |

**Mapping Product Revolut** (determina l'account):
| Product | Account Mosaiko |
|---------|-----------------|
| Current | Revolut |
| Savings | Revolut Savings |
| Deposit | Revolut Deposit |

**Override con colonne custom CSV** (opzionale):
Puoi aggiungere queste colonne al CSV di Revolut per personalizzare il mapping:
- `tipo`: Mappa al tipo italiano (Spesa, Entrata, Rimborso, Ricarica, ecc.)
- `categoria`: Categoria Mosaiko (FOOD & DRINK, SPORT & WELLNESS, ENTERTAINMENT, ecc.)
- `sottocategoria`: Sottocategoria (Ristorante, Padel, Giochi, ecc.)

Se presenti nel CSV, questi campi avranno priorità sul mapping automatico di Type.

**Righe ignorate**: 
- Transazioni con `State = REVERTED`

**Account mapping automatico**:
- `Product = CURRENT` → Account "Revolut"
- `Product = SAVINGS` → Account "Revolut Savings" (ID hardcoded: `8f2b03f3-9316-48d6-936b-0960080f2296`)
- `Product = DEPOSIT` → Account "Revolut Deposit"

---

### 4. **INTESA SANPAOLO** (Esistente)
**File riconosciuti**: file con nome contenente `intesa`, `sanpaolo`, `intesasanpaolo`, `contoxme`, `conto xme`

**Header richiesti** (supporta varianti):
- `Data Operazione` o `Data`
- `Descrizione Operazione` o `Dettagli` o `Operazione`
- `Importo`

**Gestione speciale Stipendi**:
- Se `Categoria` contiene "stipendi":
  - Estrae: Codice, Mese, Anno, Azienda dal campo Descrizione
  - Formatta: "Retribuzione {Mese} {Anno}: Bonifico A Vostro Favore Disposto Da {Azienda}"
  - Category: `INCOME & SALARY`
  - Subcategory: `Stipendio`
  - Type: `Stipendio`

---

### 5. **POSTEPAY** (Esistente)
**File riconosciuti**: file con nome contenente `postepay`, `poste`

**Header richiesti**:
- `Data Contabile` o `Data Operazione`
- `Descrizione operazioni` o `Descrizione operazione`
- `Importo (euro)` o `Importo`
- `Saldo` (opzionale)

---

### 6. **EDENRED** (Esistente - Solo Excel)
**File riconosciuti**: file con nome contenente `edenred`, `buoni pasto`, `ticket restaurant`

**Tipo file**: Solo `.xlsx` (non supporta CSV)

**Gestione speciale**:
- Raggruppa transazioni per data/ora
- Riconosce "Utilizzo BUONI" → Spesa (category: GROCERY, subcategory: Supermercato)
- Riconosce "Ordine Cloud" → Ricarica (category: INCOME & SALARY, subcategory: Bonus)

---

## Logica Generale

### Determinazione TargetTable
```typescript
// Ordine di priorità:
1. Rimborso/Refund/Storno → refunds
2. Trasferimento/Giroconto/Bonifico → funds_transfer
3. Default → transactions
```

### Formato Date Supportati
- `YYYY-MM-DD` (ISO)
- `DD/MM/YYYY` (italiano)
- `D/M/YYYY` (italiano variante)
- `31 dic 2025` (italiano testuale - solo Contanti)
- Excel serial date (numero)

### Formato Amount
- Preserva segno originale salvo override da parser
- Supporta virgola e punto decimale
- Conversione automatica `,` → `.`

---

## Testing dei Tuoi File

### ✅ CONTANTI_dicembre 2025.csv
- **Parser**: Contanti
- **Righe**: 31
- **Mapping**: ✅ Completo
- **Categorie mappate**: SPORT, FOOD/DRINK, ENTERTAINMENT, ENTRATE VARIE, GIROCONTO

### ✅ PAYPAL_dicembre 2025.CSV
- **Parser**: Paypal (aggiornato)
- **Righe**: 13
- **Formato**: Italiano con Netto
- **Mapping**: ✅ Aggiornato per formato italiano

### ✅ REVOLUT_dicembre 2025.csv
- **Parser**: Revolut (esistente)
- **Righe**: ~70
- **Formato**: Standard Revolut
- **Mapping**: ✅ Già supportato

---

## Note Importanti

1. **Rilevamento automatico**: Basato su nome file + validazione header
2. **Priorità rilevamento**: Nome file > Analisi header
3. **Account mapping**: Usa `createAccountMappings()` per mapping automatico nome → ID
4. **Debug**: Console log disponibili per troubleshooting (solo in sviluppo)

---

## Prossimi Passi Consigliati

1. ✅ Test import CONTANTI con file allegato
2. ✅ Test import PAYPAL formato italiano
3. ✅ Verifica mapping categorie CONTANTI
4. 📝 Aggiungere altre categorie custom se necessario
5. 📝 Creare mapping sottocategorie più granulare per CONTANTI
