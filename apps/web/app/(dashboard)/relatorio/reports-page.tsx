"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import type {
  TransactionsReportResource,
  TransactionStatus,
  TransactionsReportSortField,
} from "@/types/api";

const PAGE_SIZE = 30;
const DEFAULT_SORT_FIELD: TransactionsReportSortField = "date";
const DEFAULT_SORT_ORDER: "asc" | "desc" = "desc";

const statusOptions: Array<{ label: string; value: "" | TransactionStatus }> = [
  { label: "Todos", value: "" },
  { label: "Pago", value: "paid" },
  { label: "Pendente", value: "pending" },
  { label: "Vencido", value: "overdue" },
];

const statusTone: Record<TransactionStatus, string> = {
  paid: "border-emerald-500/20 bg-emerald-500/15 text-emerald-200",
  pending: "border-amber-400/20 bg-amber-400/15 text-amber-100",
  overdue: "border-rose-500/20 bg-rose-500/15 text-rose-200",
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Vencido",
};

type FiltersState = {
  start: string | null;
  end: string | null;
  status: "" | TransactionStatus;
  search: string;
};

type TableSort = {
  field: TransactionsReportSortField;
  order: "asc" | "desc";
};

type ReportState = {
  data: TransactionsReportResource | null;
  loading: boolean;
  error: string | null;
};

type ColumnConfig = {
  key: TransactionsReportSortField | "phone" | "status";
  label: string;
  sortable: boolean;
};

const INITIAL_FILTERS: FiltersState = {
  start: null,
  end: null,
  status: "",
  search: "",
};

const INITIAL_STATE: ReportState = {
  data: null,
  loading: true,
  error: null,
};

function formatCurrency(amount: number | null) {
  if (amount === null) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("pt-BR");
}

function statusLabel(status: TransactionStatus) {
  return STATUS_LABELS[status] ?? status;
}

