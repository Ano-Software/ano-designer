"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

const containerClasses =
  "flex w-full max-w-lg flex-col gap-6 rounded-2xl bg-[#193f33] p-8 text-[#F5F7F8] shadow-xl";

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (error || !data.session?.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.session.user.email ?? "");
      setLoading(false);
    }

    loadSession();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router, supabase]);

  return (
    <section className={containerClasses} aria-live="polite">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Olá {email ?? ""}</h1>
        <p className="text-sm text-[#F5F7F8]/70">
          Bem-vindo à área protegida. Use o botão abaixo para encerrar a sessão quando desejar.
        </p>
      </header>
      <div className="flex flex-col gap-3">
        <Button onClick={handleSignOut} disabled={loading}>
          {loading ? "Carregando..." : "Sair"}
        </Button>
      </div>
    </section>
  );
}
