import { resolveCorsHeaders, handleCors, type CorsOptions } from "@/lib/api/cors";
import { applyRateLimit, rateLimitHeaders, type RateLimitConfig } from "@/lib/api/rate-limit";
import { error as errorResponse } from "@/lib/api/response";
import { ApiError, toApiError, toErrorBody } from "@/lib/api/errors";
import { createSupabaseRouteClient } from "@/lib/supabase-route";

type AuthStrategy = "required" | "optional" | "none";

type HandlerContext<TParams extends Record<string, string | string[]> = Record<string, string>> = {
  request: Request;
  params: TParams;
  searchParams: URLSearchParams;
  supabase: ReturnType<typeof createSupabaseRouteClient>;
  user: { id: string; email: string | null } | null;
};

type HandlerResult = Response;

export type ApiHandlerOptions = {
  auth?: AuthStrategy;
  cors?: CorsOptions;
  rateLimit?: Partial<RateLimitConfig> & {
    keyResolver?: (ctx: HandlerContext) => string;
  };
};

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  limit: 120,
  windowMs: 60_000,
};

const IP_HEADER_CANDIDATES = ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"] as const;

function getSearchParams(request: Request) {
  const url = new URL(request.url);
  return url.searchParams;
}

function getClientIdentifier(request: Request) {
  for (const header of IP_HEADER_CANDIDATES) {
    const value = request.headers.get(header);
    if (value) {
      const [first] = value.split(/,\s*/);
      if (first) {
        return first.trim();
      }
    }
  }

  return "anonymous";
}

function decorateResponse(response: Response, headers: Headers) {
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
}

export async function handleApiRequest<TParams extends Record<string, string | string[]>>(
  request: Request,
  context: { params: TParams },
  handler: (ctx: HandlerContext<TParams>) => Promise<HandlerResult>,
  options?: ApiHandlerOptions
) {
  const corsShortCircuit = handleCors(request, options?.cors);

  if (corsShortCircuit) {
    return corsShortCircuit;
  }

  const corsHeaders = resolveCorsHeaders(request.headers.get("origin"), options?.cors);
  let supabase;
  try {
    supabase = createSupabaseRouteClient();
  } catch (unknownError) {
    console.error("[API] Supabase client error", unknownError);
    const apiError = toApiError(unknownError);
    const response = errorResponse(toErrorBody(apiError), {
      status: apiError.status,
    });
    decorateResponse(response, corsHeaders);
    return response;
  }

  let user: HandlerContext["user"] = null;
  const authStrategy = options?.auth ?? "required";

  if (authStrategy !== "none") {
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      const apiError = new ApiError("Unable to retrieve session", 401, { code: "AUTH_ERROR" });
      const response = errorResponse(toErrorBody(apiError), { status: apiError.status });
      decorateResponse(response, corsHeaders);
      return response;
    }

    if (!supabaseUser && authStrategy === "required") {
      const apiError = new ApiError("Not authenticated", 401, { code: "UNAUTHENTICATED" });
      const response = errorResponse(toErrorBody(apiError), { status: apiError.status });
      decorateResponse(response, corsHeaders);
      return response;
    }

    if (supabaseUser) {
      user = { id: supabaseUser.id, email: supabaseUser.email ?? null };
    }
  }

  const handlerContext: HandlerContext<TParams> = {
    request,
    params: context.params,
    searchParams: getSearchParams(request),
    supabase,
    user,
  };

  const rateLimitConfig: RateLimitConfig = {
    ...DEFAULT_RATE_LIMIT,
    ...options?.rateLimit,
  };

  const resolvedKey = options?.rateLimit?.keyResolver?.(handlerContext);
  const rateLimitKey =
    resolvedKey ?? (user ? `user:${user.id}` : `ip:${getClientIdentifier(request)}`);
  const rateLimit = applyRateLimit(rateLimitKey, rateLimitConfig);

  if (!rateLimit.ok) {
    const apiError = new ApiError("Too many requests", 429, { code: "RATE_LIMITED" });
    const response = errorResponse(toErrorBody(apiError), {
      status: apiError.status,
      headers: rateLimitHeaders(rateLimit),
    });
    decorateResponse(response, corsHeaders);
    return response;
  }

  try {
    const result = await handler(handlerContext);
    decorateResponse(result, corsHeaders);

    const headers = rateLimitHeaders(rateLimit);
    Object.entries(headers).forEach(([key, value]) => {
      result.headers.set(key, value);
    });

    return result;
  } catch (unknownError) {
    console.error("[API] Handler error", unknownError);
    const apiError = toApiError(unknownError);
    const response = errorResponse(toErrorBody(apiError), {
      status: apiError.status,
      headers: rateLimitHeaders(rateLimit),
    });
    decorateResponse(response, corsHeaders);
    return response;
  }
}
