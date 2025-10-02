import { NextResponse } from "next/server";
import { getApiAllowedOrigins } from "@/lib/env";

export type CorsOptions = {
  allowCredentials?: boolean;
  allowMethods?: string[];
  allowHeaders?: string[];
  exposeHeaders?: string[];
};

const DEFAULT_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
const DEFAULT_HEADERS = ["Content-Type", "Authorization", "Accept", "X-Requested-With"] as const;
const EXPOSED_HEADERS = [
  "X-RateLimit-Limit",
  "X-RateLimit-Remaining",
  "X-RateLimit-Reset",
] as const;

export function resolveCorsHeaders(origin: string | null, options?: CorsOptions) {
  const allowedOrigins = getApiAllowedOrigins();
  const allowCredentials = options?.allowCredentials ?? true;
  const allowMethods = options?.allowMethods ?? [...DEFAULT_METHODS];
  const allowHeaders = options?.allowHeaders ?? [...DEFAULT_HEADERS];
  const exposeHeaders = options?.exposeHeaders ?? [...EXPOSED_HEADERS];
  const headers = new Headers();

  headers.set("Vary", "Origin");

  if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else if (allowedOrigins.length > 0) {
    headers.set("Access-Control-Allow-Origin", allowedOrigins[0]);
  }

  if (allowCredentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  headers.set("Access-Control-Allow-Methods", allowMethods.join(", "));
  headers.set("Access-Control-Allow-Headers", allowHeaders.join(", "));

  if (exposeHeaders.length > 0) {
    headers.set("Access-Control-Expose-Headers", exposeHeaders.join(", "));
  }

  return headers;
}

export function handleCors(request: Request, options?: CorsOptions) {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const headers = resolveCorsHeaders(request.headers.get("origin"), options);
  return new NextResponse(null, {
    status: 204,
    headers,
  });
}
