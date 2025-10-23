#!/usr/bin/env node
import { chromium, request as pwRequest } from "playwright";
import fs from "node:fs/promises";

const LOGIN_URL = "https://app.anoig.com/login";
const DIAG_URL = "https://app.anoig.com/auth/diag";

// Discover latest production vercel alias to test canonicalization
const discoverVercelAlias = async () => {
  return process.env.VERCEL_PROD_ALIAS || null;
};

const out = [];

try {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1) Login page + screenshot
  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Entrar");
  await page.screenshot({ path: "apps/web/qa-login.png", fullPage: true });

  // 2) Validate OAuth redirect param by watching network for supabase authorize
  let oauthOk = false;
  const reqPromise = new Promise((resolve) => {
    const handler = (req) => {
      const url = req.url();
      if (/supabase\.co\/auth\/v1\/authorize/.test(url)) {
        page.off("request", handler);
        resolve(url);
      }
    };
    page.on("request", handler);
  });
  // Click the button labeled "Entrar com Google"
  const googleBtn = await page.getByRole("button", { name: "Entrar com Google" });
  await googleBtn.click({ timeout: 5000 });
  const authorizeUrl = await reqPromise;
  let rt = "";
  if (authorizeUrl) {
    const u = new URL(authorizeUrl);
    const qp = u.searchParams;
    rt = qp.get("redirect_to") || qp.get("redirect_uri") || "";
  }
  if (rt.endsWith("https://app.anoig.com/auth/callback") && !rt.includes("localhost")) {
    oauthOk = true;
  }
  out.push(
    `Google redirect param: ${oauthOk ? "OK (…/auth/callback)" : "FAIL (redirect_to inválido: " + rt + ")"}`
  );

  // 3) Diag page + screenshot
  const page2 = await context.newPage();
  await page2.goto(DIAG_URL, { waitUntil: "domcontentloaded" });
  await page2.screenshot({ path: "apps/web/qa-diag.png", fullPage: true });
  const diagContent = await page2.textContent("body");
  const diagOk =
    diagContent?.includes("NEXT_PUBLIC_SITE_URL") && diagContent?.includes("https://app.anoig.com");
  out.push(
    `Diag page: ${diagOk ? "OK (NEXT_PUBLIC_SITE_URL=https://app.anoig.com)" : "FAIL (SITE_URL incorreto)"}`
  );

  await browser.close();

  // 4) Canonical callback 301 via vercel alias
  const alias = await discoverVercelAlias();
  if (alias) {
    const req = await pwRequest.newContext();
    const res = await req.get(`${alias.replace(/\/$/, "")}/auth/callback?code=TESTE`, {
      maxRedirects: 0,
    });
    const status = res.status();
    const location = res.headers()["location"] || res.headers()["Location"];
    const canonOk =
      status === 301 &&
      typeof location === "string" &&
      location.startsWith("https://app.anoig.com/auth/callback");
    out.push(
      `Canonical callback 301: ${canonOk ? "OK" : "FAIL (status=" + status + ", location=" + location + ")"}`
    );
    await req.dispose();
  } else {
    out.push("Canonical callback 301: FAIL (alias não encontrado)");
  }

  await fs.writeFile("apps/web/qa-summary.txt", out.join("\n"));
  console.log("Deploy: https://app.anoig.com");
  for (const line of out) console.log(line);
  console.log("Screenshots: apps/web/qa-login.png, apps/web/qa-diag.png");
} catch (err) {
  console.error("FAIL", err?.message || String(err));
  process.exit(1);
}
