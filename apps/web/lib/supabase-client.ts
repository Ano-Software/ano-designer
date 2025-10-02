"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { getPublicSupabaseConfig } from "@/lib/env";
import type { Database } from "@/types/supabase";

export const createSupabaseBrowserClient = () => {
  const config = getPublicSupabaseConfig();

  if (!config) {
    return null;
  }

  return createClientComponentClient<Database>({
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
  });
};
