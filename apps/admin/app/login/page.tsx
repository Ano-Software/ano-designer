"use client";

import { useCallback, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { PublicSupabaseConfig } from "@/lib/env";
import { getPublicSupabaseConfig } from "@/lib/env";

export default function LoginPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PublicSupabaseConfig | null>(null);

  useEffect(() => {
    setConfig(getPublicSupabaseConfig());
    setReady(true);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const supabase = createClientComponentClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}` : undefined,
        },
      });
      if (error) {
        setError(error.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao autenticar.");
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const supabase = createClientComponentClient();
      await supabase.auth.signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao sair.");
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          color: "#fff",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <header style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Entrar</h1>
          <p style={{ marginTop: 6, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
            Acesse o painel administrativo.
          </p>
        </header>

        {!ready ? (
          <p style={{ color: "rgba(255,255,255,0.6)" }}>Carregando…</p>
        ) : !config ? (
          <p style={{ fontSize: 14, color: "#fecaca" }}>
            Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <button
              type="button"
              onClick={signInWithGoogle}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.1)",
                padding: "10px 16px",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Entrar com Google
            </button>
            <button
              type="button"
              onClick={signOut}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                padding: "8px 16px",
                color: "rgba(255,255,255,0.6)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Sair
            </button>
          </div>
        )}

        {error ? <p style={{ marginTop: 8, fontSize: 14, color: "#fecaca" }}>{error}</p> : null}
      </div>
    </div>
  );
}
