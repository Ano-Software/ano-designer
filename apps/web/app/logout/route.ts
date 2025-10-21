import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";
import { getPublicSupabaseConfig } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const config = getPublicSupabaseConfig();
  if (!config) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = createRouteHandlerClient<Database>(
    { cookies: () => cookies() },
    {
      supabaseUrl: config.supabaseUrl,
      supabaseKey: config.supabaseKey,
    }
  );

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[logout] signOut error", error);
    }
  } catch (err) {
    console.error("[logout] unexpected error", err);
  }

  return NextResponse.redirect(`${origin}/login`);
}
