import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { error, success } from "@/lib/api/response";
import type { Database } from "@/types/supabase";
import { getPublicSupabaseConfig } from "@/lib/env";
import { getServiceRole } from "@/lib/env-server";

export const runtime = "nodejs";

type ProfileWithEmail = Database["public"]["Tables"]["profiles"]["Row"] & {
  users: { email: string | null } | null;
};

const requestSchema = z.object({
  identifier: z
    .string({
      required_error: "Informe um identificador.",
    })
    .trim()
    .min(1, "Informe um identificador."),
});

function normalizeIdentifier(identifier: string) {
  return identifier.trim();
}

export async function POST(request: Request) {
  let parsedBody: z.infer<typeof requestSchema>;

  try {
    const body = await request.json();
    parsedBody = requestSchema.parse(body);
  } catch (unknownError) {
    return error(
      {
        message: "Informe um identificador válido.",
        code: "IDENTIFIER_REQUIRED",
      },
      { status: 400 }
    );
  }

  const identifier = normalizeIdentifier(parsedBody.identifier);

  if (identifier.length === 0) {
    return error(
      {
        message: "Informe um identificador válido.",
        code: "IDENTIFIER_REQUIRED",
      },
      { status: 400 }
    );
  }

  if (identifier.includes("@")) {
    return success({ email: identifier });
  }

  const config = getPublicSupabaseConfig();

  if (!config) {
    return error(
      {
        message: "Configuração do Supabase ausente.",
        code: "SUPABASE_CONFIG_MISSING",
      },
      { status: 500 }
    );
  }

  let serviceRoleKey: string;

  try {
    const { serviceRoleKey: key } = getServiceRole();
    serviceRoleKey = key;
  } catch (unknownError) {
    return error(
      {
        message: "Chave de Service Role do Supabase ausente.",
        code: "SERVICE_ROLE_MISSING",
      },
      { status: 500 }
    );
  }

  const supabase = createClient<Database>(config.supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error: queryError } = await supabase
    .from("profiles")
    .select<ProfileWithEmail>("*, users:profiles_id_fkey(email)")
    .ilike("username", identifier)
    .maybeSingle();

  if (queryError) {
    console.error("[resolve-identifier] Query error", queryError);
    return error(
      {
        message: "Não foi possível resolver o identificador informado.",
        code: "RESOLUTION_FAILED",
      },
      { status: 500 }
    );
  }

  const email = data?.users?.email ?? null;

  if (!email) {
    return error(
      {
        message: "Usuário não encontrado.",
        code: "USER_NOT_FOUND",
      },
      { status: 404 }
    );
  }

  return success({ email });
}
