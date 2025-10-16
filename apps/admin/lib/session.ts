export type AdminSession = {
  sub: string; // username
  role: "admin";
  iat: number; // seconds
  exp: number; // seconds
};

function b64url(input: Buffer | string | ArrayBuffer): string {
  const buf = Buffer.isBuffer(input)
    ? input
    : input instanceof ArrayBuffer
      ? Buffer.from(new Uint8Array(input))
      : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function hmacSHA256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(sig);
}

export async function signSession(payload: AdminSession, secret: string): Promise<string> {
  const body = b64url(JSON.stringify(payload));
  const sig = await hmacSHA256(secret, body);
  return `${body}.${sig}`;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifySession(token: string, secret: string): Promise<AdminSession | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = await hmacSHA256(secret, body);
  if (!timingSafeEqual(sig, expected)) {
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
