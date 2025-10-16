import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminEnv } from "@/lib/env-server";
import { signSession } from "@/lib/session";
import bcrypt from "bcryptjs";

// Simple in-memory rate limit per IP: 5 attempts / 5 minutes
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_TRIES = 5;

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || (req as any).ip || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const env = getAdminEnv();
    if (!env) {
      return NextResponse.json({ message: "Tente novamente em alguns segundos." }, { status: 500 });
    }

    const ip = getClientIp(req);
    const now = Date.now();
    const bucket = attempts.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    }
    const current = attempts.get(ip)!;
    if (current.count >= MAX_TRIES) {
      return NextResponse.json({ message: "Tente novamente em alguns segundos." }, { status: 429 });
    }

    const contentType = req.headers.get("content-type") || "";
    let username = "";
    let password = "";
    if (contentType.includes("application/json")) {
      const data = (await req.json()) as any;
      username = String(data?.username ?? "").trim();
      password = String(data?.password ?? "").trim();
    } else {
      const form = await req.formData();
      username = String(form.get("username") ?? "").trim();
      password = String(form.get("password") ?? "").trim();
    }

    if (!username || !password) {
      current.count++;
      return NextResponse.json({ message: "UsuÃ¡rio ou senha invÃ¡lidos." }, { status: 401 });
    }

    if (username !== env.username) {
      current.count++;
      return NextResponse.json({ message: "UsuÃ¡rio ou senha invÃ¡lidos." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, env.passwordHash);
    if (!ok) {
      current.count++;
      return NextResponse.json({ message: "UsuÃ¡rio ou senha invÃ¡lidos." }, { status: 401 });
    }

    // success â†’ reset attempts for IP
    attempts.delete(ip);

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 7 * 24 * 60 * 60; // 7 days
    const token = await signSession(
      { sub: env.username, role: "admin", iat, exp },
      env.sessionSecret
    );

    const res = NextResponse.redirect(new URL("/", req.url), 303);
    // __Host- cookie: Secure, Path=/, no Domain
    res.headers.append(
      "Set-Cookie",
      `__Host-admin_session=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`
    );
    return res;
  } catch {
    return NextResponse.json({ message: "Tente novamente em alguns segundos." }, { status: 500 });
  }
}
