import { ZodError } from "zod";
import type { ApiErrorBody } from "./response";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: ApiErrorBody["details"];

  constructor(
    message: string,
    status = 500,
    options?: { code?: string; details?: ApiErrorBody["details"] }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function fromZodError(error: ZodError): ApiError {
  const flattened = error.flatten();
  return new ApiError("Validation failed", 422, {
    code: "VALIDATION_ERROR",
    details: flattened.fieldErrors,
  });
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ZodError) {
    return fromZodError(error);
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 500);
  }

  return new ApiError("Unexpected error", 500);
}

export function toErrorBody(error: ApiError): ApiErrorBody {
  return {
    message: error.message,
    code: error.code,
    details: error.details ?? null,
  };
}
