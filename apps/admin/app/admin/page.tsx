function Card({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.05)",
        color: "#fff",
        textDecoration: "none",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
      <p style={{ marginTop: 6, color: "rgba(255,255,255,0.7)", fontSize: 14 }}>{desc}</p>
    </a>
  );
}

export default function AdminHomePage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Admin</h1>
      <p style={{ marginTop: 6, color: "rgba(255,255,255,0.7)", fontSize: 14 }}>Home dos cards</p>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginTop: 16,
        }}
      >
        <Card href="/admin/users" title="Usuários" desc="Gerenciar usuários" />
        <Card href="/admin/finance" title="Financeiro" desc="Relatórios e transações" />
        <Card href="/admin/logs" title="Logs" desc="Eventos e auditoria" />
      </div>
    </div>
  );
}
