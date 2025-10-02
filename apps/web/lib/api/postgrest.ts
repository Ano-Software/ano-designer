import { ApiError } from "@/lib/api/errors";

type PostgrestError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export function mapPostgrestError(
  error: PostgrestError | null | undefined,
  fallbackMessage = "Database error"
) {
  if (!error) {
    return new ApiError(fallbackMessage, 500, { code: "DATABASE_ERROR" });
  }

  switch (error.code) {
    case "23505":
      return new ApiError("Duplicate resource", 409, { code: "CONFLICT", details: error.details });
    case "23503":
      return new ApiError("Related resource missing", 400, {
        code: "FOREIGN_KEY_VIOLATION",
        details: error.details,
      });
    case "23514":
      return new ApiError("Constraint violation", 400, {
        code: "CONSTRAINT_VIOLATION",
        details: error.details,
      });
    case "PGRST116":
    case "PGRST301":
    case "42501":
      return new ApiError("Resource not found", 404, { code: "NOT_FOUND" });
    default:
      return new ApiError(error.message ?? fallbackMessage, 500, {
        code: error.code ?? "DATABASE_ERROR",
        details: error.details ?? error.hint ?? null,
      });
  }
}
