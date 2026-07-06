"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import ModuleLayout from "@/components/ModuleLayout";
import ModuleHeader from "@/components/ui/ModuleHeader";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  FileText,
  RefreshCw,
  X,
  Info,
  Plus,
} from "lucide-react";
import {
  parseCSV,
  parseExcel,
  parseEdenredExcel,
} from "./financeImportParsers";
import { TransactionTypeCombobox } from "@/components/ui/TransactionTypeCombobox";

interface ImportRow {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: string;
  account?: string; // Ora questo sarà l'UUID dell'account
  category?: string;
  subcategory?: string;
  targetTable: "transactions" | "refunds" | "funds_transfer";
  status: "pending" | "success" | "error";
  errors?: string[];
  isEditing?: boolean;
  // Campi aggiuntivi per tutti i tipi di tabella
  code?: string;
  currency?: string;
  initialAmount?: string;
  currentAmount?: string;
  note?: string;
  // Campi specifici per transazioni
  transactionType?: string;
  // Campi specifici per rimborsi
  refundDetails?: string;
  refundCode?: string;
  // Campi specifici per trasferimenti
  transferDetails?: string;
  transferCode?: string;
  // Nuovo campo per preview transazioni
  is_refunded?: boolean;
}

interface BankParser {
  name: string;
  identifier: string;
  logo?: string;
  detectFormat: (headers: string[], firstRow?: string[]) => boolean;
  parseRow: (headers: string[], values: string[]) => Partial<ImportRow>;
  transformAmount?: (amount: string) => string;
  transformDate?: (date: string) => string;
}

// RIMOSSA la dichiarazione locale di BANK_PARSERS: ora si usa solo quella importata dal modulo

