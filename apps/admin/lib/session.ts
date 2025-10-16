import crypto from "node:crypto";

export type AdminSession = {
  sub: string; // username
  role: "admin";
  iat: number; // seconds
  exp: number; // seconds
};

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function hmacSHA256(secret: string, data: string): string {
  const mac = crypto.createHmac("sha256", secret).update(data).digest();
  return b64url(mac);
}

export function signSession(payload: AdminSession, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  const sig = hmacSHA256(secret, body);
  return `${body}.${sig}`;
}

export function verifySession(token: string, secret: string): AdminSession | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = hmacSHA256(secret, body);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const json = JSON.parse(
      Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    );
    if (!json || typeof json !== "object") return null;
    const now = Math.floor(Date.now() / 1000);
    if (typeof json.exp !== "number" || json.exp <= now) return null;
    return json as AdminSession;
  } catch {
    return null;
  }
}
