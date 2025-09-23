import { createClient } from "@supabase/supabase-js";

type AdminClientOptions = Parameters<typeof createClient>[2];

export function createAdminClient(options?: AdminClientOptions) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for admin client.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...options,
  });
}
