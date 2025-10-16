import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { getPublicSupabaseConfig } from "@/lib/env";

const PUBLIC_ROUTES = new Set(["/login", "/auth/callback"]);
const PUBLIC_PREFIX = ["/api", "/_next", "/favicon", "/icons", "/public"];
const STATIC_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".avif"]);

const hasStaticExt = (pathname: string) => {
  const i = pathname.lastIndexOf(".");
  if (i === -1) return false;
  return STATIC_EXT.has(pathname.slice(i).toLowerCase());
};

const isPublicPath = (pathname: string) =>
  PUBLIC_ROUTES.has(pathname) ||
  hasStaticExt(pathname) ||
  PUBLIC_PREFIX.some((p) => pathname.startsWith(p));

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const config = getPublicSupabaseConfig();
  if (!config) return res;

  const supabase = createMiddlewareClient({ req, res }, config);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  // Public routes
  if (isPublicPath(pathname)) {
    return res;
  }

  // Protect everything else, including '/'
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = (session.user.user_metadata as Record<string, unknown> | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|public).*)"],
};
