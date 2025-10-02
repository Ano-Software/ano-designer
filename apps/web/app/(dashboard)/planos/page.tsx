import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";
import { getPublicSupabaseConfig } from "@/lib/env";
import { PlansView } from "./plans-view";

export const dynamic = "force-dynamic";

export default async function PlanosPage() {
  const config = getPublicSupabaseConfig();

  if (!config) {
    return <PlansView configError />;
  }

  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>(
    { cookies: () => cookieStore },
    { supabaseUrl: config.supabaseUrl, supabaseKey: config.supabaseKey }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan_id, active, plan_expires_at, theme")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan_id, mode, status, manage_url")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <PlansView
      profile={{
        id: user.id,
        planId: profile?.plan_id ?? null,
        active: profile?.active ?? null,
        planExpiresAt: profile?.plan_expires_at ?? null,
        theme: profile?.theme === "dark" || profile?.theme === "light" ? profile.theme : null,
      }}
      subscription={
        subscription
          ? {
              planId: subscription.plan_id,
              mode: subscription.mode,
              status: subscription.status,
              manageUrl: subscription.manage_url ?? null,
            }
          : null
      }
    />
  );
}
