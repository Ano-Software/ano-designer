// Server-only environment helpers. Never import this file from client components.

type ServiceRole = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

const missingEnvMessage = (key: string) =>
  `Supabase env missing: ${key}. Please set it in apps/web/.env.local or Vercel envs.`;

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

function ensureEnv(key: string): string {
  const value = readEnv(key);
  if (value) return value;
  throw new Error(missingEnvMessage(key));
}

export type { ServiceRole };

export function getServiceRole(): ServiceRole {
  // Supabase URL itself is not secret, reuse the public var.
  const supabaseUrl = ensureEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = ensureEnv("SUPABASE_SERVICE_ROLE");
  return { supabaseUrl, serviceRoleKey };
}
