import { createOptionsHandler } from "@/lib/api/options";
import { handleApiRequest } from "@/lib/api/handler";
import { success } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { mapPostgrestError } from "@/lib/api/postgrest";
import { PROJECT_COLUMNS, mapProject, type ProjectDto } from "../project-dto";
import { projectIdSchema, updateProjectSchema, patchProjectSchema } from "../project-schemas";
export const runtime = "nodejs";

function parseProjectId(rawId: string | undefined) {
  return projectIdSchema.parse(rawId);
}

export async function GET(request: Request, context: { params: { projectId: string } }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user, params }) => {
      const projectId = parseProjectId(params.projectId);

      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      const query = supabase.from("projects") as any;
      const { data, error } = await query
        .select(PROJECT_COLUMNS)
        .eq("id", projectId)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) {
        throw mapPostgrestError(error, "Unable to load project");
      }

      if (!data) {
        throw new ApiError("Project not found", 404, { code: "NOT_FOUND" });
      }

      return success<{ project: ProjectDto }>({ project: mapProject(data) });
    },
    {
      auth: "required",
      rateLimit: {
        limit: 60,
        keyResolver: ({ user: currentUser, params: { projectId } }) =>
          currentUser ? `user:${currentUser.id}:project:${projectId}` : `project:${projectId}`,
      },
    }
  );
}

export async function PUT(request: Request, context: { params: { projectId: string } }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user, params }) => {
      const projectId = parseProjectId(params.projectId);

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

      const parsed = updateProjectSchema.parse(payload);

      const updates = {
        name: parsed.name.trim(),
        description: parsed.description === undefined ? null : parsed.description,
      };

      const query = supabase.from("projects") as any;
      const { data, error } = await query
        .update(updates)
        .eq("id", projectId)
        .eq("owner_id", user.id)
        .select(PROJECT_COLUMNS)
        .single();

      if (error) {
        throw mapPostgrestError(error, "Unable to update project");
      }

      return success<{ project: ProjectDto }>({ project: mapProject(data) });
    },
    {
      auth: "required",
      rateLimit: {
        limit: 45,
        keyResolver: ({ user: currentUser, params: { projectId } }) =>
          currentUser ? `user:${currentUser.id}:project:${projectId}` : `project:${projectId}`,
      },
    }
  );
}

export async function PATCH(request: Request, context: { params: { projectId: string } }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user, params }) => {
      const projectId = parseProjectId(params.projectId);

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

      const parsed = patchProjectSchema.parse(payload);
      const updates: Record<string, unknown> = {};

      if (Object.prototype.hasOwnProperty.call(parsed, "name")) {
        updates.name = parsed.name ? parsed.name.trim() : null;
      }

      if (Object.prototype.hasOwnProperty.call(parsed, "description")) {
        updates.description = parsed.description === undefined ? null : parsed.description;
      }

      const query = supabase.from("projects") as any;
      const { data, error } = await query
        .update(updates)
        .eq("id", projectId)
        .eq("owner_id", user.id)
        .select(PROJECT_COLUMNS)
        .single();

      if (error) {
        throw mapPostgrestError(error, "Unable to update project");
      }

      return success<{ project: ProjectDto }>({ project: mapProject(data) });
    },
    {
      auth: "required",
      rateLimit: {
        limit: 45,
        keyResolver: ({ user: currentUser, params: { projectId } }) =>
          currentUser ? `user:${currentUser.id}:project:${projectId}` : `project:${projectId}`,
      },
    }
  );
}

export async function DELETE(request: Request, context: { params: { projectId: string } }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user, params }) => {
      const projectId = parseProjectId(params.projectId);

      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      const query = supabase.from("projects") as any;
      const { data, error } = await query
        .delete()
        .eq("id", projectId)
        .eq("owner_id", user.id)
        .select("id")
        .single();

      if (error) {
        throw mapPostgrestError(error, "Unable to delete project");
      }

      if (!data) {
        throw new ApiError("Project not found", 404, { code: "NOT_FOUND" });
      }

      return success<{ deleted: true }>({ deleted: true });
    },
    {
      auth: "required",
      rateLimit: {
        limit: 30,
        keyResolver: ({ user: currentUser, params: { projectId } }) =>
          currentUser ? `user:${currentUser.id}:project:${projectId}` : `project:${projectId}`,
      },
    }
  );
}

export const OPTIONS = createOptionsHandler({
  rateLimit: {
    limit: 60,
  },
});
