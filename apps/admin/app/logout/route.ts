import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getPublicSupabaseConfig } from "@/lib/env";

export async function GET(request: Request) {
  try {
    const config = getPublicSupabaseConfig();
    if (config) {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore }, config);
      await supabase.auth.signOut();
    }
  } catch {
    // swallow errors to ensure redirect
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
