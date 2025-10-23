"use client";

import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
      });
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Usuário ou senha inválidos." }));
        setError(typeof data?.message === "string" ? data.message : "Usuário ou senha inválidos.");
      }
    } catch {
      setError("Tente novamente em alguns segundos.");
    } finally {
      setSubmitting(false);
    }
  }

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

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }} noValidate>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
              Usuário
            </span>
            <input
              type="text"
              name="username"
              required
              aria-invalid={!!error}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(17,24,39,0.8)",
                padding: "12px 16px",
                color: "#fff",
                fontSize: 14,
                minHeight: 44,
                outline: "none",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
              Senha
            </span>
            <input
              type="password"
              name="password"
              required
              aria-invalid={!!error}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(17,24,39,0.8)",
                padding: "12px 16px",
                color: "#fff",
                fontSize: 14,
                minHeight: 44,
                outline: "none",
              }}
            />
          </label>

          {error ? <p style={{ fontSize: 14, color: "#fecaca" }}>{error}</p> : null}

          <div style={{ display: "grid", gap: 10 }}>
            <button
              type="submit"
              disabled={submitting}
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
                minHeight: 44,
              }}
            >
              {submitting ? "Entrando…" : "Entrar"}
            </button>
            <a
              href="/"
              style={{
                display: "inline-block",
                textAlign: "center",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                padding: "10px 16px",
                color: "rgba(255,255,255,0.75)",
                fontSize: 12,
                minHeight: 44,
                textDecoration: "none",
              }}
            >
              Voltar para o início
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
