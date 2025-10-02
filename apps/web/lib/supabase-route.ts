import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";
import { getPublicSupabaseConfig } from "@/lib/env";

export function createSupabaseRouteClient() {
  const config = getPublicSupabaseConfig();

  if (!config) {
    throw new Error("Supabase env missing: NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const cookieStore = cookies();

  return createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
  });
}
