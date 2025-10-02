import { createOptionsHandler } from "@/lib/api/options";
import { handleApiRequest } from "@/lib/api/handler";
import { created, success } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { mapPostgrestError } from "@/lib/api/postgrest";
import { parsePagination, buildPaginationMeta, type PaginationMeta } from "@/lib/api/pagination";
import type { TablesInsert } from "@/types/supabase";
import { PROJECT_COLUMNS, mapProject, type ProjectDto } from "./project-dto";
import { createProjectSchema } from "./project-schemas";
export const runtime = "nodejs";

const sortableFields = ["created_at", "updated_at", "name"] as const;
type SortableField = (typeof sortableFields)[number];
type SortOrder = "asc" | "desc";

function sanitizeSearchTerm(value: string) {
  return value.replace(/[%_]/g, "\\$&");
}

function resolveSortField(raw: string | null): SortableField {
  if (!raw) {
    return "created_at";
  }

  return sortableFields.includes(raw as SortableField) ? (raw as SortableField) : "created_at";
}

function resolveSortOrder(raw: string | null): SortOrder {
  return raw === "asc" ? "asc" : "desc";
}

export async function GET(request: Request, context: { params: Record<string, string> }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user, searchParams }) => {
      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      const pagination = parsePagination(searchParams, {
        defaultPageSize: 10,
        maxPageSize: 50,
      });

      const rawSearch = searchParams.get("search");
      const sortField = resolveSortField(searchParams.get("sort"));
      const sortOrder = resolveSortOrder(searchParams.get("order"));
      const hasSearch = typeof rawSearch === "string" && rawSearch.trim().length > 0;
      const filters = hasSearch ? sanitizeSearchTerm(rawSearch.trim()) : null;

      let query = supabase.from("projects") as any;
      query = query
        .select(PROJECT_COLUMNS, { count: "exact" })
        .eq("owner_id", user.id)
        .order(sortField, { ascending: sortOrder === "asc" })
        .range(pagination.offset, pagination.offset + pagination.pageSize - 1);

      if (filters) {
        query = query.ilike("name", `%${filters}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        throw mapPostgrestError(error, "Unable to load projects");
      }

      const items = (data ?? []).map(mapProject);
      const meta = buildPaginationMeta(count ?? items.length, pagination);

      return success<{
        items: ProjectDto[];
        pagination: PaginationMeta;
        filters: { search?: string };
        sort: { field: SortableField; order: SortOrder };
      }>({
        items,
        pagination: meta,
        filters: hasSearch && rawSearch ? { search: rawSearch.trim() } : {},
        sort: {
          field: sortField,
          order: sortOrder,
        },
      });
    },
    {
      auth: "required",
      rateLimit: {
        limit: 60,
      },
    }
  );
}

export async function POST(request: Request, context: { params: Record<string, string> }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user }) => {
      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      let payload: unknown;

      try {
        payload = await request.json();
      } catch (cause) {
        throw new ApiError("Invalid JSON payload", 400, {
          code: "INVALID_JSON",
          details: cause instanceof Error ? cause.message : null,
        });
      }

      const parsed = createProjectSchema.parse(payload);

      const insertPayload: TablesInsert<"projects"> = {
        owner_id: user.id,
        name: parsed.name.trim(),
        description: parsed.description === undefined ? null : parsed.description,
      };

      const query = supabase.from("projects") as any;
      const { data, error } = await query.insert(insertPayload).select(PROJECT_COLUMNS).single();

      if (error) {
        throw mapPostgrestError(error, "Unable to create project");
      }

      return created<{ project: ProjectDto }>({ project: mapProject(data) });
    },
    {
      auth: "required",
      rateLimit: {
        limit: 20,
      },
    }
  );
}

export const OPTIONS = createOptionsHandler();
