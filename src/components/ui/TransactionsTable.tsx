"use client";

import { ReactNode } from "react";
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
import type { TransactionFilterType } from "@/hooks/useTransactionFilters";

export interface TransactionTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (transaction: Transaction) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface FilterChip {
  id: TransactionFilterType;
  label: string;
  icon: React.ElementType;
}

const FILTER_CHIPS: FilterChip[] = [
  { id: "all", label: "Tutte", icon: Calendar },
  { id: "income", label: "Entrate", icon: TrendingUp },
  { id: "expense", label: "Uscite", icon: TrendingDown },
  { id: "transfer", label: "Trasferimenti", icon: ArrowLeftRight },
  { id: "refunded", label: "Rimborsate", icon: RotateCcw },
  { id: "assets", label: "Con Asset", icon: Package },
];

const DATE_RANGE_OPTIONS = [
  { id: "all", label: "Tutte le date" },
  { id: "today", label: "Oggi" },
  { id: "week", label: "Ultima settimana" },
  { id: "month", label: "Ultimo mese" },
  { id: "quarter", label: "Ultimo trimestre" },
  { id: "year", label: "Ultimo anno" },
];

export interface TransactionsTableProps {
  /** Transazioni gia' filtrate e ordinate a monte (es. da useTransactionFilters) */
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
  // Filtri: componente controllato, la logica di filtro vive nel chiamante
  // (useTransactionFilters) per evitare di duplicarla qui.
  enableFilters?: boolean;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedFilter: TransactionFilterType;
  onFilterChange: (filter: TransactionFilterType) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedSubcategory: string;
  onSubcategoryChange: (subcategory: string) => void;
  selectedDateRange: string;
  onDateRangeChange: (range: string) => void;
  // Opzioni per i select categoria/sottocategoria, derivate dal chiamante
  // sul set COMPLETO di transazioni (non da `data`, che e' gia' filtrato)
  availableCategories?: string[];
  availableSubcategories?: string[];
  /** Numero di risultati prima della paginazione (per il riepilogo filtri) */
  totalUnpaginatedCount?: number;
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
  enableSearch = false,
  searchPlaceholder = "Cerca...",
  searchTerm,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  selectedCategory,
  onCategoryChange,
  selectedSubcategory,
  onSubcategoryChange,
  selectedDateRange,
  onDateRangeChange,
  availableCategories = [],
  availableSubcategories = [],
}: TransactionsTableProps) {
  // Calcoli per la paginazione: `data` arriva gia' filtrato e ordinato
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

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

  const filtersBar = (enableSearch || enableFilters) && (
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
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  onPageChange(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
              />
            </div>
          </div>
        )}

        {/* Seconda riga: Filtri tipo transazione */}
        {enableFilters && (
          <div>
            <div className="flex flex-wrap gap-2">
              {FILTER_CHIPS.map((filter) => {
                const IconComponent = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => {
                      onFilterChange(filter.id);
                      onPageChange(1);
                    }}
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
                onChange={(e) => {
                  onCategoryChange(e.target.value);
                  onPageChange(1);
                }}
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
                onChange={(e) => {
                  onSubcategoryChange(e.target.value);
                  onPageChange(1);
                }}
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
              onChange={(e) => {
                onDateRangeChange(e.target.value);
                onPageChange(1);
              }}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
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
              {data.length} risultato{data.length !== 1 ? 'i' : ''} con i filtri attuali
            </span>
          </div>
        )}
      </div>
    </div>
  );

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

  if (data.length === 0) {
    return (
      <div
        className={`bg-white border border-gray-200 shadow-sm rounded-lg ${className}`}
      >
        {filtersBar}

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
    >
      {filtersBar}

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
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span>-
                <span className="font-medium">
                  {Math.min(endIndex, data.length)}
                </span>{" "}
                di <span className="font-medium">{data.length}</span> risultati
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
