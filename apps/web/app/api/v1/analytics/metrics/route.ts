import { z } from "zod";
import { createOptionsHandler } from "@/lib/api/options";
import { handleApiRequest } from "@/lib/api/handler";
import { success, error as errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { mapPostgrestError } from "@/lib/api/postgrest";
import { isSchemaMissingError, SCHEMA_MISSING_ERROR } from "@/lib/schema-errors";
export const runtime = "nodejs";

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/u, "Month must follow YYYY-MM format"),
});

type MetricsResponse = {
  period: {
    month: string;
    range: {
      start: string;
      end: string;
    };
  };
  metrics: {
    sales: number;
    revenue: {
      amount: number;
      currency: string;
    };
    pendingProjects: number;
  };
};

function toDateRange(month: string) {
  const [year, monthPart] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthPart - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthPart, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function GET(request: Request, context: { params: Record<string, string> }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user, searchParams }) => {
      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      const parsedQuery = querySchema.parse(Object.fromEntries(searchParams.entries()));
      const { start, end } = toDateRange(parsedQuery.month);
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      const monthQuery = supabase.from("projects") as any;
      const { data: monthProjects, error: monthError } = await monthQuery
        .select("id")
        .eq("owner_id", user.id)
        .gte("created_at", startIso)
        .lt("created_at", endIso);

      if (monthError) {
        if (isSchemaMissingError(monthError)) {
          console.error("[API][analytics] Missing schema", monthError);
          return errorResponse(SCHEMA_MISSING_ERROR, { status: 200 });
        }

        throw mapPostgrestError(monthError, "Unable to compute monthly metrics");
      }

      const pendingQuery = supabase.from("projects") as any;
      const { count: pendingCount, error: pendingError } = await pendingQuery
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);

      if (pendingError) {
        if (isSchemaMissingError(pendingError)) {
          console.error("[API][analytics] Missing schema", pendingError);
          return errorResponse(SCHEMA_MISSING_ERROR, { status: 200 });
        }

        throw mapPostgrestError(pendingError, "Unable to compute pending metrics");
      }

      const sales = (monthProjects ?? []).length;
      const revenueAmount = 0;
      const pendingProjects = pendingCount ?? 0;

      return success<MetricsResponse>({
        period: {
          month: parsedQuery.month,
          range: {
            start: startIso,
            end: endIso,
          },
        },
        metrics: {
          sales,
          revenue: {
            amount: revenueAmount,
            currency: "BRL",
          },
          pendingProjects,
        },
      });
    },
    {
      auth: "required",
      rateLimit: {
        limit: 30,
      },
    }
  );
}

export const OPTIONS = createOptionsHandler();
