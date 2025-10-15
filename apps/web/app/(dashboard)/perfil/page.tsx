import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import SupabaseConfigWarning from "@/components/SupabaseConfigWarning";
import { ProfilePage } from "./profile-page";
import { getPublicSupabaseConfig } from "@/lib/env";
import { isSchemaMissingError, SCHEMA_MISSING_ERROR } from "@/lib/schema-errors";
import type { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const config = getPublicSupabaseConfig();

  if (!config) {
    return (
      <div className="space-y-6">
        <SupabaseConfigWarning />
      </div>
    );
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
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, theme, plan_expires_at, active")
    .eq("id", user.id)
    .maybeSingle();

  const schemaMissing = Boolean(profileError && isSchemaMissingError(profileError));
  if (schemaMissing) {
    console.warn("[UI][perfil] Missing schema", SCHEMA_MISSING_ERROR, profileError);
  } else if (profileError) {
    throw profileError;
  }

  const profile = {
    id: user.id,
    email: user.email ?? null,
    fullName: profileRow?.full_name ?? null,
    avatarUrl: profileRow?.avatar_url ?? null,
    theme: (profileRow?.theme === "dark" || profileRow?.theme === "light"
      ? profileRow.theme
      : "light") as "light" | "dark",
    planExpiresAt: profileRow?.plan_expires_at ?? null,
    active: profileRow?.active ?? null,
  };

  return <ProfilePage profile={profile} />;
}
