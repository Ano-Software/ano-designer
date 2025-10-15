const SCHEMA_ERROR_CODES = new Set(["42P01", "42703", "PGRST202", "PGRST203", "PGRST204"]);

export function isSchemaMissingError(
  error: { code?: string; message?: string | null; details?: string | null } | null | undefined
) {
  if (!error) {
    return false;
  }

  if (error.code && SCHEMA_ERROR_CODES.has(error.code)) {
    return true;
  }

  if (typeof error.message === "string") {
    const normalized = error.message.toLowerCase();
    if (normalized.includes("does not exist") || normalized.includes("missing")) {
      return true;
    }
  }

  if (typeof error.details === "string") {
    const normalized = error.details.toLowerCase();
    if (normalized.includes("does not exist") || normalized.includes("missing")) {
      return true;
    }
  }

  return false;
}

export const SCHEMA_MISSING_ERROR = {
  code: "SCHEMA_MISSING",
  message: "Execute as migracoes do Supabase",
} as const;
