import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { getPublicSupabaseConfig } from "@/lib/env";

export default async function HomePage() {
  const config = getPublicSupabaseConfig();
  const cookieStore = cookies();
  const supabase = config
    ? createServerComponentClient({ cookies: () => cookieStore }, config)
    : null;
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 16px" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Painel Admin</h1>
        <p style={{ marginTop: 6, color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
          Bem-vindo{session?.user ? `, ${session.user.email}` : ""}.
        </p>
      </header>
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          padding: 24,
          color: "rgba(255,255,255,0.8)",
          fontSize: 14,
        }}
      >
        <p>Use o menu ou atalhos para gerenciar recursos administrativos.</p>
      </div>
    </div>
  );
}
