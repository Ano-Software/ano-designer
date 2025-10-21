import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database, TablesInsert } from "@/types/supabase";
import { getPublicSupabaseConfig } from "@/lib/env";
import { getSiteURL } from "@/lib/site-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const type = requestUrl.searchParams.get("type");

  // Canonicalize domain for production: force app.anoig.com on callback
  if (process.env.NODE_ENV === "production") {
    const host = requestUrl.hostname;
    if (host !== "app.anoig.com") {
      const u = new URL("https://app.anoig.com/auth/callback");
      u.search = requestUrl.search;
      return NextResponse.redirect(u.toString(), 301);
    }
  }

  const config = getPublicSupabaseConfig();

  if (!config) {
    const site = getSiteURL(request);
    return NextResponse.redirect(`${site}/login?error=supabase-config`);
  }

  if (errorParam || errorDescription) {
    const site = getSiteURL(request);
    return NextResponse.redirect(`${site}/login?error=oauth`);
  }

  if (!code) {
    const site = getSiteURL(request);
    return NextResponse.redirect(`${site}/login?error=oauth`);
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
      const site = getSiteURL(request);
      return NextResponse.redirect(`${site}/login?error=oauth`);
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
    const site = getSiteURL(request);
    return NextResponse.redirect(`${site}/login?error=oauth`);
  }

  if (type === "recovery") {
    const site = getSiteURL(request);
    return NextResponse.redirect(`${site}/reset/update`);
  }

  if (next && next.startsWith("/")) {
    const site = getSiteURL(request);
    return NextResponse.redirect(`${site}${next}`);
  }

  {
    const site = getSiteURL(request);
    return NextResponse.redirect(`${site}/dashboard`);
  }
}
