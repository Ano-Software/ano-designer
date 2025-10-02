import { createOptionsHandler } from "@/lib/api/options";
import { handleApiRequest } from "@/lib/api/handler";
import { success, error as errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { mapPostgrestError } from "@/lib/api/postgrest";
import { isSchemaMissingError, SCHEMA_MISSING_ERROR } from "@/lib/schema-errors";
export const runtime = "nodejs";

type ThemePreference = "light" | "dark";

type SubscriptionResponse = {
  profile: {
    planId: string | null;
    active: boolean | null;
    planExpiresAt: string | null;
    theme: ThemePreference | null;
  };
  subscription: {
    planId: string;
    mode: "monthly" | "recurring";
    status: string;
    manageUrl: string | null;
  } | null;
};

function normalizeTheme(theme: unknown): ThemePreference | null {
  return theme === "dark" || theme === "light" ? theme : null;
}

export async function GET(request: Request, context: { params: Record<string, string> }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user }) => {
      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      const [profileResult, subscriptionResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan_id, active, plan_expires_at, theme")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("subscriptions")
          .select("plan_id, mode, status, manage_url")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (profileResult.error) {
        if (isSchemaMissingError(profileResult.error)) {
          console.error("[API][billing] Missing schema", profileResult.error);
          return errorResponse(SCHEMA_MISSING_ERROR, { status: 200 });
        }

        throw mapPostgrestError(profileResult.error, "Unable to load billing profile");
      }

      if (subscriptionResult.error) {
        if (isSchemaMissingError(subscriptionResult.error)) {
          console.error("[API][billing] Missing schema", subscriptionResult.error);
          return errorResponse(SCHEMA_MISSING_ERROR, { status: 200 });
        }

        throw mapPostgrestError(subscriptionResult.error, "Unable to load subscription");
      }

      const payload: SubscriptionResponse = {
        profile: {
          planId: profileResult.data?.plan_id ?? null,
          active: profileResult.data?.active ?? null,
          planExpiresAt: profileResult.data?.plan_expires_at ?? null,
          theme: normalizeTheme(profileResult.data?.theme ?? null),
        },
        subscription: subscriptionResult.data
          ? {
              planId: subscriptionResult.data.plan_id,
              mode: subscriptionResult.data.mode === "recurring" ? "recurring" : "monthly",
              status: subscriptionResult.data.status,
              manageUrl: subscriptionResult.data.manage_url ?? null,
            }
          : null,
      };

      return success(payload);
    },
    {
      auth: "required",
      rateLimit: {
        limit: 45,
      },
    }
  );
}

export const OPTIONS = createOptionsHandler();
