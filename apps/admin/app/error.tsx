"use client";

export default function GlobalError() {
  return (
    <html>
      <body
        style={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          background: "#0d1f18",
          color: "#fff",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Ocorreu um erro</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
            Voltar ao login e tentar novamente.
          </p>
          <a
            href="/login"
            style={{
              display: "inline-block",
              marginTop: 12,
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Voltar ao login
          </a>
        </div>
      </body>
    </html>
  );
}
