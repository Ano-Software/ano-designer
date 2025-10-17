import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session";
import { getAdminEnv } from "@/lib/env-server";

// Rotas explicitamente públicas (passam sem check)
const PUBLIC_ROUTES = new Set([
  "/login",
  "/403",
  "/logout",
  "/api/auth/login",
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
    const env = getAdminEnv();
    if (!env) {
      return NextResponse.redirect(new URL("/login", req.url), 307);
    }

    // Lê cookie de sessão e verifica assinatura/expiração
    const raw =
      req.cookies.get("__Host-admin_session")?.value || req.cookies.get("admin_session")?.value;
    if (!raw) {
      return NextResponse.redirect(new URL("/login", req.url), 307);
    }
    const session = await verifySession(raw, env.sessionSecret);
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url), 307);
    }

    return NextResponse.next();
  } catch {
    // Qualquer erro → evitar 500 e mandar para login (307)
    return NextResponse.redirect(new URL("/login", req.url), 307);
  }
}

export const config = {
  matcher: [
    "/((?!_next/|api/|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|css|js|map|txt)$|favicon.ico|robots.txt|sitemap.xml|login|403|logout).*)",
  ],
};
