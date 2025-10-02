const missingEnvMessage = (key: string) =>
  `Supabase env missing: ${key}. Please set it in apps/web/.env.local.`;

type PublicSupabaseConfig = {
  supabaseUrl: string;
  supabaseKey: string;
};

type ServiceRole = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

const optionalEnvKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE",
  "API_ALLOWED_ORIGINS",
] as const;
type OptionalEnv = (typeof optionalEnvKeys)[number];

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function readEnv(key: string) {
  let value: string | undefined;

  // Use explicit property access so Next.js can inline public env vars in client bundles.
  switch (key) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      value = process.env.NEXT_PUBLIC_SUPABASE_URL;
      break;
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      break;
    case "NEXT_PUBLIC_SITE_URL":
      value = process.env.NEXT_PUBLIC_SITE_URL;
      break;
    default:
      value = process.env[key];
      break;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return undefined;
}

function warnMissingPublicConfig(keys: string[]) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  keys.forEach((key) => {
    console.warn(missingEnvMessage(key));
  });
}

function ensureEnv(key: string) {
  const value = readEnv(key);

  if (value) {
    return value;
  }

  throw new Error(missingEnvMessage(key));
}

function parseCommaSeparated(value: string | undefined) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export type { PublicSupabaseConfig, ServiceRole };

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const missingKeys: string[] = [];

  if (!supabaseUrl) {
    missingKeys.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseKey) {
    missingKeys.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missingKeys.length > 0) {
    warnMissingPublicConfig(missingKeys);
    return null;
  }

  return {
    supabaseUrl,
    supabaseKey,
  };
}

export function getServiceRole(): ServiceRole {
  const supabaseUrl = ensureEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = ensureEnv("SUPABASE_SERVICE_ROLE");

  return {
    supabaseUrl,
    serviceRoleKey,
  };
}

export function getApiAllowedOrigins(): string[] {
  const fromEnv = parseCommaSeparated(readEnv("API_ALLOWED_ORIGINS"));
  const origins = new Set<string>([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv]);
  const siteUrl = readEnv("NEXT_PUBLIC_SITE_URL");

  if (siteUrl) {
    origins.add(siteUrl);
  }

  return Array.from(origins);
}

export const optionalEnvValues: Partial<Record<OptionalEnv, string>> = Object.fromEntries(
  optionalEnvKeys
    .map((key) => {
      const value = readEnv(key);
      return value ? [key, value] : null;
    })
    .filter((entry): entry is [OptionalEnv, string] => Array.isArray(entry))
);
