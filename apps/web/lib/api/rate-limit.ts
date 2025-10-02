type Bucket = {
  hits: number;
  resetAt: number;
};

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getBucket(key: string, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const next = { hits: 0, resetAt: now + windowMs };
    buckets.set(key, next);
    return next;
  }

  return bucket;
}

export function applyRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const bucket = getBucket(key, config.windowMs);
  bucket.hits += 1;

  const ok = bucket.hits <= config.limit;
  const remaining = ok ? config.limit - bucket.hits : 0;

  return {
    ok,
    limit: config.limit,
    remaining,
    resetAt: bucket.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  } satisfies Record<string, string>;
}
