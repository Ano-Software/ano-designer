import { createClient } from "@supabase/supabase-js";
import { getServiceRole } from "@/lib/env";

type AdminClientOptions = Parameters<typeof createClient>[2];

export function createAdminClient(options?: AdminClientOptions) {
  const { supabaseUrl, serviceRoleKey } = getServiceRole();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...options,
  });
}
