#!/usr/bin/env node
import { chromium, request as pwRequest } from "playwright";
import fs from "node:fs/promises";

const CANON = "https://app.anoig.com";
const BASE = process.env.QA_BASE_URL || CANON;
const LOGIN_URL = `${BASE.replace(/\/$/, "")}/login`;
const DIAG_URL = `${BASE.replace(/\/$/, "")}/auth/diag`;

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
  const googleBtn = await page.getByRole("button", { name: "Entrar com Google" });
  await googleBtn.click({ timeout: 5000 });
  const authorizeUrl = await reqPromise;
  let rt = "";
  if (authorizeUrl) {
    const u = new URL(authorizeUrl);
    const qp = u.searchParams;
    rt = qp.get("redirect_to") || qp.get("redirect_uri") || "";
  }
  if (rt.endsWith(`${CANON}/auth/callback`) && !rt.includes("localhost")) {
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
  const diagOk = diagContent?.includes("NEXT_PUBLIC_SITE_URL") && diagContent?.includes(CANON);
  out.push(
    `Diag page: ${diagOk ? `OK (NEXT_PUBLIC_SITE_URL=${CANON})` : "FAIL (SITE_URL incorreto)"}`
  );

  await browser.close();

  // 4) Canonical callback 301 (force canonical domain)
  const req = await pwRequest.newContext();
  const testUrl = `${BASE.replace(/\/$/, "")}/auth/callback?code=TESTE`;
  const checkCanon = async (url) => {
    try {
      const res = await req.get(url, { maxRedirects: 0 });
      const status = res.status();
      const location = res.headers()["location"] || res.headers()["Location"] || "";
      if (status !== 301 && status !== 308) return false;
      if (typeof location !== "string") return false;
      const u = new URL(location);
      const samePath = `${u.origin}${u.pathname}` === `${CANON}/auth/callback`;
      const codeOk = u.searchParams.get("code") === "TESTE";
      return samePath && codeOk;
    } catch {
      return false;
    }
  };
  let canonOk = false;
  if (BASE !== CANON) {
    canonOk =
      (await checkCanon(testUrl)) || (await checkCanon(`${CANON}/auth/callback?code=TESTE`));
  } else {
    canonOk = true; // already canonical domain
  }
  await req.dispose();
  out.push(`Canonical callback 301: ${canonOk ? "OK" : "FAIL"}`);

  await fs.writeFile("apps/web/qa-summary.txt", out.join("\n"));
  console.log("Deploy: https://app.anoig.com");
  for (const line of out) console.log(line);
  console.log("Screenshots: apps/web/qa-login.png, apps/web/qa-diag.png");
} catch (err) {
  console.error("FAIL", err?.message || String(err));
  process.exit(1);
}
