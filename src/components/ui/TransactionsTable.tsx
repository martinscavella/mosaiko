"use client";

import { ReactNode, useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  RotateCcw,
  Package,
} from "lucide-react";
import { Transaction } from "@/lib/financeCache";

export interface FilterOption {
  id: string;
  label: string;
  icon: React.ElementType;
  filterFn: (transaction: Transaction) => boolean;
}

export interface TransactionTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (transaction: Transaction) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TransactionsTableProps {
  data: Transaction[];
  columns: TransactionTableColumn[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  className?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
  // Nuove props per i filtri
  enableFilters?: boolean;
  filterOptions?: FilterOption[];  enableSearch?: boolean;
  searchPlaceholder?: string;  searchFields?: string[];
  // Controlli per filtri e ricerca (controlled components)
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  selectedFilter?: string;
  onFilterChange?: (filter: string) => void;  // Nuove props per filtri avanzati
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  selectedSubcategory?: string;
  onSubcategoryChange?: (subcategory: string) => void;
  selectedDateRange?: string;
  onDateRangeChange?: (range: string) => void;
}

export default function TransactionsTable({
  data,
  columns,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  loading = false,
  emptyMessage = "Nessuna transazione trovata",
  emptyIcon,
  className = "",
  sortBy,
  sortOrder,
  onSort,
  enableFilters = false,
  filterOptions = [],  enableSearch = false,
  searchPlaceholder = "Cerca...",
  searchFields = ["transaction_details"],
  searchTerm: controlledSearchTerm,
  onSearchChange,
  selectedFilter: controlledSelectedFilter,
  onFilterChange,  selectedCategory: controlledSelectedCategory,
  onCategoryChange,
  selectedSubcategory: controlledSelectedSubcategory,
  onSubcategoryChange,
  selectedDateRange: controlledSelectedDateRange,
  onDateRangeChange,
}: TransactionsTableProps) {  // Stati interni per filtri e ricerca (usati solo se non controllati)
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [internalSelectedFilter, setInternalSelectedFilter] = useState("all");
  const [internalSelectedCategory, setInternalSelectedCategory] = useState("all");
  const [internalSelectedSubcategory, setInternalSelectedSubcategory] = useState("all");
  const [internalSelectedDateRange, setInternalSelectedDateRange] = useState("all");
  
  // Usa i valori controllati se forniti, altrimenti usa gli stati interni
  const searchTerm = controlledSearchTerm !== undefined ? controlledSearchTerm : internalSearchTerm;
  const selectedFilter = controlledSelectedFilter !== undefined ? controlledSelectedFilter : internalSelectedFilter;
  const selectedCategory = controlledSelectedCategory !== undefined ? controlledSelectedCategory : internalSelectedCategory;  const selectedSubcategory = controlledSelectedSubcategory !== undefined ? controlledSelectedSubcategory : internalSelectedSubcategory;
  const selectedDateRange = controlledSelectedDateRange !== undefined ? controlledSelectedDateRange : internalSelectedDateRange;

  // Estrai categorie e sottocategorie uniche dai dati
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    data.forEach(transaction => {
      if (transaction.categories?.name) {
        categories.add(transaction.categories.name);
      }
    });
    return Array.from(categories).sort();
  }, [data]);

  const availableSubcategories = useMemo(() => {
    const subcategories = new Set<string>();
    data.forEach(transaction => {
      if (transaction.subcategories?.name && 
          (selectedCategory === "all" || transaction.categories?.name === selectedCategory)) {
        subcategories.add(transaction.subcategories.name);
      }
    });
    return Array.from(subcategories).sort();
  }, [data, selectedCategory]);
  // Opzioni per il filtro data
  const dateRangeOptions = [
    { id: "all", label: "Tutte le date" },
    { id: "today", label: "Oggi" },
    { id: "week", label: "Ultima settimana" },
    { id: "month", label: "Ultimo mese" },
    { id: "quarter", label: "Ultimo trimestre" },
    { id: "year", label: "Ultimo anno" },  ];

  // Filtri di default migliorati
  const defaultFilters: FilterOption[] = [
    {
      id: "all",
      label: "Tutte",
      icon: Calendar,
      filterFn: () => true,
    },
    {
      id: "income",
      label: "Entrate",
      icon: TrendingUp,
      filterFn: (transaction: Transaction) => 
        transaction.current_amount > 0 || transaction.transaction_type === 'income',
    },    {
      id: "expense",
      label: "Uscite",
      icon: TrendingDown,
      filterFn: (transaction: Transaction) =>
        transaction.current_amount < 0 || transaction.transaction_type === 'expense',
    },
    {
      id: "transfer",
      label: "Trasferimenti",
      icon: ArrowLeftRight,
      filterFn: (transaction: Transaction) =>
        transaction.transaction_type === "transfer",
    },
    {
      id: "refunded",
      label: "Rimborsate",
      icon: RotateCcw,
      filterFn: (transaction: Transaction) => 
        transaction.is_refunded === true,
    },
    {
      id: "assets",
      label: "Con Asset",
      icon: Package,
      filterFn: (transaction: Transaction) =>
        transaction.asset_id !== null && transaction.asset_id !== undefined,    },
  ];
  const activeFilters = filterOptions.length > 0 ? filterOptions : defaultFilters;

  // Funzione helper per accedere a proprietà annidate
  const getNestedValue = (obj: unknown, path: string): unknown => {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && current !== null && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  };  // Dati filtrati e ordinati
  const processedData = useMemo(() => {
    // Funzione helper per filtrare in base alla data
    const isInDateRange = (transactionDate: string, range: string): boolean => {
      if (range === "all") return true;
      
      const date = new Date(transactionDate);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (range) {
        case "today":
          return date >= startOfToday;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return date >= weekAgo;
        case "month":
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return date >= monthAgo;
        case "quarter":
          const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          return date >= quarterAgo;
        case "year":
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return date >= yearAgo;
        default:
          return true;
      }
    };
    // Funzione di ricerca ottimizzata (spostata qui per evitare problemi con dependencies)
    const searchInTransaction = (transaction: Transaction, term: string): boolean => {
      if (!term) return true;
      
      const searchLower = term.toLowerCase();
      
      // Ricerca nei campi specificati
      for (const field of searchFields) {
        const value = getNestedValue(transaction, field);
        if (value && String(value).toLowerCase().includes(searchLower)) {
          return true;
        }
      }
      
      // Ricerca aggiuntiva in campi comuni
      if (transaction.account_name?.toLowerCase().includes(searchLower)) return true;
      if (transaction.categories?.name?.toLowerCase().includes(searchLower)) return true;
      if (transaction.subcategories?.name?.toLowerCase().includes(searchLower)) return true;
      
      return false;
    };

    let filtered = [...data];    // Applicazione filtri
    if (enableFilters && selectedFilter !== "all") {
      const activeFilterOption = activeFilters.find(f => f.id === selectedFilter);
      if (activeFilterOption) {
        filtered = filtered.filter(activeFilterOption.filterFn);
      }
    }

    // Filtro per categoria
    if (selectedCategory !== "all") {
      filtered = filtered.filter(transaction => 
        transaction.categories?.name === selectedCategory
      );
    }

    // Filtro per sottocategoria
    if (selectedSubcategory !== "all") {
      filtered = filtered.filter(transaction => 
        transaction.subcategories?.name === selectedSubcategory
      );
    }

    // Filtro per intervallo di date
    if (selectedDateRange !== "all") {
      filtered = filtered.filter(transaction => 
        isInDateRange(transaction.transaction_date, selectedDateRange)
      );
    }

    // Applicazione ricerca
    if (enableSearch && searchTerm) {
      filtered = filtered.filter(transaction => 
        searchInTransaction(transaction, searchTerm)
      );
    }

    // Applicazione ordinamento
    if (sortBy && onSort) {
      filtered.sort((a, b) => {
        let aValue: unknown;
        let bValue: unknown;

        switch (sortBy) {
          case "transaction_date":
            aValue = new Date(a.transaction_date).getTime();
            bValue = new Date(b.transaction_date).getTime();
            break;
          case "current_amount":
            aValue = a.current_amount;
            bValue = b.current_amount;
            break;
          default:
            aValue = getNestedValue(a, sortBy) || "";
            bValue = getNestedValue(b, sortBy) || "";
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        } else {
          const aStr = String(aValue);
          const bStr = String(bValue);
          return sortOrder === "asc" 
            ? aStr.localeCompare(bStr) 
            : bStr.localeCompare(aStr);
        }
      });
    }    return filtered;
  }, [data, selectedFilter, searchTerm, sortBy, sortOrder, enableFilters, enableSearch, activeFilters, searchFields, onSort, selectedCategory, selectedSubcategory, selectedDateRange]);
  // Reset pagina quando cambiano i filtri
  const handleFilterChange = (newFilter: string) => {
    if (onFilterChange) {
      onFilterChange(newFilter);
    } else {
      setInternalSelectedFilter(newFilter);
    }
    onPageChange(1);
  };
  const handleSearchChange = (newSearch: string) => {
    if (onSearchChange) {
      onSearchChange(newSearch);
    } else {
      setInternalSearchTerm(newSearch);
    }
    onPageChange(1);
  };

  const handleCategoryChange = (newCategory: string) => {
    if (onCategoryChange) {
      onCategoryChange(newCategory);
    } else {
      setInternalSelectedCategory(newCategory);
    }
    // Reset sottocategoria quando cambia la categoria
    if (onSubcategoryChange) {
      onSubcategoryChange("all");
    } else {
      setInternalSelectedSubcategory("all");
    }
    onPageChange(1);
  };

  const handleSubcategoryChange = (newSubcategory: string) => {
    if (onSubcategoryChange) {
      onSubcategoryChange(newSubcategory);
    } else {
      setInternalSelectedSubcategory(newSubcategory);
    }
    onPageChange(1);
  };

  const handleDateRangeChange = (newDateRange: string) => {
    if (onDateRangeChange) {
      onDateRangeChange(newDateRange);
    } else {
      setInternalSelectedDateRange(newDateRange);
    }
    onPageChange(1);
  };// Calcoli per la paginazione usando i dati processati
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = processedData.slice(startIndex, endIndex);

  // Gestione ordinamento
  const handleSort = (columnKey: string) => {
    if (!onSort) return;

    let newOrder: "asc" | "desc" = "asc";
    if (sortBy === columnKey && sortOrder === "asc") {
      newOrder = "desc";
    }
    onSort(columnKey, newOrder);
  };

  const getSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  if (loading) {
    return (
      <div
        className={`bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden ${className}`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.headerClassName || ""
                    }`}
                  >
                    <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...Array(itemsPerPage)].map((_, i) => (
                <tr key={i}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4">
                      <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
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
  if (processedData.length === 0 && !loading) {
    return (
      <div
        className={`bg-white border border-gray-200 shadow-sm rounded-lg ${className}`}
      >        {/* Controlli filtri anche quando vuoto */}
        {(enableSearch || enableFilters) && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="space-y-3">
              {/* Prima riga: Ricerca */}
              {enableSearch && (
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Seconda riga: Filtri tipo transazione */}
              {enableFilters && (
                <div>
                  <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter) => {
                      const IconComponent = filter.icon;
                      return (
                        <button
                          key={filter.id}
                          onClick={() => handleFilterChange(filter.id)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                            selectedFilter === filter.id
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          <IconComponent className="h-3.5 w-3.5 mr-1.5" />
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Terza riga: Filtri avanzati */}
              <div className="flex flex-wrap gap-3 items-center">
                {/* Filtro Categoria */}
                {availableCategories.length > 0 && (
                  <div className="min-w-0">
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                    >
                      <option value="all">Tutte le categorie</option>
                      {availableCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filtro Sottocategoria */}
                {availableSubcategories.length > 0 && (
                  <div className="min-w-0">
                    <select
                      value={selectedSubcategory}
                      onChange={(e) => handleSubcategoryChange(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                    >
                      <option value="all">Tutte le sottocategorie</option>
                      {availableSubcategories.map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filtro Data */}
                <div className="min-w-0">
                  <select
                    value={selectedDateRange}
                    onChange={(e) => handleDateRangeChange(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                  >
                    {dateRangeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center py-16">
          {emptyIcon && (
            <div className="mx-auto mb-6 opacity-50">{emptyIcon}</div>
          )}
          <div className="space-y-3">
            <p className="text-gray-700 text-xl font-semibold">
              {searchTerm || selectedFilter !== "all" 
                ? "Nessuna transazione trovata con i filtri attuali" 
                : emptyMessage}
            </p>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              {searchTerm || selectedFilter !== "all"
                ? "Prova a modificare i filtri o la ricerca per vedere più risultati."
                : "Le transazioni che aggiungerai appariranno qui. Inizia aggiungendo la tua prima transazione."}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden ${className}`}
    >      {/* Controlli filtri e ricerca - Versione compatta */}
      {(enableSearch || enableFilters) && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="space-y-3">
            {/* Prima riga: Ricerca */}
            {enableSearch && (
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* Seconda riga: Filtri tipo transazione */}
            {enableFilters && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((filter) => {
                    const IconComponent = filter.icon;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => handleFilterChange(filter.id)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                          selectedFilter === filter.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <IconComponent className="h-3.5 w-3.5 mr-1.5" />
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Terza riga: Filtri avanzati */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Filtro Categoria */}
              {availableCategories.length > 0 && (
                <div className="min-w-0">
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                  >
                    <option value="all">Tutte le categorie</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro Sottocategoria */}
              {availableSubcategories.length > 0 && (
                <div className="min-w-0">
                  <select
                    value={selectedSubcategory}
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                  >
                    <option value="all">Tutte le sottocategorie</option>
                    {availableSubcategories.map((subcategory) => (
                      <option key={subcategory} value={subcategory}>
                        {subcategory}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro Data */}
              <div className="min-w-0">
                <select
                  value={selectedDateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
                >
                  {dateRangeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Riepilogo filtri attivi */}
            {(selectedFilter !== "all" || selectedCategory !== "all" || selectedSubcategory !== "all" || selectedDateRange !== "all") && (
              <div className="text-xs text-gray-600 border-t border-gray-200 pt-2">
                <span className="inline-flex items-center">
                  <div className="h-1.5 w-1.5 bg-blue-600 rounded-full mr-1.5"></div>
                  {processedData.length} risultato{processedData.length !== 1 ? 'i' : ''} con i filtri attuali
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabella semplice */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-gray-200">
          <colgroup>
            <col className="w-24 sm:w-28" />
            <col className="min-w-0 max-w-xs" />
            <col className="w-24 sm:w-32" />
            <col className="w-24 sm:w-32" />
            <col className="w-24 sm:w-32" />
          </colgroup>
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.headerClassName || ""
                  }`}
                >
                  {column.sortable && onSort ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="group inline-flex items-center gap-1 hover:text-gray-700 transition-colors"
                    >
                      {column.label}
                      <span className="text-gray-400 group-hover:text-gray-600">
                        {getSortIcon(column.key)}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((transaction, index) => (
              <tr
                key={transaction.id || index}
                className="hover:bg-gray-50 transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 ${column.className || ""}`}
                  >
                    {column.render ? column.render(transaction) : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginazione con controlli */}
      {totalPages > 1 && (
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span>-
                <span className="font-medium">
                  {Math.min(endIndex, processedData.length)}
                </span>{" "}
                di <span className="font-medium">{processedData.length}</span> risultati
                {(searchTerm || selectedFilter !== "all") && data.length !== processedData.length && (
                  <span className="text-gray-500"> (filtrati da {data.length})</span>
                )}
              </div>

              <select
                value={itemsPerPage}
                onChange={(e) => {
                  onItemsPerPageChange(Number(e.target.value));
                  onPageChange(1);
                }}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10 per pagina</option>
                <option value={25}>25 per pagina</option>
                <option value={50}>50 per pagina</option>
                <option value={100}>100 per pagina</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
