export type PaginationInput = {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
};

export type Pagination = {
  page: number;
  pageSize: number;
  offset: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

const DEFAULTS: Required<PaginationInput> = {
  defaultPage: 1,
  defaultPageSize: 10,
  maxPageSize: 50,
};

export function parsePagination(
  searchParams: URLSearchParams,
  options?: PaginationInput
): Pagination {
  const config = { ...DEFAULTS, ...options };
  const rawPage = searchParams.get("page");
  const rawPageSize = searchParams.get("pageSize");

  const page = clampInteger(rawPage, config.defaultPage, 1);
  const pageSize = clampInteger(rawPageSize, config.defaultPageSize, 1, config.maxPageSize);
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

export function buildPaginationMeta(totalItems: number, pagination: Pagination): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / pagination.pageSize));
  const page = Math.min(pagination.page, totalPages);

  return {
    page,
    pageSize: pagination.pageSize,
    totalItems,
    totalPages,
  };
}

function clampInteger(value: string | null, fallback: number, min: number, max?: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < min) {
    return fallback;
  }

  if (typeof max === "number" && parsed > max) {
    return max;
  }

  return parsed;
}
