import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";
import { getPublicSupabaseConfig } from "@/lib/env";
import { getSiteURL } from "@/lib/site-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getPublicSupabaseConfig();

  if (!config) {
    const site = getSiteURL(request);
    return NextResponse.redirect(`${site}/login?error=supabase-config`);
  }

  // Compute redirectTo on the server and force canonical in production
  const isProd = process.env.NODE_ENV === "production";
  const base = isProd ? "https://app.anoig.com" : getSiteURL(request);
  const redirectTo = `${base.replace(/\/$/, "")}/auth/callback`;

  try {
    const supabase = createRouteHandlerClient<Database>(
      { cookies: () => cookies() },
      {
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey,
      }
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error || !data?.url) {
      const site = getSiteURL(request);
      return NextResponse.redirect(`${site}/login?error=oauth`);
    }

    return NextResponse.redirect(data.url);
  } catch (err) {
    const site = getSiteURL(request);
    return NextResponse.redirect(`${site}/login?error=oauth`);
  }
}
