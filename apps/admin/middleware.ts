import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { getPublicSupabaseConfig } from "@/lib/env";

// Rotas explicitamente públicas (passam sem check)
const PUBLIC_ROUTES = new Set([
  "/login",
  "/403",
  "/logout",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Não bloquear rotas públicas caso passem pelo matcher
  if (PUBLIC_ROUTES.has(pathname) || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  try {
    const res = NextResponse.next();
    const config = getPublicSupabaseConfig();

    // Sem config/env: redireciona para login (307)
    if (!config) {
      return NextResponse.redirect(new URL("/login", req.url), 307);
    }

    // Autenticação via cookies do request; sem service role
    const supabase = createMiddlewareClient({ req, res }, config);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Sem sessão → /login (307)
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url), 307);
    }

    // Com sessão mas sem role admin → /403 (307)
    const role = (session.user.user_metadata as Record<string, unknown> | undefined)?.role;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/403", req.url), 307);
    }

    // Ok
    return res;
  } catch {
    // Qualquer erro → evitar 500 e mandar para login (307)
    return NextResponse.redirect(new URL("/login", req.url), 307);
  }
}

export const config = {
  matcher: [
    "/((?!_next/|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|css|js|map|txt)$|favicon.ico|robots.txt|sitemap.xml|login|403|logout).*)",
  ],
};
