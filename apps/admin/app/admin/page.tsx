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
        <Card href="/admin/users" title="UsuÃ¡rios" desc="Gerenciar usuÃ¡rios" />
        <Card href="/admin/finance" title="Financeiro" desc="Relatórios e transações" />
        <Card href="/admin/logs" title="Logs" desc="Eventos e auditoria" />
      </div>
    </div>
  );
}

const SHOW_LOGS = true;

function Card({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon?: React.ReactNode;
}) {
  return (
    <a href={href} className="admin-card" aria-label={title}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {icon ? <span aria-hidden>{icon}</span> : null}
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
          <p style={{ marginTop: 6, color: "rgba(255,255,255,0.7)", fontSize: 14 }}>{desc}</p>
        </div>
      </div>
    </a>
  );
}

export default function AdminHomePage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Admin</h1>
      <p style={{ marginTop: 6, color: "rgba(255,255,255,0.7)", fontSize: 14 }}>Home dos cards</p>

      <div className="admin-grid">
        <Card
          href="/admin/users"
          title="Usuários"
          desc="Gerencie acessos e validações."
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#e2b23b" }}
            >
              <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />

        <Card
          href="/admin/finance"
          title="Financeiro"
          desc="Faturamento e assinaturas."
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#e2b23b" }}
            >
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />

        {SHOW_LOGS ? (
          <Card
            href="/admin/logs"
            title="Logs"
            desc="Histórico das ações do admin."
            icon={
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "#e2b23b" }}
              >
                <path d="M3 4a2 2 0 0 1 2-2h10l6 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                <path d="M13 3v5h5" />
              </svg>
            }
          />
        ) : null}
      </div>

      <style>{`
        .admin-grid {
          display: grid;
          gap: 16px;
          margin-top: 16px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .admin-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .admin-card {
          display: block;
          padding: 20px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #fff;
          text-decoration: none;
          transition: border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease;
        }
        .admin-card:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); }
        .admin-card:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px #0d1f18, 0 0 0 5px #e2b23b;
        }
      `}</style>
    </div>
  );
}
