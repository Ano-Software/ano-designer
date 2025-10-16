export default function ForbiddenPage() {
  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          color: "#fff",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Acesso negado</h1>
        <p style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
          Você não tem permissão para acessar esta área.
        </p>
        <div style={{ marginTop: 16 }}>
          <a
            href="/login"
            style={{
              display: "inline-block",
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
      </div>
    </div>
  );
}
