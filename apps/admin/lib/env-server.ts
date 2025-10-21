// Server-only helpers to read and validate admin auth envs

type AdminEnv = {
  username: string;
  passwordHash: string; // bcrypt hash
  sessionSecret: string;
};

function read(key: string): string | undefined {
  const v = process.env[key];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function isBcryptHash(value: string): boolean {
  // Typical bcrypt hash starts with $2a$, $2b$ or $2y$ and has 60 chars
  return /^(\$2[aby]\$)\d{2}\$[A-Za-z0-9./]{53}$/.test(value);
}

export function getAdminEnv(): AdminEnv | null {
  const username = read("ADMIN_USERNAME");
  const passwordHash = read("ADMIN_PASSWORD_HASH");
  const sessionSecret = read("ADMIN_SESSION_SECRET");

  if (!username || !passwordHash || !sessionSecret) {
    return null;
  }
  if (!isBcryptHash(passwordHash)) {
    return null;
  }
  if (sessionSecret.length < 32) {
    return null;
  }
  return { username, passwordHash, sessionSecret };
}
