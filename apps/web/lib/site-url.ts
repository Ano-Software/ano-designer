/**
 * Returns the site URL in a server-safe way.
 * - In production: uses NEXT_PUBLIC_SITE_URL
 * - In development: http://localhost:3000
 * - If a Request is provided, tries x-forwarded-proto + host as a fallback
 */
export function getSiteURL(req?: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (process.env.NODE_ENV === "production" && envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  // Try to infer from request headers if available (works behind proxies)
  if (req) {
    const proto = req.headers.get("x-forwarded-proto") || "";
    const host = req.headers.get("host") || "";
    if (proto && host) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  // Development fallback
  return "http://localhost:3000";
}
