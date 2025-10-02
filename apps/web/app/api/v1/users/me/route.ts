import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createOptionsHandler } from "@/lib/api/options";
import { handleApiRequest } from "@/lib/api/handler";
import { success } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { mapPostgrestError } from "@/lib/api/postgrest";
import type { Database, Tables } from "@/types/supabase";
export const runtime = "nodejs";

type ProfileRow = Tables<"profiles">;

type UserPayload = {
  user: {
    id: string;
    email: string | null;
    profile: ProfilePayload | null;
  };
};

type ProfilePayload = {
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const usernamePattern = /^[a-z0-9_]+$/i;

const profileUpdateSchema = z
  .object({
    fullName: z.union([z.string().trim().min(1).max(120), z.literal(null)]).optional(),
    username: z
      .union([z.string().trim().min(3).max(32).regex(usernamePattern), z.literal(null)])
      .optional(),
    avatarUrl: z.union([z.string().trim().url().max(2048), z.literal(null)]).optional(),
    bio: z.union([z.string().trim().max(280), z.literal(null)]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

function toProfilePayload(row: ProfileRow | null): ProfilePayload | null {
  if (!row) {
    return null;
  }

  return {
    fullName: row.full_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function buildUserPayload(
  user: { id: string; email: string | null },
  profile: ProfileRow | null
): UserPayload {
  return {
    user: {
      id: user.id,
      email: user.email,
      profile: toProfilePayload(profile),
    },
  };
}

async function fetchProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, bio, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw mapPostgrestError(error, "Unable to load profile");
  }

  return data;
}

export async function GET(request: Request, context: { params: Record<string, string> }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user }) => {
      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      const profile = await fetchProfile(supabase, user.id);
      return success<UserPayload>(buildUserPayload(user, profile));
    },
    {
      auth: "required",
      rateLimit: {
        limit: 45,
      },
    }
  );
}

export async function PUT(request: Request, context: { params: Record<string, string> }) {
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

      const parsed = profileUpdateSchema.parse(payload);

      const updates: Record<string, unknown> = {
        id: user.id,
      };

      if (Object.prototype.hasOwnProperty.call(parsed, "fullName")) {
        updates.full_name = parsed.fullName ?? null;
      }

      if (Object.prototype.hasOwnProperty.call(parsed, "username")) {
        updates.username = parsed.username ? parsed.username.toLowerCase() : null;
      }

      if (Object.prototype.hasOwnProperty.call(parsed, "avatarUrl")) {
        updates.avatar_url = parsed.avatarUrl ?? null;
      }

      if (Object.prototype.hasOwnProperty.call(parsed, "bio")) {
        updates.bio = parsed.bio ?? null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .upsert(updates as any, { onConflict: "id" })
        .select("id, full_name, username, avatar_url, bio, created_at, updated_at")
        .single();

      if (error) {
        throw mapPostgrestError(error, "Unable to update profile");
      }

      return success<UserPayload>(buildUserPayload(user, data));
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
