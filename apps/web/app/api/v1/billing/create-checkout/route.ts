import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createOptionsHandler } from "@/lib/api/options";
import { handleApiRequest } from "@/lib/api/handler";
import { created, error as errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { mapPostgrestError } from "@/lib/api/postgrest";
import { optionalEnvValues } from "@/lib/env";
import { isSchemaMissingError, SCHEMA_MISSING_ERROR } from "@/lib/schema-errors";
import type { TablesInsert } from "@/types/supabase";
export const runtime = "nodejs";

const planIds = ["plan_a", "plan_b", "plan_c"] as const;
const planSet = new Set(planIds);

const createCheckoutSchema = z.object({
  planId: z.string().trim().min(1),
  mode: z.enum(["monthly", "recurring"]),
});

type PlanId = (typeof planIds)[number];

type CreateCheckoutBody = {
  planId: PlanId;
  mode: "monthly" | "recurring";
};

function assertPlanId(raw: string): PlanId {
  if (planSet.has(raw as PlanId)) {
    return raw as PlanId;
  }

  throw new ApiError("Plano invalido", 400, { code: "INVALID_PLAN" });
}

function computePlanExpiration(mode: "monthly" | "recurring") {
  const expires = new Date();

  if (mode === "monthly") {
    expires.setMonth(expires.getMonth() + 1);
  } else {
    expires.setFullYear(expires.getFullYear() + 1);
  }

  return expires.toISOString().slice(0, 10);
}

function buildCheckoutUrl(planId: PlanId, mode: "monthly" | "recurring") {
  const baseUrl = optionalEnvValues.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = new URL("/pagamentos/checkout", baseUrl);
  url.searchParams.set("plan", planId);
  url.searchParams.set("mode", mode);
  url.searchParams.set("intent", randomUUID());
  return url.toString();
}

function buildPixPayload(planId: PlanId, userId: string) {
  const expires = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const payloadPrefix = `${planId.toUpperCase()}-${userId.slice(0, 8)}`;
  const copyPasteCode = `00020126ANODESIGNER${payloadPrefix}5204000053039865405699005802BR5925ANO DESIGNER STUDIO6009SAO PAULO${randomUUID().replace(/-/g, "")}6304`;
  return {
    copyPasteCode,
    expiresAt: expires.toISOString(),
  } as const;
}

export async function POST(request: Request, context: { params: Record<string, string> }) {
  return handleApiRequest(
    request,
    context,
    async ({ supabase, user }) => {
      if (!user) {
        throw new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      }

      let json: unknown;

      try {
        json = await request.json();
      } catch (cause) {
        throw new ApiError("Invalid JSON payload", 400, {
          code: "INVALID_JSON",
          details: cause instanceof Error ? cause.message : null,
        });
      }

      const parsed = createCheckoutSchema.parse(json) as CreateCheckoutBody;
      const planId = assertPlanId(parsed.planId);
      const expiration = computePlanExpiration(parsed.mode);

      const subscriptionPayload: TablesInsert<"subscriptions"> = {
        user_id: user.id,
        plan_id: planId,
        mode: parsed.mode,
        status: parsed.mode === "recurring" ? "active" : "pending_payment",
        manage_url: optionalEnvValues.NEXT_PUBLIC_SITE_URL
          ? `${optionalEnvValues.NEXT_PUBLIC_SITE_URL}/pagamentos`
          : null,
      };

      const { data: subscriptionRow, error: subscriptionError } = await supabase
        .from("subscriptions")
        .upsert(subscriptionPayload, { onConflict: "user_id" })
        .select("plan_id, mode, status, manage_url")
        .single();

      if (subscriptionError) {
        if (isSchemaMissingError(subscriptionError)) {
          console.error("[API][billing] Missing schema", subscriptionError);
          return errorResponse(SCHEMA_MISSING_ERROR, { status: 200 });
        }

        throw mapPostgrestError(subscriptionError, "Unable to persist subscription");
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          plan_id: planId,
          plan_expires_at: expiration,
          active: parsed.mode === "recurring",
        },
        { onConflict: "id" }
      );

      if (profileError) {
        if (isSchemaMissingError(profileError)) {
          console.error("[API][billing] Missing schema", profileError);
          return errorResponse(SCHEMA_MISSING_ERROR, { status: 200 });
        }

        throw mapPostgrestError(profileError, "Unable to update profile billing data");
      }

      if (parsed.mode === "monthly") {
        const pix = buildPixPayload(planId, user.id);
        return created(
          {
            pix,
            message: "Use o PIX gerado para concluir o pagamento e ativar o plano.",
          },
          {
            headers: {
              "X-Subscription-Status": subscriptionRow.status,
            },
          }
        );
      }

      const checkoutUrl = buildCheckoutUrl(planId, parsed.mode);
      return created(
        {
          checkoutUrl,
          message: "Redirecionando para o checkout seguro.",
        },
        {
          headers: {
            "X-Subscription-Status": subscriptionRow.status,
          },
        }
      );
    },
    {
      auth: "required",
      rateLimit: {
        limit: 15,
      },
    }
  );
}

export const OPTIONS = createOptionsHandler({
  rateLimit: {
    limit: 20,
  },
});
