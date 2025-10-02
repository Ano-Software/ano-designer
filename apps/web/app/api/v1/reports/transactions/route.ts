import { handleApiRequest } from "@/lib/api/handler";
import { success } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { mapPostgrestError } from "@/lib/api/postgrest";
import type { TransactionsReportResource } from "@/types/api";
import {
  parseListParams,
  buildTransactionsQuery,
  mapTransaction,
  computeSummary,
  emptyReportResponse,
  handleSchemaMissing,
} from "./shared";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Record<string, string> }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user, searchParams }) => {
      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      const params = parseListParams(searchParams);
      const { filters, page, pageSize, sort } = params;
      const rangeStart = (page - 1) * pageSize;
      const rangeEnd = rangeStart + pageSize - 1;

      const baseQuery = buildTransactionsQuery(
        supabase,
        user.id,
        filters,
        "client_name, phone, date, amount, due_date, status",
        { count: "exact" }
      ).order(sort.field, { ascending: sort.order === "asc" });

      const { data, error, count } = await baseQuery.range(rangeStart, rangeEnd);

      if (error) {
        if (handleSchemaMissing(error)) {
          return success<TransactionsReportResource>(emptyReportResponse(params));
        }

        throw mapPostgrestError(error, "Unable to load transactions");
      }

      const summaryQuery = buildTransactionsQuery(
        supabase,
        user.id,
        filters,
        "client_name, amount"
      );

      const { data: summaryRows, error: summaryError } = await summaryQuery;

      if (summaryError) {
        if (!handleSchemaMissing(summaryError)) {
          throw mapPostgrestError(summaryError, "Unable to compute summary");
        }
      }

      const items = (data ?? []).map((row) => mapTransaction(row));
      const summaryData = summaryRows ?? [];
      const summary = computeSummary(summaryData);
      const totalItems = typeof count === "number" ? count : summaryData.length;
      const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;

      const response: TransactionsReportResource = {
        items,
        summary,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
        },
        filters: {
          start: filters.start ?? null,
          end: filters.end ?? null,
          status: filters.status ?? null,
          search: filters.search ?? null,
        },
        sort,
      };

      return success<TransactionsReportResource>(response);
    },
    {
      auth: "required",
      rateLimit: {
        limit: 60,
      },
    }
  );
}
