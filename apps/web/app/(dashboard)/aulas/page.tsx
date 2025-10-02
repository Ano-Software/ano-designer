import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import SupabaseConfigWarning from "@/components/SupabaseConfigWarning";
import { getPublicSupabaseConfig } from "@/lib/env";
import { isSchemaMissingError } from "@/lib/schema-errors";
import type { Database } from "@/types/supabase";
import { CoursesPage } from "./courses-page";

export const metadata = {
  title: "Cursos",
};

export default async function CursosPage() {
  const config = getPublicSupabaseConfig();

  if (!config) {
    return (
      <div className="space-y-6">
        <SupabaseConfigWarning />
      </div>
    );
  }

  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileRow, error } = await supabase
    .from("profiles")
    .select("active, plan_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    if (isSchemaMissingError(error)) {
      console.warn("[Cursos] Missing profiles schema", error);
      return (
        <div className="space-y-6">
          <SupabaseConfigWarning />
        </div>
      );
    }

    throw error;
  }

  const isActive = Boolean(profileRow?.active);
  const planExpiresAt = profileRow?.plan_expires_at ?? null;
  const expiresDate = planExpiresAt ? new Date(planExpiresAt) : null;
  const isExpired = expiresDate ? expiresDate.getTime() < Date.now() : false;
  const blocked = !isActive || isExpired;

  return <CoursesPage blocked={blocked} planExpiresAt={planExpiresAt} />;
}
