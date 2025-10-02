import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { isSchemaMissingError } from "@/lib/schema-errors";
import type { TransactionsReportItem, TransactionsReportResource } from "@/types/api";

export const STATUS_VALUES = ["paid", "pending", "overdue"] as const;
export type StatusValue = (typeof STATUS_VALUES)[number];

export const SORT_FIELDS = ["date", "due_date", "amount", "client_name"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const DEFAULT_PAGE_SIZE = 30;
export const DEFAULT_SORT_FIELD: SortField = "date";
export const DEFAULT_SORT_ORDER = "desc";

const filtersSchema = z.object({
  start: z
    .string()
    .regex(/^(\\d{4})-(\\d{2})-(\\d{2})$/u, "start must be YYYY-MM-DD")
    .optional(),
  end: z
    .string()
    .regex(/^(\\d{4})-(\\d{2})-(\\d{2})$/u, "end must be YYYY-MM-DD")
    .optional(),
  status: z.enum(STATUS_VALUES).optional(),
  search: z.string().trim().max(120).optional(),
});

const listSchema = filtersSchema.extend({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.enum(SORT_FIELDS).optional(),
  order: z.enum(["asc", "desc"] as const).optional(),
});

const exportSchema = filtersSchema.extend({
  format: z.enum(["csv", "xlsx", "pdf"] as const),
  sort: z.enum(SORT_FIELDS).optional(),
  order: z.enum(["asc", "desc"] as const).optional(),
});

export type ParsedFilters = z.infer<typeof filtersSchema>;

export type ParsedListParams = {
  filters: ParsedFilters;
  page: number;
  pageSize: number;
  sort: {
    field: SortField;
    order: "asc" | "desc";
  };
};

export type ParsedExportParams = {
  filters: ParsedFilters;
  sort: {
    field: SortField;
    order: "asc" | "desc";
  };
  format: "csv" | "xlsx" | "pdf";
};

type QueryFilters = {
  start?: string;
  end?: string;
  status?: StatusValue;
  search?: string;
};

type TransactionRow = {
  id?: string;
  owner_id?: string;
  client_name?: string | null;
  phone?: string | null;
  date?: string | null;
  amount?: number | null;
  due_date?: string | null;
  status?: string | null;
};

export function parseListParams(searchParams: URLSearchParams): ParsedListParams {
  const parsed = listSchema.parse(Object.fromEntries(searchParams.entries()));

  if (parsed.start && parsed.end && parsed.start > parsed.end) {
    throw new ApiError("Invalid date range", 400, { code: "INVALID_RANGE" });
  }

  return {
    filters: parsed,
    page: parsed.page ?? 1,
    pageSize: parsed.pageSize ?? DEFAULT_PAGE_SIZE,
    sort: {
      field: parsed.sort ?? DEFAULT_SORT_FIELD,
      order: parsed.order ?? DEFAULT_SORT_ORDER,
    },
  };
}

export function parseExportParams(searchParams: URLSearchParams): ParsedExportParams {
  const parsed = exportSchema.parse(Object.fromEntries(searchParams.entries()));

  if (parsed.start && parsed.end && parsed.start > parsed.end) {
    throw new ApiError("Invalid date range", 400, { code: "INVALID_RANGE" });
  }

  return {
    filters: parsed,
    sort: {
      field: parsed.sort ?? DEFAULT_SORT_FIELD,
      order: parsed.order ?? DEFAULT_SORT_ORDER,
    },
    format: parsed.format,
  };
}

function toQueryFilters(filters: ParsedFilters): QueryFilters {
  const next: QueryFilters = {};

  if (filters.start) {
    next.start = `${filters.start}T00:00:00.000Z`;
  }

  if (filters.end) {
    next.end = `${filters.end}T23:59:59.999Z`;
  }

  if (filters.status) {
    next.status = filters.status;
  }

  if (filters.search) {
    next.search = filters.search.trim();
  }

  return next;
}

export function buildTransactionsQuery(
  supabase: ReturnType<typeof import("@/lib/supabase-route").createSupabaseRouteClient>,
  userId: string,
  filters: ParsedFilters,
  columns: string,
  options?: {
    count?: "exact" | "planned" | "estimated";
    head?: boolean;
  }
) {
  const queryFilters = toQueryFilters(filters);
  let query = supabase.from("transactions").select(columns, options).eq("owner_id", userId);

  if (queryFilters.start) {
    query = query.gte("date", queryFilters.start);
  }

  if (queryFilters.end) {
    query = query.lte("date", queryFilters.end);
  }

  if (queryFilters.status) {
    query = query.eq("status", queryFilters.status);
  }

  if (queryFilters.search) {
    const term = queryFilters.search.replace(/[%_]/g, "");
    if (term) {
      query = query.or(`client_name.ilike.%${term}%,phone.ilike.%${term}%`);
    }
  }

  return query;
}

function normalizeStatus(value: string | null | undefined): StatusValue {
  if (!value) {
    return "pending";
  }

  const normalized = value.toLowerCase();

  if (normalized === "paid" || normalized === "pago") {
    return "paid";
  }

  if (normalized === "overdue" || normalized === "vencido" || normalized === "late") {
    return "overdue";
  }

  return "pending";
}

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function mapTransaction(row: TransactionRow): TransactionsReportItem {
  return {
    clientName: row.client_name ?? "Cliente",
    phone: row.phone ?? null,
    date: row.date ?? null,
    amount: toNumber(row.amount),
    dueDate: row.due_date ?? null,
    status: normalizeStatus(row.status),
  };
}

export function computeSummary(rows: TransactionRow[]) {
  const customers = new Set<string>();
  let total = 0;

  rows.forEach((row) => {
    if (row.client_name) {
      customers.add(row.client_name.trim().toLowerCase());
    }

    const amount = toNumber(row.amount);
    if (amount !== null) {
      total += amount;
    }
  });

  return {
    customers: customers.size,
    total,
  };
}

export function emptyReportResponse(params: ParsedListParams): TransactionsReportResource {
  return {
    items: [],
    summary: {
      customers: 0,
      total: 0,
    },
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      totalItems: 0,
      totalPages: 1,
    },
    filters: {
      start: params.filters.start ?? null,
      end: params.filters.end ?? null,
      status: params.filters.status ?? null,
      search: params.filters.search ?? null,
    },
    sort: params.sort,
  };
}

export function handleSchemaMissing(error: unknown) {
  if (!error) {
    return false;
  }

  return isSchemaMissingError(
    error as { code?: string; message?: string | null; details?: string | null }
  );
}
