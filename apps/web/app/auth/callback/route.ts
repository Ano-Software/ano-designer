import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";
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
