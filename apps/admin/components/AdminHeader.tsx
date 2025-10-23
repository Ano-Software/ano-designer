"use client";

import { useState } from "react";

export function AdminHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 0",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <a href="/admin" style={{ color: "#fff", textDecoration: "none", fontWeight: 700 }}>
        Admin
      </a>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Conta
        </button>
        {open ? (
          <div
            style={{
              position: "absolute",
              right: 0,
              marginTop: 8,
              minWidth: 200,
              background: "rgba(17,24,39,0.9)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: 8,
              zIndex: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 8,
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Perfil — alterar senha (placeholder)
            </button>
            <a
              href="/logout"
              style={{
                display: "block",
                padding: "8px 10px",
                borderRadius: 8,
                color: "#fff",
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Sair
            </a>
          </div>
        ) : null}
      </div>
    </header>
  );
}
