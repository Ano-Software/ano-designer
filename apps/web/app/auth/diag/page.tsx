import { headers } from "next/headers";
import { getSiteURL } from "@/lib/site-url";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

export default async function AuthDiagPage() {
  const hdrs = headers();
  const reqLike = new Request("http://local/diag", { headers: hdrs as unknown as HeadersInit });
  const originDetected = getSiteURL(reqLike);

  const supabase = createServerComponentClient<Database>({
    cookies: () => ({
      get() {
        return undefined as any;
      },
      set() {},
      remove() {},
    }),
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const siteEnv = process.env.NEXT_PUBLIC_SITE_URL ?? "<unset>";

  return (
    <div style={{ padding: 24 }}>
      <h1>Auth Diag</h1>
      <ul>
        <li>
          origin detectado: <strong>{originDetected}</strong>
        </li>
        <li>
          NEXT_PUBLIC_SITE_URL: <strong>{siteEnv}</strong>
        </li>
        <li>
          sessão: <strong>{session ? "ativa" : "inexistente"}</strong>
        </li>
      </ul>
      <p style={{ marginTop: 12, opacity: 0.75 }}>Obs.: valores exibidos de forma sanitizada.</p>
    </div>
  );
}
