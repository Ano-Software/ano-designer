import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";
import { getPublicSupabaseConfig } from "@/lib/env";

export default async function RootPage() {
  const config = getPublicSupabaseConfig();

  if (!config) {
    redirect("/login");
  }

  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>(
    { cookies: () => cookieStore },
    { supabaseUrl: config.supabaseUrl, supabaseKey: config.supabaseKey }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  redirect("/dashboard");
}