export default function ImportPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClientComponentClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [detectedBank, setDetectedBank] = useState<BankParser | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [userAccounts, setUserAccounts] = useState<
    Array<{ id: string; name: string; type: string }>
  >([]);
  const [userCategories, setUserCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [userSubcategories, setUserSubcategories] = useState<
    Array<{ id: string; name: string; category_id: string }>
  >([]);
  const [detectedAccount, setDetectedAccount] = useState<string | null>(null);
  const [importStats, setImportStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    errors: 0,
  });

  // Carica gli account dell'utente
  const loadUserAccounts = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const { data: accounts, error } = await supabase
        .from("accounts")
        .select("id, name, type")
        .eq("user_id", user.id)
        .order("name");

      if (error) {
        throw error;
      }

      setUserAccounts(accounts || []);
    } catch (error) {
      console.error("Errore nel caricamento degli account:", error);
    }
  }, [user, supabase]);

  // Carica le categorie dell'utente
  const loadUserCategories = useCallback(async () => {
    if (!user) return;

    try {
      const { data: categories, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setUserCategories(categories || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }, [user, supabase]);

  // Carica le sottocategorie dell'utente
  const loadUserSubcategories = useCallback(async () => {
    if (!user) return;

    try {
      const { data: subcategories, error } = await supabase
        .from("subcategories")
        .select("id, name, category_id")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setUserSubcategories(subcategories || []);
    } catch (error) {
      console.error("Error loading subcategories:", error);
    }
  }, [user, supabase]);

  // Rileva automaticamente l'account basandosi sul nome del file
  const detectAccountFromFilename = useCallback(
    (filename: string): string | null => {
      if (!userAccounts.length) return null;

      const lowerFilename = filename.toLowerCase();

      // Mappa delle banche/istituti con i loro possibili nomi nei file
      const bankMappings: { [key: string]: string[] } = {
        contanti: ["contanti", "cash", "contante"],
        revolut: ["revolut"],
        paypal: ["paypal"],
        intesa: [
          "intesa",
          "sanpaolo",
          "intesasanpaolo",
          "contoxme",
          "conto xme",
        ],
        poste: ["poste", "postepay", "bancoposta", "libretto postale"],
        edenred: ["edenred", "buoni pasto", "ticket restaurant"],
      };

      // Prima prova a matchare per nome della banca
      for (const [bankKey, variations] of Object.entries(bankMappings)) {
        if (variations.some((variation) => lowerFilename.includes(variation))) {
          // Cerca un account dell'utente che contenga il nome della banca
          const matchedAccount = userAccounts.find(
            (account) =>
              account.name.toLowerCase().includes(bankKey) ||
              variations.some((v) => account.name.toLowerCase().includes(v))
          );
          if (matchedAccount) return matchedAccount.id;
        }
      }

      // Se non trova una corrispondenza diretta, prova a matchare con i nomi degli account
      for (const account of userAccounts) {
        const accountWords = account.name.toLowerCase().split(" ");
        if (
          accountWords.some(
            (word) => word.length > 3 && lowerFilename.includes(word)
          )
        ) {
          return account.id;
        }
      }

      return null;
    },
    [userAccounts]
  );

  // Effetto per caricare gli account quando l'utente è disponibile
  useEffect(() => {
    if (user) {
      loadUserAccounts();
      loadUserCategories();
      loadUserSubcategories();
    }
  }, [loadUserAccounts, loadUserCategories, loadUserSubcategories, user]);

  // Effetto per rilevare l'account quando viene caricato un file
  useEffect(() => {
    if (currentFile && userAccounts.length > 0) {
      const detected = detectAccountFromFilename(currentFile.name);
      setDetectedAccount(detected);
    }
  }, [currentFile, detectAccountFromFilename, userAccounts]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const processFile = (file: File) => {
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        "Formato file non supportato. Utilizza file CSV o Excel (.xlsx, .xls)"
      );
      return;
    }

    setCurrentFile(file);
    parseFile(file);
  };

  const parseFile = async (file: File) => {
    setIsUploading(true);

    // Rileva l'account dal nome del file
    const detected = detectAccountFromFilename(file.name);
    setDetectedAccount(detected);

    try {
      // Rilevamento file Edenred tramite nome file o header
      const isEdenred =
        file.name.toLowerCase().includes("edenred") ||
        file.name.toLowerCase().includes("ticket restaurant") ||
        file.name.toLowerCase().includes("buoni pasto");
      if (isEdenred) {
        // Import dinamico: xlsx e' pesante e serve solo per questo formato
        const XLSX = await import("xlsx");
        // Leggi il file come Excel e converti in string[][]
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: string[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        });
        const rows = parseEdenredExcel(jsonData, detected || undefined);
        setDetectedBank(null);
        setImportData(rows);
        setImportStats({
          total: rows.length,
          processed: 0,
          success: 0,
          errors: 0,
        });
      } else if (file.type === "text/csv") {
        await parseCSV(
          file,
          detected || undefined,
          setDetectedBank,
          setImportData,
          setImportStats,
          userAccounts
        );
      } else {
        await parseExcel(
          file,
          detected || undefined,
          setDetectedBank,
          setImportData,
          setImportStats,
          userAccounts
        );
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      alert("Errore durante la lettura del file");
    } finally {
      setIsUploading(false);
    }
  };

  const TRANSACTION_TYPE_MAP: Record<string, string> = {
    Spesa: "expense",
    Entrata: "income",
    Rimborso: "refund",
    Trasferimento: "transfer",
    Acquisto: "expense",
    Ricarica: "income",
    Refund: "refund",
    Bonifico: "transfer",
    Prelievo: "expense",
    Stipendio: "income",
    Ordine: "expense",
    "Ordine cloud": "income",
    // ...aggiungi altri mapping se necessario...
  };

  const validateRow = (row: ImportRow): string[] => {
    const errors: string[] = [];

    // Valida data
    if (!row.date) {
      errors.push("Data mancante");
    } else {
      const date = new Date(row.date);
      if (isNaN(date.getTime())) {
        errors.push("Formato data non valido");
      }
    }

    // Valida descrizione
    if (!row.description || row.description.trim().length === 0) {
      errors.push("Descrizione mancante");
    }

    // Valida categoria (se specificata, deve esistere nel database)
    if (
      row.targetTable !== "refunds" &&
      row.targetTable !== "funds_transfer" &&
      row.category &&
      row.category.trim() !== ""
    ) {
      const categoryExists = userCategories.some(
        (cat) => cat.name.toLowerCase() === row.category?.toLowerCase()
      );
      if (!categoryExists) {
        errors.push("Categoria non valida - Seleziona da quelle disponibili");
      }
    }

    // Valida sottocategoria (se specificata, deve esistere e appartenere alla categoria)
    if (row.subcategory && row.subcategory.trim() !== "") {
      if (!row.category || row.category.trim() === "") {
        errors.push("Sottocategoria specificata senza categoria");
      } else {
        const category = userCategories.find(
          (cat) => cat.name.toLowerCase() === row.category?.toLowerCase()
        );
        if (category) {
          const subcategoryExists = userSubcategories.some(
            (subcat) =>
              subcat.name.toLowerCase() === row.subcategory?.toLowerCase() &&
              subcat.category_id === category.id
          );
          if (!subcategoryExists) {
            errors.push("Sottocategoria non valida per questa categoria");
          }
        }
      }
    }

    // Validazioni specifiche per tipo di tabella
    switch (row.targetTable) {
      case "transactions": {
        // Valida importo iniziale e corrente
        if (!row.initialAmount || row.initialAmount === "") {
          errors.push("Importo iniziale mancante");
        } else {
          const initialAmount = parseFloat(
            row.initialAmount.toString().replace(",", ".")
          );
          if (isNaN(initialAmount)) {
            errors.push("Importo iniziale non valido");
          }
        }

        if (!row.currentAmount || row.currentAmount === "") {
          errors.push("Importo corrente mancante");
        } else {
          const currentAmount = parseFloat(
            row.currentAmount.toString().replace(",", ".")
          );
          if (isNaN(currentAmount)) {
            errors.push("Importo corrente non valido");
          }
        }

        // Valida tipo transazione
        const tipoOptions = [
          "Abbonamento",
          "Acquisto",
          "AZIONE",
          "Bonifico",
          "Buono fruttifero",
          "Cancellazione rimborso",
          "Commissione",
          "Competenze",
          "Delivery",
          "Eccesso Rimborso",
          "Entrata",
          "ETF",
          "Imposte",
          "Iscrizione",
          "Ordine",
          "Ordine cloud",
          "Prelievo",
          "Quattordicesima",
          "Rata",
          "Refund",
          "Ricarica",
          "Spesa",
          "Stipendio",
          "TFR",
          "Tredicesima",
        ];
        const selectedTypeLabel = row.transactionType;
        if (selectedTypeLabel && !tipoOptions.includes(selectedTypeLabel)) {
          errors.push("Tipo transazione non valido");
        }
        break;
      }

      case "refunds":
        // Valida importi per rimborsi
        if (!row.initialAmount || row.initialAmount === "") {
          errors.push("Importo iniziale mancante");
        } else {
          const initialAmount = parseFloat(
            row.initialAmount.toString().replace(",", ".")
          );
          if (isNaN(initialAmount)) {
            errors.push("Importo iniziale non valido");
          }
        }

        if (!row.currentAmount || row.currentAmount === "") {
          errors.push("Importo corrente mancante");
        } else {
          const currentAmount = parseFloat(
            row.currentAmount.toString().replace(",", ".")
          );
          if (isNaN(currentAmount)) {
            errors.push("Importo corrente non valido");
          }
        }
        break;

      case "funds_transfer":
        // Valida importo per trasferimenti
        if (!row.amount || row.amount === "") {
          errors.push("Importo mancante");
        } else {
          const amount = parseFloat(row.amount.toString().replace(",", "."));
          if (isNaN(amount)) {
            errors.push("Importo non valido");
          }
        }
        break;

      default:
        // Fallback per importo generico
        if (!row.amount) {
          errors.push("Importo mancante");
        } else {
          const amount = parseFloat(row.amount.toString().replace(",", "."));
          if (isNaN(amount)) {
            errors.push("Importo non valido");
          }
        }
    }

    return errors;
  };

  const processImport = async () => {
    if (!user || importData.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    // Suddividi per tabella
    const transactions = importData.filter(
      (r) => r.targetTable === "transactions"
    );
    const refunds = importData.filter((r) => r.targetTable === "refunds");
    const fundTransfers = importData.filter(
      (r) => r.targetTable === "funds_transfer"
    );

    // Se tutte le liste sono vuote, mostra alert e termina
    if (
      transactions.length === 0 &&
      refunds.length === 0 &&
      fundTransfers.length === 0
    ) {
      alert("Nessun dato da importare: tutte le liste sono vuote.");
      setIsUploading(false);
      return;
    }

    // Numero di righe per singola chiamata insert(): evita un'unica richiesta
    // enorme su import molto grandi mantenendo comunque pochi round-trip.
    const INSERT_CHUNK_SIZE = 500;

    // Funzione helper per processare una lista: valida ogni riga, poi
    // inserisce le righe valide in batch per tabella invece che una alla
    // volta. Nota: un batch è tutto-o-niente (se una riga viola un vincolo,
    // l'intero batch di quella chunk viene segnato in errore) invece che
    // per singola riga come nella versione precedente — è la scelta fatta
    // per privilegiare la velocità sui grandi import bancari.
    const processList = async (rows: ImportRow[]) => {
      if (!rows || rows.length === 0) return; // Non processare se la lista è vuota
      const updatedData = [...importData];
      const rowIndexById = new Map(updatedData.map((r, idx) => [r.id, idx]));

      const validRows: { row: ImportRow; insertData: Record<string, unknown> }[] = [];

      for (const row of rows) {
        const errors = validateRow(row);
        if (errors.length > 0) {
          row.status = "error";
          row.errors = errors;
          errorCount++;
          continue;
        }
        try {
          const transactionDate = new Date(row.date)
            .toISOString()
            .split("T")[0];
          let categoryId: string | null = null;
          let subcategoryId: string | null = null;
          if (row.category && row.category.trim() !== "") {
            const category = userCategories.find(
              (cat) => cat.name.toLowerCase() === row.category?.toLowerCase()
            );
            if (category) {
              categoryId = category.id;
              if (row.subcategory && row.subcategory.trim() !== "") {
                const subcategory = userSubcategories.find(
                  (sub) =>
                    sub.name.toLowerCase() ===
                    row.subcategory?.toLowerCase() &&
                    sub.category_id === category.id
                );
                if (subcategory) {
                  subcategoryId = subcategory.id;
                }
              }
            }
          }
          let insertData: Record<string, unknown> = {
            user_id: user.id,
          };
          if (row.targetTable === "transactions") {
            const initialAmount = parseFloat(
              (row.initialAmount || row.amount).toString().replace(",", ".")
            );
            const currentAmount = parseFloat(
              (row.currentAmount || row.amount).toString().replace(",", ".")
            );
            insertData = {
              ...insertData,
              transaction_date: transactionDate,
              transaction_type:
                TRANSACTION_TYPE_MAP[row.transactionType || ""] ||
                row.transactionType ||
                "expense",
              transaction_details: row.description.trim(),
              transaction_code: row.code || null,
              account_id: row.account || null,
              category_id: categoryId,
              subcategory_id: subcategoryId,
              currency: row.currency || "EUR",
              initial_amount: initialAmount,
              current_amount: currentAmount,
              transaction_note: row.note || null,
              // Usa il flag importato se presente, altrimenti false
              is_refunded: !!row.is_refunded,
            };
          } else if (row.targetTable === "refunds") {
            const initialAmount = parseFloat(
              (row.initialAmount || row.amount).toString().replace(",", ".")
            );
            const currentAmount = parseFloat(
              (row.currentAmount || row.amount).toString().replace(",", ".")
            );
            insertData = {
              ...insertData,
              refund_date: transactionDate,
              refund_details: row.description.trim(),
              refund_code: row.code || null,
              account_id: row.account || null,
              currency: row.currency || "EUR",
              initial_amount: Math.abs(initialAmount),
              current_amount: Math.abs(currentAmount),
            };
          } else if (row.targetTable === "funds_transfer") {
            const amount = parseFloat(
              row.amount.toString().replace(",", ".")
            );
            insertData = {
              ...insertData,
              funds_transfer_date: transactionDate,
              funds_transfer_details: row.description.trim(),
              funds_transfer_code: row.code || null,
              account_id: row.account || null,
              currency: row.currency || "EUR",
              amount: amount, // NON usare Math.abs() - mantieni il segno originale!
            };
          }
          validRows.push({ row, insertData });
        } catch {
          row.status = "error";
          row.errors = ["Errore durante il salvataggio"];
          errorCount++;
        }
      }

      const targetTable = rows[0].targetTable;
      for (let i = 0; i < validRows.length; i += INSERT_CHUNK_SIZE) {
        const chunk = validRows.slice(i, i + INSERT_CHUNK_SIZE);
        const { error } = await supabase
          .from(targetTable)
          .insert(chunk.map((c) => c.insertData));

        if (error) {
          chunk.forEach(({ row }) => {
            row.status = "error";
            row.errors = ["Errore durante il salvataggio"];
            errorCount++;
          });
        } else {
          chunk.forEach(({ row }) => {
            row.status = "success";
            successCount++;
          });
        }

        // Aggiorna stato e statistiche una volta per chunk invece che per riga
        for (const { row } of chunk) {
          const globalIdx = rowIndexById.get(row.id);
          if (globalIdx !== undefined) {
            updatedData[globalIdx] = { ...row };
          }
        }
        setImportStats((prev) => ({
          ...prev,
          processed: prev.processed + chunk.length,
          success: successCount,
          errors: errorCount,
        }));
        setImportData([...updatedData]);
      }

      // Righe scartate in fase di validazione/preparazione (mai arrivate al
      // batch insert): aggiorna comunque stato e conteggio finale.
      const invalidRows = rows.filter(
        (row) => !validRows.some((v) => v.row.id === row.id)
      );
      if (invalidRows.length > 0) {
        for (const row of invalidRows) {
          const globalIdx = rowIndexById.get(row.id);
          if (globalIdx !== undefined) {
            updatedData[globalIdx] = { ...row };
          }
        }
        setImportStats((prev) => ({
          ...prev,
          processed: prev.processed + invalidRows.length,
          success: successCount,
          errors: errorCount,
        }));
        setImportData([...updatedData]);
      }
    };

    // Processa solo le liste popolate
    if (transactions.length > 0) await processList(transactions);
    if (refunds.length > 0) await processList(refunds);
    if (fundTransfers.length > 0) await processList(fundTransfers);

    setIsUploading(false);
  };

  const clearImport = () => {
    setImportData([]);
    setCurrentFile(null);
    setDetectedBank(null);
    setImportStats({ total: 0, processed: 0, success: 0, errors: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const loadNewFile = () => {
    clearImport();
    fileInputRef.current?.click();
  };

  const updateRow = (rowId: string, field: keyof ImportRow, value: unknown) => {
    setImportData((prevData) =>
      prevData.map((row) => {
        if (row.id === rowId) {
          const updatedRow = { ...row, [field]: value };
          // Se stiamo aggiornando l'amount, sincronizza initialAmount e currentAmount
          if (field === "amount") {
            if (
              row.targetTable === "transactions" ||
              row.targetTable === "refunds"
            ) {
              updatedRow.initialAmount = String(value);
              updatedRow.currentAmount = String(value);
            }
          }
          return updatedRow;
        }
        return row;
      })
    );
  };

  const deleteRow = (rowId: string) => {
    setImportData((prevData) => {
      const newData = prevData.filter((row) => row.id !== rowId);
      // Aggiorna anche le statistiche basandosi sul nuovo array
      setImportStats((prev) => ({
        ...prev,
        total: newData.length,
      }));
      return newData;
    });
  };

  // Funzione per renderizzare le celle in base al tipo di campo e tabella
  const renderCell = (row: ImportRow, columnKey: string): ReactNode => {
    const baseInputClasses =
      "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500";
    // DICHIARAZIONI VARIABILI DI SUPPORTO GLOBALI ALLO SCOPE DELLA FUNZIONE
    const rowCategoryStr = (row.category ?? "").toString().toLowerCase();
    const rowSubcategoryStr = (row.subcategory ?? "").toString().toLowerCase();

    switch (columnKey) {
      case "actions":
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

      case "status":
        if (row.status === "pending") {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              In attesa
            </span>
          );
        }
        if (row.status === "success") {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Importato
            </span>
          );
        }
        if (row.status === "error") {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Errore
            </span>
          );
        }
        break;

      case "targetTable":
        return (
          <select
            value={row.targetTable}
            onChange={(e) => updateRow(row.id, "targetTable", e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="transactions">Transazioni</option>
            <option value="refunds">Rimborsi</option>
            <option value="funds_transfer">Trasferimenti</option>
          </select>
        );

      case "date":
        return (
          <input
            type="date"
            value={row.date}
            onChange={(e) => updateRow(row.id, "date", e.target.value)}
            className={baseInputClasses}
          />
        );

      case "transactionType":
        return (
          <TransactionTypeCombobox
            value={row.transactionType ?? null}
            onChange={(value) =>
              updateRow(row.id, "transactionType", value ?? "")
            }
          />
        );

      case "description":
        return (
          <div>
            <textarea
              value={row.description}
              onChange={(e) => updateRow(row.id, "description", e.target.value)}
              className={`${baseInputClasses} min-w-[200px]`}
              rows={2}
              placeholder="Dettagli transazione"
            />
            {row.errors && row.errors.length > 0 && (
              <div className="text-xs text-red-600 mt-1">
                {row.errors.join(", ")}
              </div>
            )}
          </div>
        );

      case "code":
        return (
          <input
            type="text"
            value={row.code || ""}
            onChange={(e) => updateRow(row.id, "code", e.target.value)}
            className={baseInputClasses}
            placeholder="Codice"
          />
        );

      case "account":
        return (
          <select
            value={row.account || ""}
            onChange={(e) => updateRow(row.id, "account", e.target.value)}
            className="min-w-[150px] px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleziona account</option>
            {userAccounts.length === 0 ? (
              <option disabled>Nessun account configurato</option>
            ) : (
              userAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type.replace("_", " ")})
                </option>
              ))
            )}
          </select>
        );

      case "category":
        // Controlla se la categoria dal file esiste nel database
        const currentCategoryExists =
          row.category &&
          Array.isArray(userCategories) &&
          userCategories.some(
            (cat) => cat.name.toLowerCase() === rowCategoryStr
          );
        const hasInvalidCategory = row.category && !currentCategoryExists;
        return (
          <div>
            <select
              value={currentCategoryExists ? row.category : ""}
              onChange={(e) => updateRow(row.id, "category", e.target.value)}
              className={`min-w-[150px] px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasInvalidCategory
                ? "border-red-300 bg-red-50"
                : "border-gray-300"
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

      case "subcategory":
        // Trova la categoria selezionata per filtrare le sottocategorie
        const selectedCategory = userCategories.find(
          (cat) => cat.name.toLowerCase() === rowCategoryStr
        );
        const availableSubcategories = selectedCategory
          ? userSubcategories.filter(
            (sub) => sub.category_id === selectedCategory.id
          )
          : [];
        const currentSubcategoryExists =
          row.subcategory &&
          availableSubcategories.some(
            (sub) => sub.name.toLowerCase() === rowSubcategoryStr
          );
        const hasInvalidSubcategory =
          row.subcategory && !currentSubcategoryExists && selectedCategory;
        return (
          <div>
            <select
              value={currentSubcategoryExists ? row.subcategory : ""}
              onChange={(e) => updateRow(row.id, "subcategory", e.target.value)}
              className={`min-w-[150px] px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasInvalidSubcategory
                ? "border-red-300 bg-red-50"
                : "border-gray-300"
                }`}
              disabled={!selectedCategory}
            >
              <option value="">
                {!selectedCategory
                  ? "Prima seleziona una categoria"
                  : "Seleziona sottocategoria"}
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

      case "currency":
        return (
          <select
            value={row.currency || "EUR"}
            onChange={(e) => updateRow(row.id, "currency", e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CZK">CZK</option>
          </select>
        );

      case "amount":
        return (
          <input
            type="number"
            step="0.01"
            value={row.amount}
            onChange={(e) => updateRow(row.id, "amount", e.target.value)}
            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case "note":
        return (
          <input
            type="text"
            value={row.note || ""}
            onChange={(e) => updateRow(row.id, "note", e.target.value)}
            className={`${baseInputClasses} min-w-[150px]`}
            placeholder="Note aggiuntive"
          />
        );

      case "is_refunded":
        return (
          <input
            type="checkbox"
            checked={!!row.is_refunded}
            onChange={(e) => updateRow(row.id, "is_refunded", e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            title="Segna come rimborsato"
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
2025-01-06,"Rimborso spese",-15.30,Spesa,Varie,Altro`;

    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_mosaiko.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
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
    );
  }

  if (!user) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="text-center">
            <p className="text-gray-500">
              Devi effettuare il login per utilizzare l'import dati
            </p>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
        <ModuleHeader
          title="Import Dati"
          subtitle={
            detectedBank
              ? `Importa da ${detectedBank.name}`
              : "Importa transazioni da file Excel/CSV"
          }
          icon={<Upload className="w-6 h-6 text-white" />}
          stats={
            importData.length > 0
              ? [
                {
                  label: "Righe Totali",
                  value: importStats.total.toString(),
                  color: "blue",
                },
                {
                  label: "Transazioni",
                  value: importData
                    .filter((r) => r.targetTable === "transactions")
                    .length.toString(),
                  color: "purple",
                },
                {
                  label: "Rimborsi",
                  value: importData
                    .filter((r) => r.targetTable === "refunds")
                    .length.toString(),
                  color: "green",
                },
                {
                  label: "Trasferimenti",
                  value: importData
                    .filter((r) => r.targetTable === "funds_transfer")
                    .length.toString(),
                  color: "orange",
                },
              ]
              : []
          }
          actions={[
            ...(importData.length > 0
              ? [
                {
                  label: "Nuovo File",
                  onClick: loadNewFile,
                  icon: <Plus className="w-4 h-4" />,
                  color: "purple" as const,
                  disabled: isUploading,
                  hideTextOnMobile: true,
                },
                {
                  label: isUploading ? "Importando..." : "Avvia Import",
                  onClick: processImport,
                  icon: isUploading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  ),
                  color: "blue" as const,
                  disabled: isUploading || importData.length === 0,
                  loading: isUploading,
                },
              ]
              : []),
          ]}
          statusIndicators={[
            {
              type: "success",
              label: `Banca rilevata: ${detectedBank?.name || "Nessuna"}`,
              show: !!detectedBank,
            },
            {
              type: "success",
              label: `Account rilevato: ${detectedAccount
                ? userAccounts.find((acc) => acc.id === detectedAccount)?.name
                : "Nessuno"
                }`,
              show: !!detectedAccount,
            },
            {
              type: "warning",
              label: `Account non rilevato - Seleziona manualmente dalla picklist`,
              show: !!(
                currentFile &&
                userAccounts.length > 0 &&
                !detectedAccount
              ),
            },
            {
              type: "warning",
              label: "Import in corso...",
              show: isUploading,
            },
            {
              type: "success",
              label: "Import completato",
              show:
                !isUploading &&
                importStats.processed > 0 &&
                importStats.processed === importStats.total,
            },
          ]}
        />

        {/* Resto del contenuto... */}
        {/* Sezione Upload - Solo se non c'è un file caricato */}
        {!currentFile && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-600 rounded-xl">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Carica File
                  </h2>
                  <p className="text-gray-600">
                    Supporta file CSV e Excel (.xlsx, .xls)
                  </p>
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
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-blue-400"
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
                  <p className="text-lg font-medium text-gray-900">
                    Trascina il file qui
                  </p>
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
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={() => setShowInfoPopup(false)}
              >
                <div
                  className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Info className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Formato File Supportato
                      </h3>
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
                      <h4 className="font-medium text-gray-900 mb-2">
                        Colonne Richieste:
                      </h4>
                      <p>• Data, Descrizione, Importo</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Colonne Opzionali:
                      </h4>
                      <p>• Tipo, Categoria, Sottocategoria, Conto</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Formati:
                      </h4>
                      <p>
                        • <strong>Data:</strong> YYYY-MM-DD (es: 2025-01-01)
                      </p>
                      <p>
                        • <strong>Importo:</strong> numeri con punto o virgola
                        (es: -50.00 o 25,50)
                      </p>
                      <p>
                        • <strong>Tipi:</strong> Spesa, Entrata, Trasferimento
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Banche Supportate:
                      </h4>
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
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {currentFile.name}
                  </h3>
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
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Import in corso...
              </h3>
              <span className="text-sm text-gray-600">
                {importStats.processed} / {importStats.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(importStats.processed / importStats.total) * 100
                    }%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Preview Dati */}
        {importData.length > 0 && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Preview Dati
                  </h3>
                  <p className="text-gray-600">
                    Tutti i record raggruppati per tabella di destinazione
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  Totale: {importData.length} record
                </div>
              </div>
            </div>

            {/* Raggruppamento per tabella */}
            {(() => {
              const groupedData = importData.reduce<
                Record<string, ImportRow[]>
              >((acc, row) => {
                const table = row.targetTable;
                if (!acc[table]) acc[table] = [];
                acc[table].push(row);
                return acc;
              }, {});

              return Object.entries(groupedData).map(
                ([targetTable, rows]: [string, ImportRow[]]) => {
                  const tableLabel =
                    targetTable === "transactions"
                      ? "Transazioni"
                      : targetTable === "refunds"
                        ? "Rimborsi"
                        : "Trasferimenti";

                  // Colonne dinamiche basate sul tipo di tabella
                  const getColumns = () => {
                    switch (targetTable) {
                      case "transactions":
                        return [
                          { key: "actions", label: "Azioni" },
                          { key: "status", label: "Status" },
                          { key: "targetTable", label: "Tabella" },
                          { key: "date", label: "Data" },
                          { key: "transactionType", label: "Tipo" },
                          { key: "description", label: "Dettagli" },
                          { key: "code", label: "Codice" },
                          { key: "account", label: "Conto" },
                          { key: "category", label: "Categoria" },
                          { key: "subcategory", label: "Sottocategoria" },
                          { key: "currency", label: "Valuta" },
                          { key: "amount", label: "Importo" },
                          { key: "is_refunded", label: "Rimborsato?" },
                          { key: "note", label: "Note" },
                        ];
                      case "refunds":
                        return [
                          { key: "actions", label: "Azioni" },
                          { key: "status", label: "Status" },
                          { key: "targetTable", label: "Tabella" },
                          { key: "date", label: "Data Rimborso" },
                          { key: "description", label: "Dettagli" },
                          { key: "code", label: "Codice" },
                          { key: "account", label: "Conto" },
                          { key: "currency", label: "Valuta" },
                          { key: "amount", label: "Importo" },
                        ];
                      case "funds_transfer":
                        return [
                          { key: "actions", label: "Azioni" },
                          { key: "status", label: "Status" },
                          { key: "targetTable", label: "Tabella" },
                          { key: "date", label: "Data Trasferimento" },
                          { key: "description", label: "Dettagli" },
                          { key: "code", label: "Codice" },
                          { key: "account", label: "Conto" },
                          { key: "currency", label: "Valuta" },
                          { key: "amount", label: "Importo" },
                        ];
                      default:
                        return [];
                    }
                  };

                  const columns = getColumns();

                  return (
                    <div
                      key={targetTable}
                      className="border-b border-gray-200 last:border-b-0"
                    >
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h4 className="text-md font-medium text-gray-900 flex items-center">
                          <span
                            className={`inline-block w-3 h-3 rounded-full mr-3 ${targetTable === "transactions"
                              ? "bg-blue-500"
                              : targetTable === "refunds"
                                ? "bg-green-500"
                                : "bg-purple-500"
                              }`}
                          ></span>
                          {tableLabel} ({rows.length} record
                          {rows.length !== 1 ? "s" : ""})
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
                              <tr
                                key={row.id}
                                className={`hover:bg-gray-50 ${row.status === "error" ? "bg-red-50" : ""
                                  }`}
                              >
                                {columns.map((column) => (
                                  <td
                                    key={column.key}
                                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                                  >
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
                }
              );
            })()}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