function formatPhone(value: string | null) {
  if (!value) {
    return "-";
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return value;
}

export function ReportsPage() {
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [sort, setSort] = useState<TableSort>({
    field: DEFAULT_SORT_FIELD,
    order: DEFAULT_SORT_ORDER,
  });
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ReportState>(INITIAL_STATE);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [filters.search]);

  const columns: ColumnConfig[] = useMemo(
    () => [
      { key: "client_name", label: "Cliente", sortable: true },
      { key: "phone", label: "Telefone", sortable: false },
      { key: "date", label: "Data", sortable: true },
      { key: "amount", label: "Valor", sortable: true },
      { key: "due_date", label: "Vencimento", sortable: true },
      { key: "status", label: "Status", sortable: false },
    ],
    []
  );

  const statusIcon: Record<TransactionStatus, string> = useMemo(
    () => ({
      paid: "\u2705",
      pending: "\u23F3",
      overdue: "\u274C",
    }),
    []
  );

  const loadData = useCallback(
    (signal?: AbortSignal) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const params = {
        start: filters.start ?? undefined,
        end: filters.end ?? undefined,
        status: filters.status || undefined,
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
        sort: sort.field,
        order: sort.order,
      };

      apiClient
        .getTransactionsReport(params, { signal })
        .then((response) => {
          setState({ data: response.data, loading: false, error: null });
        })
        .catch((error) => {
          if (signal?.aborted) {
            return;
          }

          const message =
            error instanceof ApiClientError
              ? error.message
              : "Nao foi possivel carregar o relatorio.";
          setState((prev) => ({ data: prev.data, loading: false, error: message }));
        });
    },
    [filters.start, filters.end, filters.status, debouncedSearch, page, sort.field, sort.order]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const handleDateChange = useCallback((key: "start" | "end", value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || null }));
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: "" | TransactionStatus) => {
    setFilters((prev) => ({ ...prev, status: value }));
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((field: TransactionsReportSortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return {
          field,
          order: prev.order === "asc" ? "desc" : "asc",
        };
      }

      return {
        field,
        order: field === "client_name" ? "asc" : DEFAULT_SORT_ORDER,
      };
    });
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const handleExport = useCallback(
    async (format: "csv" | "xlsx" | "pdf") => {
      try {
        setExporting(format);
        const params = {
          start: filters.start ?? undefined,
          end: filters.end ?? undefined,
          status: filters.status || undefined,
          search: debouncedSearch || undefined,
          sort: sort.field,
          order: sort.order,
        };

        const response = await apiClient.exportTransactionsReport(format, params);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        const fileName =
          response.headers.get("content-disposition")?.split("filename=")?.[1]?.replace(/"/g, "") ??
          `relatorio.${format}`;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        const message =
          error instanceof ApiClientError
            ? error.message
            : "Nao foi possivel exportar o relatorio.";
        setState((prev) => ({ ...prev, error: message }));
      } finally {
        setExporting(null);
      }
    },
    [filters.start, filters.end, filters.status, debouncedSearch, sort.field, sort.order]
  );

  const items = state.data?.items ?? [];
  const summary = state.data?.summary ?? { customers: 0, total: 0 };
  const pagination = state.data?.pagination ?? {
    page,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  };

  const showSkeleton = state.loading && !state.data;
  const isEmpty = !state.loading && !state.error && items.length === 0;
  const showPagination = pagination.totalItems > PAGE_SIZE;

  const sortIndicator = useMemo(
    () => ({
      asc: "\u2191",
      desc: "\u2193",
    }),
    []
  );

  const retryFetch = useCallback(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold uppercase tracking-wider text-white/60"
                htmlFor="start-date"
              >
                Data inicial
              </label>
              <input
                id="start-date"
                type="date"
                value={filters.start ?? ""}
                onChange={(event) => handleDateChange("start", event.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold uppercase tracking-wider text-white/60"
                htmlFor="end-date"
              >
                Data final
              </label>
              <input
                id="end-date"
                type="date"
                value={filters.end ?? ""}
                onChange={(event) => handleDateChange("end", event.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold uppercase tracking-wider text-white/60"
                htmlFor="status-filter"
              >
                Status
              </label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(event) =>
                  handleStatusChange(event.target.value as "" | TransactionStatus)
                }
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
              >
                {statusOptions.map((option) => (
                  <option key={option.label} value={option.value} className="text-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold uppercase tracking-wider text-white/60"
                htmlFor="search-field"
              >
                Busca
              </label>
              <input
                id="search-field"
                type="search"
                placeholder="Nome ou telefone"
                value={filters.search}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#e2b23b] focus:outline-none focus:ring-2 focus:ring-[#e2b23b]/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={exporting === "csv" || state.loading}
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              {exporting === "csv" ? "Gerando..." : "Exportar CSV"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("xlsx")}
              disabled={exporting === "xlsx" || state.loading}
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              {exporting === "xlsx" ? "Gerando..." : "Exportar Excel"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={exporting === "pdf" || state.loading}
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              {exporting === "pdf" ? "Gerando..." : "Exportar PDF"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-sm backdrop-blur">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Quantidade de clientes
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{summary.customers}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Total do periodo
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {formatCurrency(summary.total)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6 shadow-sm backdrop-blur">
        {showSkeleton ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 w-full animate-pulse rounded-xl bg-white/10" />
            ))}
          </div>
        ) : state.error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
            <div className="flex items-center justify-between gap-4">
              <p>{state.error}</p>
              <button
                type="button"
                onClick={retryFetch}
                className="rounded-full border border-rose-100/40 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-100/10"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/60">
            Nenhum resultado no periodo selecionado.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm text-white/80">
                <thead className="text-xs uppercase tracking-wide text-white/60">
                  <tr>
                    {columns.map((column) => {
                      if (!column.sortable) {
                        return (
                          <th
                            key={column.key}
                            className="border-b border-white/10 px-4 py-3 font-semibold"
                          >
                            {column.label}
                          </th>
                        );
                      }

                      const isActive = sort.field === column.key;
                      const ariaSort: "ascending" | "descending" | "none" = isActive
                        ? sort.order === "asc"
                          ? "ascending"
                          : "descending"
                        : "none";

                      return (
                        <th
                          key={column.key}
                          className="border-b border-white/10 px-4 py-3 font-semibold"
                          aria-sort={ariaSort}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key as TransactionsReportSortField)}
                            className="flex items-center gap-1 text-white/80 transition hover:text-white"
                          >
                            {column.label}
                            {isActive ? (
                              <span className="text-xs">{sortIndicator[sort.order]}</span>
                            ) : null}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item, index) => (
                    <tr key={`${item.clientName}-${index}`} className="transition hover:bg-white/5">
                      <td className="px-4 py-3 text-white">{item.clientName}</td>
                      <td className="px-4 py-3">{formatPhone(item.phone)}</td>
                      <td className="px-4 py-3">{formatDate(item.date)}</td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {formatCurrency(item.amount ?? 0)}
                      </td>
                      <td className="px-4 py-3">{formatDate(item.dueDate)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[item.status]}`}
                        >
                          <span>{statusIcon[item.status]}</span>
                          <span>{statusLabel(item.status)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showPagination ? (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm text-white/80 sm:flex-row">
                <span>
                  Pagina {pagination.page} de {pagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                    disabled={pagination.page <= 1 || state.loading}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))
                    }
                    disabled={pagination.page >= pagination.totalPages || state.loading}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                  >
                    Proximo
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
