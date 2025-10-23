import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url), 303);
  // Clear admin session cookie (both with and without __Host- prefix just in case)
  res.headers.append(
    "Set-Cookie",
    `__Host-admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
  );
  res.headers.append(
    "Set-Cookie",
    `admin_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
  );
  return res;
}
