import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getPublicSupabaseConfig } from "@/lib/env";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const type = requestUrl.searchParams.get("type");
  const origin = requestUrl.origin;

  const config = getPublicSupabaseConfig();

  if (!config) {
    return NextResponse.redirect(`${origin}/login?error=supabase-config`);
  }

  if (errorDescription) {
    const params = new URLSearchParams({ error: errorDescription });
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  if (code) {
    const supabase = createRouteHandlerClient({ cookies }, config);
    await supabase.auth.exchangeCodeForSession(code);
  }

  let destination = "/dashboard";

  if (type === "recovery") {
    destination = "/reset/update";
  } else if (next && next.startsWith("/")) {
    destination = next;
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
