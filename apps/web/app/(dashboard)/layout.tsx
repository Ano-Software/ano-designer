import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";
import SupabaseConfigWarning from "@/components/SupabaseConfigWarning";
import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { getPublicSupabaseConfig } from "@/lib/env";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const config = getPublicSupabaseConfig();
  const cookieStore = cookies();
  const supabase = config
    ? createServerComponentClient<Database>(
        { cookies: () => cookieStore },
        { supabaseUrl: config.supabaseUrl, supabaseKey: config.supabaseKey }
      )
    : null;
  const {
    data: { session },
  } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

  if (supabase && !session) {
    redirect("/login");
  }

  return (
    <div className="theme-dashboard min-h-screen bg-[#0d1f18] text-white">
      <DashboardTopNav user={session?.user ?? null} />
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 pt-24">
          {!supabase ? (
            <div className="mx-auto mb-6 w-full max-w-4xl px-4 sm:px-6 lg:px-8">
              <SupabaseConfigWarning />
            </div>
          ) : null}
          <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
