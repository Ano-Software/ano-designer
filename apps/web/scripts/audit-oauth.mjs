#!/usr/bin/env node
// Lightweight audit for Google OAuth redirect base. No secrets printed.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "";
const EXPECTED = "https://app.anoig.com";

console.log("OAuth Audit (apps/web)");
console.log("NEXT_PUBLIC_SITE_URL:", SITE || "<unset>");
console.log("window origin fallback (simulado):", EXPECTED);

if (!SITE.startsWith(EXPECTED)) {
  console.log("FAIL: NEXT_PUBLIC_SITE_URL não aponta para", EXPECTED);
} else {
  console.log("OK: NEXT_PUBLIC_SITE_URL está configurado para produção correta");
}
