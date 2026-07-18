"use client";

import { useState, useEffect, useMemo } from "react";
import ModuleLayout from "@/components/ModuleLayout";
import ModuleHeader from "@/components/ui/ModuleHeader";
import CacheStatus from "@/components/ui/CacheStatus";
import { useAuth } from "@/lib/auth";
import { useFinanceCache, useAccounts } from "@/lib/financeCache";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  RotateCcw,
  Plus,
  MoreVertical,
  RefreshCw,
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Link,
  X,
  FileText,
} from "lucide-react";

interface Refund {
  id: string;
  user_id: string;
  refund_date: string;
  refund_details: string;
  account_id: string | null;
  currency: string;
  current_amount: number;
  initial_amount: number;
  refund_code: string | null;
  created_at: string;
  updated_at: string;
}

interface RefundTransaction {
  id: string;
  refund_id: string;
  transaction_id: string;
  amount: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_details: string;
  current_amount: number;
  transaction_type: string;
  account_id: string | null;
  account_name: string | null;
  categories?: {
    name: string;
  };
}

interface TransactionWithRefund extends Transaction {
  is_refunded?: boolean;
}

interface ExtendedRefund extends Refund {
  account_name?: string;
  linked_transactions: Transaction[];
  total_linked_amount: number;
}

export default function RefundsPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    data: financeData,
    loading,
    error,
    refetch,
    isDataStale,
  } = useFinanceCache();
  const { accounts } = useAccounts();
  const supabase = createSupabaseBrowserClient();

  const [refunds, setRefunds] = useState<ExtendedRefund[]>([]);
  const [refundTransactions, setRefundTransactions] = useState<
    RefundTransaction[]
  >([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<ExtendedRefund | null>(
    null
  );
  const [refundToEdit, setRefundToEdit] = useState<ExtendedRefund | null>(null);
  const [refundToDelete, setRefundToDelete] = useState<ExtendedRefund | null>(
    null
  );
  const [refundToLink, setRefundToLink] = useState<ExtendedRefund | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    refund_details: "",
    refund_date: "",
    current_amount: "",
    account_id: "",
    refund_code: "",
  });

  // Account disattivati non selezionabili per nuovi rimborsi; in modifica
  // resta visibile anche quello già assegnato, se nel frattempo disattivato.
  const selectableAccountsForAdd = useMemo(
    () => accounts.filter((account) => account.is_active),
    [accounts]
  );
  const selectableAccountsForEdit = useMemo(
    () => accounts.filter((account) => account.is_active || account.id === formData.account_id),
    [accounts, formData.account_id]
  );

  // Filtri e sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [sortField, setSortField] = useState<
    "refund_date" | "refund_details" | "current_amount" | "linked_amount"
  >("refund_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  // Link modal states
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [linkAmount, setLinkAmount] = useState("");
  const [linkingTransaction, setLinkingTransaction] = useState(false);

  // Listener per il FAB della navbar mobile
  useEffect(() => {
    const handleOpenModal = () => {
      setShowAddModal(true);
    };
    
    window.addEventListener('openNewItemModal', handleOpenModal);
    return () => window.removeEventListener('openNewItemModal', handleOpenModal);
  }, []);
  const [unlinkingTransaction, setUnlinkingTransaction] = useState<
    string | null
  >(null);
  // Stati per transazioni complete (non limitate dal cache)
  const [allTransactions, setAllTransactions] = useState<
    TransactionWithRefund[]
  >([]);
  const [, setLoadingAllTransactions] = useState(false);
  const [transactionSearchTerm, setTransactionSearchTerm] = useState("");

  // Carica refunds e refund_transactions al caricamento
  useEffect(() => {
    if (user && financeData) {
      loadRefunds();
      loadAllTransactions(); // Carica tutte le transazioni
    }
  }, [user, financeData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Funzione per caricare tutte le transazioni (senza limiti)
  const loadAllTransactions = async () => {
    if (!user) return;

    setLoadingAllTransactions(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          transaction_date,
          transaction_details,
          current_amount,
          transaction_type,
          is_refunded,
          account_name,
          asset_id,
          accounts(type),
          categories(name)
        `
        )
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      const processedTransactions =
        data?.map((t) => ({
          id: t.id,
          transaction_date: t.transaction_date,
          transaction_details: t.transaction_details,
          current_amount: t.current_amount,
          transaction_type: t.transaction_type,
          account_id: null, // Il cache locale non usa account_id
          account_name: t.account_name || null,
          categories: t.categories?.[0] || undefined, // Prende il primo elemento se esiste
          is_refunded: t.is_refunded,
        })) || [];

      setAllTransactions(processedTransactions);
    } catch (error) {
      console.error("Errore nel caricamento delle transazioni:", error);
    } finally {
      setLoadingAllTransactions(false);
    }
  };

  const loadRefunds = async () => {
    if (!user || !financeData) return;

    try {
      // Carica refunds
      const { data: refundsData, error: refundsError } = await supabase
        .from("refunds")
        .select("*")
        .eq("user_id", user.id)
        .order("refund_date", { ascending: false });

      if (refundsError) throw refundsError;

      // Carica refund_transactions
      const { data: refundTransactionsData, error: refundTransactionsError } =
        await supabase
          .from("refund_transaction")
          .select("*")
          .eq("user_id", user.id);

      if (refundTransactionsError) throw refundTransactionsError;

      setRefundTransactions(refundTransactionsData || []);

      // Mappa refunds con transazioni collegate
      const extendedRefunds: ExtendedRefund[] = (refundsData || []).map(
        (refund: Refund) => {
          const linkedTransactionIds = (refundTransactionsData || [])
            .filter((rt: RefundTransaction) => rt.refund_id === refund.id)
            .map((rt: RefundTransaction) => rt.transaction_id);

          // Usa financeData.transactions solo se disponibile
          const linkedTransactions = financeData?.transactions
            ? financeData.transactions
                .filter((t) => linkedTransactionIds.includes(t.id))
                .map((t) => ({
                  id: t.id,
                  transaction_date: t.transaction_date,
                  transaction_details: t.transaction_details,
                  current_amount: t.current_amount,
                  transaction_type: t.transaction_type,
                  account_id: null,
                  account_name: t.account_name || null,
                  categories: t.categories || undefined,
                }))
            : [];

          const totalLinkedAmount = (refundTransactionsData || [])
            .filter((rt: RefundTransaction) => rt.refund_id === refund.id)
            .reduce((sum: number, rt: RefundTransaction) => sum + rt.amount, 0);

          const account = accounts.find((acc) => acc.id === refund.account_id);

          return {
            ...refund,
            account_name: account?.name,
            linked_transactions: linkedTransactions,
            total_linked_amount: totalLinkedAmount,
          };
        }
      );

      setRefunds(extendedRefunds);
    } catch (error) {
      console.error("Errore nel caricamento dei refund:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleSort = (
    field: "refund_date" | "refund_details" | "current_amount" | "linked_amount"
  ) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (
    field: "refund_date" | "refund_details" | "current_amount" | "linked_amount"
  ) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-4 h-4 text-ink-muted" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4" />
    ) : (
      <ArrowDown className="w-4 h-4" />
    );
  };

  const handleAddRefund = () => {
    setFormData({
      refund_details: "",
      refund_date: new Date().toISOString().split("T")[0],
      current_amount: "",
      account_id: "",
      refund_code: "",
    });
    setRefundToEdit(null);
    setShowAddModal(true);
  };

  const handleEditRefund = (refund: ExtendedRefund) => {
    setFormData({
      refund_details: refund.refund_details,
      refund_date: refund.refund_date,
      current_amount: refund.current_amount.toString(),
      account_id: refund.account_id || "",
      refund_code: refund.refund_code || "",
    });
    setRefundToEdit(refund);
    setShowEditModal(true);
  };

  const handleDeleteRefund = (refund: ExtendedRefund) => {
    setRefundToDelete(refund);
    setShowDeleteModal(true);
  };

  const handleLinkRefund = (refund: ExtendedRefund) => {
    setRefundToLink(refund);
    setSelectedTransactionId("");
    setLinkAmount("");
    setTransactionSearchTerm(""); // Reset ricerca
    setShowLinkModal(true);
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setRefundToLink(null);
    setSelectedTransactionId("");
    setLinkAmount("");
    setTransactionSearchTerm("");
  };

  const saveRefund = async () => {
    if (
      !formData.refund_details ||
      !formData.current_amount ||
      !formData.refund_date
    ) {
      return;
    }

    try {
      const refundData = {
        refund_details: formData.refund_details,
        refund_date: formData.refund_date,
        current_amount: parseFloat(formData.current_amount),
        initial_amount: parseFloat(formData.current_amount),
        account_id: formData.account_id || null,
        refund_code: formData.refund_code || null,
        currency: "EUR",
        user_id: user!.id,
      };

      if (refundToEdit) {
        // Aggiorna refund esistente
        const { error } = await supabase
          .from("refunds")
          .update(refundData)
          .eq("id", refundToEdit.id);

        if (error) throw error;
        setShowEditModal(false);
      } else {
        // Crea nuovo refund
        const { error } = await supabase.from("refunds").insert([refundData]);

        if (error) throw error;
        setShowAddModal(false);
      }

      await loadRefunds();
      await refetch();
    } catch (error) {
      console.error("Errore nel salvare il refund:", error);
    }
  };
  const confirmDelete = async () => {
    if (refundToDelete) {
      try {
        const { error } = await supabase
          .from("refunds")
          .delete()
          .eq("id", refundToDelete.id);

        if (error) throw error;

        setShowDeleteModal(false);
        setRefundToDelete(null);
        await loadRefunds();
        await refetch();
      } catch (error) {
        console.error("Errore nell'eliminare il refund:", error);
      }
    }
  };

  const handleLinkTransaction = async () => {
    if (!selectedTransactionId || !refundToLink) return;

    setLinkingTransaction(true);
    try {
      const { error } = await supabase.from("refund_transaction").insert([
        {
          refund_id: refundToLink.id,
          transaction_id: selectedTransactionId,
          amount: linkAmount ? parseFloat(linkAmount) : 0,
          user_id: user!.id,
        },
      ]);

      if (error) throw error;

      closeLinkModal(); // Usa la nuova funzione per chiudere
      await loadRefunds();
      await refetch();
    } catch (error) {
      console.error("Errore nel collegare la transazione:", error);
    } finally {
      setLinkingTransaction(false);
    }
  };

  const handleUnlinkTransaction = async (refundTransactionId: string) => {
    setUnlinkingTransaction(refundTransactionId);
    try {
      // Trova il record refund_transaction da eliminare
      const refundTransactionToDelete = refundTransactions.find(
        (rt) =>
          rt.transaction_id === refundTransactionId &&
          rt.refund_id === refundToLink?.id
      );

      if (!refundTransactionToDelete) return;

      const { error } = await supabase
        .from("refund_transaction")
        .delete()
        .eq("id", refundTransactionToDelete.id);

      if (error) throw error;

      await loadRefunds();
      await refetch();
    } catch (error) {
      console.error("Errore nello scollegare la transazione:", error);
    } finally {
      setUnlinkingTransaction(null);
    }
  };

  // Helper per verificare se un rimborso è collegato
  const isRefundLinked = (refundId: string): boolean => {
    return refundTransactions.some((rt) => rt.refund_id === refundId);
  };

  // Helper per ottenere il numero di transazioni collegate
  const getLinkedTransactionCount = (refundId: string): number => {
    return refundTransactions.filter((rt) => rt.refund_id === refundId).length;
  };

  // Filtra transazioni che sono rimborsabili e hanno importo diverso da zero
  const getRefundableTransactions = (): Transaction[] => {
    // Usa le transazioni caricate direttamente (senza limiti del cache)
    if (!allTransactions.length) return [];

    const refundableTransactions = allTransactions.filter(
      (t) =>
        // Per ora, mostra tutte le transazioni con importo diverso da zero
        // Rimuovo temporaneamente il filtro is_refunded per debugging
        t.is_refunded === true && t.current_amount !== 0
    );

    return refundableTransactions.map((t) => ({
      id: t.id,
      transaction_date: t.transaction_date,
      transaction_details: t.transaction_details,
      current_amount: t.current_amount,
      transaction_type: t.transaction_type,
      account_id: null, // La transazione dal cache non ha account_id
      account_name: t.account_name || null,
      categories: t.categories || undefined,
    }));
  };

  const filteredAndSortedRefunds = refunds
    .filter((refund) => {
      const matchesSearch = refund.refund_details
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesAccount =
        selectedAccountId === "all" ||
        (selectedAccountId === "none" && !refund.account_id) ||
        refund.account_id === selectedAccountId;
      const matchesActiveFilter =
        !showActiveOnly || refund.current_amount !== 0;
      return matchesSearch && matchesAccount && matchesActiveFilter;
    })
    .sort((a, b) => {
      let valueA: string | number, valueB: string | number;

      switch (sortField) {
        case "refund_details":
          valueA = a.refund_details.toLowerCase();
          valueB = b.refund_details.toLowerCase();
          break;
        case "current_amount":
          valueA = a.current_amount;
          valueB = b.current_amount;
          break;
        case "linked_amount":
          valueA = a.total_linked_amount;
          valueB = b.total_linked_amount;
          break;
        case "refund_date":
        default:
          valueA = new Date(a.refund_date).getTime();
          valueB = new Date(b.refund_date).getTime();
          break;
      }

      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortDirection === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      return sortDirection === "asc"
        ? (valueA as number) - (valueB as number)
        : (valueB as number) - (valueA as number);
    });

  // Loading states
  if (authLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-inset rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-inset rounded-lg"></div>
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
            <p className="text-ink-muted">
              Devi effettuare il login per visualizzare i refund
            </p>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  const refundableTransactions = getRefundableTransactions();

  return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
        <ModuleHeader
          title="Rimborsi"
          subtitle="Gestisci i tuoi rimborsi e collegali alle transazioni"
          icon={<RotateCcw className="h-6 w-6 text-white" />}
          customContent={<CacheStatus />}
          statusIndicators={[
            {
              type: "warning",
              label: "Aggiornamento consigliato",
              show: isDataStale,
            },
            {
              type: "success",
              label: "Tutti i sistemi operativi",
              show: !loading && !error && refunds.length > 0,
            },
          ]}
          stats={
            !loading && refunds.length > 0
              ? [
                  {
                    label: "Rimborsi Totali",
                    value: formatCurrency(
                      refunds.reduce((sum, r) => sum + r.current_amount, 0)
                    ),
                    color: "green",
                  },
                  {
                    label: "Rimborsi Attivi",
                    value: refunds.length.toString(),
                    color: "blue",
                  },
                ]
              : []
          }
          actions={[
            {
              label: "Aggiungi",
              onClick: handleAddRefund,
              icon: <Plus className="w-4 h-4" />,
              color: "green",
              hideTextOnMobile: true,
              hideOnMobile: true,
            },
            {
              label: "Aggiorna",
              onClick: refetch,
              icon: <RefreshCw className="w-4 h-4" />,
              color: "blue",
              disabled: loading,
              loading: loading,
              hideTextOnMobile: true,
            },
          ]}
        />

        {error && (
          <div className="mb-6 p-4 bg-danger-subtle border border-danger-subtle rounded-lg">
            <p className="text-danger text-sm">
              Errore nel caricamento dei dati: {error}
            </p>
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-6">
          <div className="bg-surface border border-edge shadow-card rounded-lg p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-muted w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Cerca rimborsi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm"
                  />
                </div>
              </div>
              {/* Filtro per account */}
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-muted w-4 h-4" />
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-surface min-w-[150px]"
                >
                  <option value="all">Tutti gli account</option>
                  <option value="none">Nessun account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Toggle per rimborsi attivi */}
              <div className="flex items-center gap-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      showActiveOnly ? "bg-primary" : "bg-inset"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-surface rounded-full transition-transform ${
                        showActiveOnly ? "translate-x-5" : "translate-x-0"
                      }`}
                    ></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-ink-secondary whitespace-nowrap">
                    Solo attivi
                  </span>
                </label>
              </div>
            </div>

            {/* Sorting buttons */}
            <div className="flex gap-2 mt-4 flex-wrap">
              <button
                onClick={() => handleSort("refund_date")}
                className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                  sortField === "refund_date"
                    ? "bg-primary-subtle border-primary-subtle text-primary-hover"
                    : "border-edge hover:bg-canvas"
                }`}
              >
                Data {getSortIcon("refund_date")}
              </button>
              <button
                onClick={() => handleSort("refund_details")}
                className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                  sortField === "refund_details"
                    ? "bg-primary-subtle border-primary-subtle text-primary-hover"
                    : "border-edge hover:bg-canvas"
                }`}
              >
                Descrizione {getSortIcon("refund_details")}
              </button>
              <button
                onClick={() => handleSort("current_amount")}
                className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                  sortField === "current_amount"
                    ? "bg-primary-subtle border-primary-subtle text-primary-hover"
                    : "border-edge hover:bg-canvas"
                }`}
              >
                Importo {getSortIcon("current_amount")}
              </button>
              <button
                onClick={() => handleSort("linked_amount")}
                className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                  sortField === "linked_amount"
                    ? "bg-primary-subtle border-primary-subtle text-primary-hover"
                    : "border-edge hover:bg-canvas"
                }`}
              >
                Collegato {getSortIcon("linked_amount")}
              </button>
            </div>
          </div>
        </div>
        {/* Refunds Table */}
        {loading ? (
          <div className="bg-surface rounded-lg shadow-card border border-edge overflow-hidden">
            <div className="animate-pulse p-6">
              <div className="h-4 bg-inset rounded w-3/4 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-inset rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-surface border border-edge shadow-card rounded-lg p-8">
              <RotateCcw className="w-16 h-16 mx-auto text-ink-muted mb-6" />
              <h3 className="text-xl font-semibold text-ink mb-3">
                Nessun rimborso
              </h3>
              <p className="text-ink-secondary mb-6">
                Non hai ancora aggiunto nessun rimborso.
              </p>
              <button
                onClick={handleAddRefund}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary-hover transition-colors shadow-card"
              >
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi il primo rimborso
              </button>
            </div>
          </div>
        ) : filteredAndSortedRefunds.length === 0 ? (
          <div className="bg-surface rounded-lg shadow-card border border-edge p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-ink-muted mb-4" />
            <h3 className="text-lg font-medium text-ink mb-2">
              Nessun risultato
            </h3>
            <p className="text-ink-muted">
              Nessun rimborso corrisponde ai filtri selezionati.
            </p>
          </div>
        ) : (
          <div className="bg-surface rounded-lg shadow-card border border-edge overflow-hidden">
            {" "}
            {/* Table Header - Hidden on mobile */}
            <div className="hidden md:block bg-canvas border-b border-edge px-6 py-3">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-ink-muted uppercase tracking-wider">
                <div className="col-span-4">Descrizione</div>
                <div className="col-span-2 text-center">Data</div>
                <div className="col-span-2 text-center">Importo</div>
                <div className="col-span-2 text-center">Collegati</div>
                <div className="col-span-1 text-center">Stato</div>
                <div className="col-span-1 text-center">Azioni</div>
              </div>
            </div>
            {/* Table Body */}
            <div className="divide-y divide-edge">
              {filteredAndSortedRefunds.map((refund) => (
                <div
                  key={refund.id}
                  className="px-4 md:px-6 py-4 hover:bg-canvas transition-colors"
                >
                  {/* Desktop Layout */}
                  <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                    {/* Descrizione */}
                    <div className="col-span-4">
                      <div className="font-medium text-ink text-sm">
                        {refund.refund_details}
                      </div>
                      {refund.refund_code && (
                        <div className="text-xs text-ink-muted mt-1">
                          Codice: {refund.refund_code}
                        </div>
                      )}
                      {refund.account_name && (
                        <div className="text-xs text-ink-muted mt-1">
                          Account: {refund.account_name}
                        </div>
                      )}
                    </div>

                    {/* Data */}
                    <div className="col-span-2 text-center text-sm text-ink">
                      {new Date(refund.refund_date).toLocaleDateString("it-IT")}
                    </div>

                    {/* Importo */}
                    <div className="col-span-2 text-center">
                      <div className="font-semibold text-success-strong text-sm">
                        {formatCurrency(refund.current_amount)}
                      </div>
                    </div>

                    {/* Importo Collegato */}
                    <div className="col-span-2 text-center">
                      <div className="font-medium text-primary text-sm">
                        {formatCurrency(refund.total_linked_amount)}
                      </div>{" "}
                      {getLinkedTransactionCount(refund.id) > 0 && (
                        <div className="text-xs text-ink-muted mt-1">
                          {getLinkedTransactionCount(refund.id)} transazioni
                        </div>
                      )}
                    </div>

                    {/* Stato */}
                    <div className="col-span-1 text-center">
                      {" "}
                      {isRefundLinked(refund.id) ? (
                        <div className="inline-flex items-center px-2 py-1 bg-success-subtle text-success-strong text-xs rounded-full">
                          <Link className="w-3 h-3 mr-1" />
                          Collegato
                        </div>
                      ) : (
                        <div className="inline-flex items-center px-2 py-1 bg-inset text-ink-secondary text-xs rounded-full">
                          <X className="w-3 h-3 mr-1" />
                          Libero
                        </div>
                      )}
                    </div>

                    {/* Azioni */}
                    <div className="col-span-1 text-center">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setSelectedRefund(
                              selectedRefund?.id === refund.id ? null : refund
                            )
                          }
                          className="p-1 hover:bg-inset rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-ink-muted" />
                        </button>

                        {/* Dropdown Menu */}
                        {selectedRefund?.id === refund.id && (
                          <div className="absolute right-0 top-8 mt-1 w-48 bg-surface rounded-lg shadow-elevated border border-edge z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleLinkRefund(refund);
                                  setSelectedRefund(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-ink-secondary hover:bg-inset"
                              >
                                <Link className="w-4 h-4" />
                                Collega Transazioni
                              </button>
                              <button
                                onClick={() => {
                                  handleEditRefund(refund);
                                  setSelectedRefund(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-ink-secondary hover:bg-inset"
                              >
                                <Edit2 className="w-4 h-4" />
                                Modifica
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteRefund(refund);
                                  setSelectedRefund(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger hover:bg-danger-subtle"
                              >
                                <Trash2 className="w-4 h-4" />
                                Elimina
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-ink text-sm">
                            {refund.refund_details}
                          </h3>
                          {isRefundLinked(refund.id) ? (
                            <div className="inline-flex items-center px-2 py-1 bg-success-subtle text-success-strong text-xs rounded-full">
                              <Link className="w-3 h-3 mr-1" />
                              {getLinkedTransactionCount(refund.id)}
                            </div>
                          ) : (
                            <div className="inline-flex items-center px-2 py-1 bg-inset text-ink-secondary text-xs rounded-full">
                              <X className="w-3 h-3 mr-1" />
                              Libero
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Data:</span>
                            <span className="text-ink">
                              {new Date(refund.refund_date).toLocaleDateString(
                                "it-IT"
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Importo:</span>
                            <span className="font-semibold text-success-strong">
                              {formatCurrency(refund.current_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Collegato:</span>
                            <span className="font-medium text-primary">
                              {formatCurrency(refund.total_linked_amount)}
                            </span>
                          </div>
                          {refund.account_name && (
                            <div className="flex justify-between">
                              <span className="text-ink-muted">Account:</span>
                              <span className="text-ink">
                                {refund.account_name}
                              </span>
                            </div>
                          )}
                          {refund.refund_code && (
                            <div className="flex justify-between">
                              <span className="text-ink-muted">Codice:</span>
                              <span className="text-ink">
                                {refund.refund_code}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="relative ml-4">
                        <button
                          onClick={() =>
                            setSelectedRefund(
                              selectedRefund?.id === refund.id ? null : refund
                            )
                          }
                          className="p-2 hover:bg-inset rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-ink-muted" />
                        </button>

                        {/* Dropdown Menu */}
                        {selectedRefund?.id === refund.id && (
                          <div className="absolute right-0 top-8 mt-1 w-48 bg-surface rounded-lg shadow-elevated border border-edge z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleLinkRefund(refund);
                                  setSelectedRefund(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-ink-secondary hover:bg-inset"
                              >
                                <Link className="w-4 h-4" />
                                Collega Transazioni
                              </button>
                              <button
                                onClick={() => {
                                  handleEditRefund(refund);
                                  setSelectedRefund(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-ink-secondary hover:bg-inset"
                              >
                                <Edit2 className="w-4 h-4" />
                                Modifica
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteRefund(refund);
                                  setSelectedRefund(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger hover:bg-danger-subtle"
                              >
                                <Trash2 className="w-4 h-4" />
                                Elimina
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transazioni collegate - espandibile */}
                  {refund.linked_transactions.length > 0 &&
                    selectedRefund?.id === refund.id && (
                      <div className="mt-4 pt-4 border-t border-edge-subtle">
                        <h4 className="text-sm font-medium text-ink-secondary mb-3">
                          Transazioni Collegate:
                        </h4>
                        <div className="bg-canvas rounded-lg p-3">
                          <div className="space-y-2">
                            {refund.linked_transactions.map((transaction) => (
                              <div
                                key={transaction.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex-1">
                                  <span className="font-medium text-ink">
                                    {transaction.transaction_details}
                                  </span>
                                  <span className="text-ink-muted ml-2">
                                    •{" "}
                                    {new Date(
                                      transaction.transaction_date
                                    ).toLocaleDateString("it-IT")}
                                  </span>
                                  {transaction.categories?.name && (
                                    <span className="text-ink-muted ml-1">
                                      • {transaction.categories.name}
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold text-danger">
                                  {formatCurrency(transaction.current_amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal per Aggiungere Refund */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  Aggiungi Nuovo Rimborso
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-inset rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRefund();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Descrizione Rimborso *
                  </label>
                  <input
                    type="text"
                    value={formData.refund_details}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        refund_details: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Es. Rimborso spese mediche"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Data Rimborso *
                  </label>
                  <input
                    type="date"
                    value={formData.refund_date}
                    onChange={(e) =>
                      setFormData({ ...formData, refund_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Importo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.current_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        current_amount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Account Associato
                  </label>
                  <select
                    value={formData.account_id}
                    onChange={(e) =>
                      setFormData({ ...formData, account_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Nessun account</option>
                    {selectableAccountsForAdd.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Codice Rimborso
                  </label>
                  <input
                    type="text"
                    value={formData.refund_code}
                    onChange={(e) =>
                      setFormData({ ...formData, refund_code: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Es. REF-2025-001"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-edge text-ink-secondary rounded-lg hover:bg-canvas transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    Aggiungi Rimborso
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal per Modificare Refund */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Modifica Rimborso</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-inset rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRefund();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Descrizione Rimborso *
                  </label>
                  <input
                    type="text"
                    value={formData.refund_details}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        refund_details: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Es. Rimborso spese mediche"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Data Rimborso *
                  </label>
                  <input
                    type="date"
                    value={formData.refund_date}
                    onChange={(e) =>
                      setFormData({ ...formData, refund_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Importo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.current_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        current_amount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Account Associato
                  </label>
                  <select
                    value={formData.account_id}
                    onChange={(e) =>
                      setFormData({ ...formData, account_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Nessun account</option>
                    {selectableAccountsForEdit.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-secondary mb-1">
                    Codice Rimborso
                  </label>
                  <input
                    type="text"
                    value={formData.refund_code}
                    onChange={(e) =>
                      setFormData({ ...formData, refund_code: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Es. REF-2025-001"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-edge text-ink-secondary rounded-lg hover:bg-canvas transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    Salva Modifiche
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal per Conferma Eliminazione */}
        {showDeleteModal && refundToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-danger">
                  Elimina Rimborso
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1 hover:bg-inset rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-ink-secondary mb-2">
                  Sei sicuro di voler eliminare questo rimborso?
                </p>
                <div className="bg-canvas p-3 rounded-lg">
                  <p className="font-medium">{refundToDelete.refund_details}</p>
                  <p className="text-sm text-ink-secondary">
                    Data:{" "}
                    {new Date(refundToDelete.refund_date).toLocaleDateString(
                      "it-IT"
                    )}
                  </p>
                  <p className="text-sm text-ink-secondary">
                    Importo: {formatCurrency(refundToDelete.current_amount)}
                  </p>
                </div>
                <p className="text-sm text-danger mt-2">
                  Questa azione eliminerà anche tutti i collegamenti alle
                  transazioni.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-edge text-ink-secondary rounded-lg hover:bg-canvas transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger transition-colors"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal per Collegare Transazioni */}
        {showLinkModal && refundToLink && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {" "}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    Collega Transazioni - {refundToLink.refund_details}
                  </h3>
                  <p className="text-sm text-ink-secondary mt-1">
                    Data rimborso:{" "}
                    {new Date(refundToLink.refund_date).toLocaleDateString(
                      "it-IT"
                    )}
                  </p>
                </div>
                <button
                  onClick={closeLinkModal}
                  className="p-1 hover:bg-inset rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Statistiche */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-primary-subtle p-4 rounded-lg">
                  <p className="text-sm font-medium text-primary">
                    Importo Rimborso
                  </p>
                  <p className="text-xl font-bold text-primary-hover">
                    {formatCurrency(refundToLink.current_amount)}
                  </p>
                </div>
                <div className="bg-success-subtle p-4 rounded-lg">
                  <p className="text-sm font-medium text-success-strong">
                    Già Collegato
                  </p>
                  <p className="text-xl font-bold text-success-strong">
                    {formatCurrency(refundToLink.total_linked_amount)}
                  </p>
                </div>
                <div className="bg-warning-subtle p-4 rounded-lg">
                  <p className="text-sm font-medium text-warning">
                    Rimanente
                  </p>
                  <p className="text-xl font-bold text-warning">
                    {formatCurrency(
                      refundToLink.current_amount -
                        refundToLink.total_linked_amount
                    )}
                  </p>
                </div>
              </div>
              {/* Transazioni già collegate */}
              {refundToLink.linked_transactions.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-ink mb-3">
                    Transazioni Collegate
                  </h4>
                  <div className="space-y-2">
                    {refundToLink.linked_transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-canvas rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-ink">
                            {transaction.transaction_details}
                          </p>
                          <p className="text-sm text-ink-muted">
                            {new Date(
                              transaction.transaction_date
                            ).toLocaleDateString("it-IT")}
                            {transaction.categories?.name &&
                              ` • ${transaction.categories.name}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-danger">
                              {formatCurrency(transaction.current_amount)}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleUnlinkTransaction(transaction.id)
                            }
                            disabled={unlinkingTransaction === transaction.id}
                            className="p-1 text-danger hover:bg-danger-subtle rounded transition-colors disabled:opacity-50"
                            title="Scollega transazione"
                          >
                            {unlinkingTransaction === transaction.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}{" "}
              {/* Tabella per selezionare transazioni */}
              {refundableTransactions.length > 0 && (
                <div className="border border-edge rounded-lg overflow-hidden">
                  <div className="bg-canvas px-4 py-3 border-b border-edge">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-ink">
                        Seleziona Transazione da Collegare
                      </h4>
                      <span className="text-sm text-ink-muted">
                        {
                          refundableTransactions.filter((t) =>
                            t.transaction_details
                              .toLowerCase()
                              .includes(transactionSearchTerm.toLowerCase())
                          ).length
                        }{" "}
                        di {refundableTransactions.length} transazioni
                      </span>
                    </div>
                    {/* Ricerca */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-muted w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Cerca transazioni..."
                        value={transactionSearchTerm}
                        onChange={(e) =>
                          setTransactionSearchTerm(e.target.value)
                        }
                        className="w-full pl-10 pr-4 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                      />
                    </div>
                  </div>

                  {/* Tabella delle transazioni */}
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-canvas sticky top-0">
                        <tr className="text-xs font-medium text-ink-muted uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Descrizione</th>
                          <th className="px-4 py-3 text-center">Data</th>
                          <th className="px-4 py-3 text-center">Importo</th>
                          <th className="px-4 py-3 text-center">Seleziona</th>
                        </tr>
                      </thead>{" "}
                      <tbody className="divide-y divide-edge">
                        {refundableTransactions.filter((transaction) =>
                          transaction.transaction_details
                            .toLowerCase()
                            .includes(transactionSearchTerm.toLowerCase())
                        ).length === 0 && transactionSearchTerm ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-8 text-center text-ink-muted"
                            >
                              <Search className="w-8 h-8 mx-auto mb-2 text-ink-muted" />
                              <p>
                                Nessuna transazione trovata per "
                                {transactionSearchTerm}"
                              </p>
                            </td>
                          </tr>
                        ) : (
                          refundableTransactions
                            .filter((transaction) =>
                              transaction.transaction_details
                                .toLowerCase()
                                .includes(transactionSearchTerm.toLowerCase())
                            )
                            .map((transaction) => (
                              <tr
                                key={transaction.id}
                                className={`hover:bg-canvas cursor-pointer transition-colors ${
                                  selectedTransactionId === transaction.id
                                    ? "bg-primary-subtle border-primary-subtle"
                                    : ""
                                }`}
                                onClick={() =>
                                  setSelectedTransactionId(
                                    selectedTransactionId === transaction.id
                                      ? ""
                                      : transaction.id
                                  )
                                }
                              >
                                <td className="px-4 py-3">
                                  <div className="font-medium text-ink text-sm">
                                    {transaction.transaction_details}
                                  </div>
                                  {transaction.categories?.name && (
                                    <div className="text-xs text-ink-muted mt-1">
                                      {transaction.categories.name}
                                    </div>
                                  )}
                                  {transaction.account_name && (
                                    <div className="text-xs text-ink-muted mt-1">
                                      Account: {transaction.account_name}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-ink">
                                  {new Date(
                                    transaction.transaction_date
                                  ).toLocaleDateString("it-IT")}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`font-semibold text-sm ${
                                      transaction.current_amount < 0
                                        ? "text-danger"
                                        : "text-success-strong"
                                    }`}
                                  >
                                    {formatCurrency(transaction.current_amount)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="radio"
                                    name="selectedTransaction"
                                    checked={
                                      selectedTransactionId === transaction.id
                                    }
                                    onChange={() =>
                                      setSelectedTransactionId(transaction.id)
                                    }
                                    className="w-4 h-4 text-primary focus:ring-primary border-edge"
                                  />{" "}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Form per importo e azioni */}
                  {selectedTransactionId && (
                    <div className="bg-canvas px-4 py-4 border-t border-edge">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-ink-secondary mb-1">
                            Importo da collegare (€)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={linkAmount}
                            onChange={(e) => setLinkAmount(e.target.value)}
                            className="w-full px-3 py-2 border border-edge rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="0.00"
                          />
                          <p className="text-xs text-ink-muted mt-1">
                            Lascia vuoto per collegare l'importo completo della
                            transazione
                          </p>
                        </div>
                        <div className="flex gap-2 justify-end">
                          {" "}
                          <button
                            onClick={() => {
                              setSelectedTransactionId("");
                              setLinkAmount("");
                            }}
                            className="px-4 py-2 border border-edge text-ink-secondary rounded-lg hover:bg-canvas transition-colors"
                          >
                            Annulla
                          </button>
                          <button
                            onClick={handleLinkTransaction}
                            disabled={
                              !selectedTransactionId || linkingTransaction
                            }
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {linkingTransaction
                              ? "Collegando..."
                              : "Collega Transazione"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {refundableTransactions.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-ink-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-ink mb-2">
                    Nessuna transazione disponibile
                  </h3>
                  <p className="text-ink-muted">
                    Tutte le transazioni sono già collegate a rimborsi o asset.
                  </p>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 bg-ink-secondary text-white rounded-lg hover:bg-ink-secondary transition-colors"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
