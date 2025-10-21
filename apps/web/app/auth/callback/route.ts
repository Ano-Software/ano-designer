import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database, TablesInsert } from "@/types/supabase";
import { getPublicSupabaseConfig } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const type = requestUrl.searchParams.get("type");

  const config = getPublicSupabaseConfig();

  if (!config) {
    return NextResponse.redirect(`${origin}/login?error=supabase-config`);
  }

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  try {
    const supabase = createRouteHandlerClient<Database>(
      { cookies: () => cookies() },
      {
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey,
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchange error", error);
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }

    // Upsert user profile after successful session exchange
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    if (getUserError) {
      console.error("[auth/callback] getUser error", getUserError);
    }

    if (user) {
      const full_name =
        (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || null;
      const avatar_url =
        (user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture)) ||
        null;

      const payload: TablesInsert<"profiles"> = {
        id: user.id,
        full_name,
        avatar_url,
        active: true,
      };

      const { error: upsertError } = await supabase.from("profiles").upsert(payload);
      if (upsertError) {
        console.error("[auth/callback] profiles upsert error", upsertError);
      }
    }
  } catch (unknownError) {
    console.error("[auth/callback] unexpected error", unknownError);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset/update`);
  }

  if (next && next.startsWith("/")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
