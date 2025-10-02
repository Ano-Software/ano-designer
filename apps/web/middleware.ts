import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { getPublicSupabaseConfig } from "@/lib/env";

const PUBLIC_ROUTES = new Set(["/login", "/signup", "/reset", "/auth/callback"]);
const AUTH_REDIRECT_ROUTES = new Set(["/login", "/signup", "/reset"]);
const PUBLIC_PREFIX = ["/api", "/_next", "/favicon", "/icons", "/public"];
const PUBLIC_STATIC_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".avif",
]);

const hasPublicStaticExtension = (pathname: string) => {
  const dotIndex = pathname.lastIndexOf(".");
  if (dotIndex === -1) {
    return false;
  }

  const extension = pathname.slice(dotIndex).toLowerCase();
  return PUBLIC_STATIC_EXTENSIONS.has(extension);
};

const isPublicPath = (pathname: string) =>
  PUBLIC_ROUTES.has(pathname) ||
  hasPublicStaticExtension(pathname) ||
  PUBLIC_PREFIX.some((prefix) => pathname.startsWith(prefix));

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const config = getPublicSupabaseConfig();

  if (!config) {
    return res;
  }

  const supabase = createMiddlewareClient({ req, res }, config);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  if (!session && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session) {
    if (AUTH_REDIRECT_ROUTES.has(pathname) || pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|favicon.png|icons|public).*)"],
};
