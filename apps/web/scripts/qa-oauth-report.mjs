#!/usr/bin/env node
import { chromium } from "playwright";
import fs from "node:fs/promises";

const CANON = "https://app.anoig.com";
const BASE = CANON; // always test production domain
const LOGIN_URL = `${BASE.replace(/\/$/, "")}/login`;
const DIAG_URL = `${BASE.replace(/\/$/, "")}/auth/diag`;

let redirectParam = "";
let checkStatus = "FAIL";
let diagStatus = "FAIL";
let diagValue = "<unknown>";

try {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Login page, capture authorize request
  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Entrar");
  await page.screenshot({ path: "apps/web/qa-login.png", fullPage: true });

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
  if (authorizeUrl) {
    const u = new URL(authorizeUrl);
    const qp = u.searchParams;
    redirectParam = qp.get("redirect_to") || qp.get("redirect_uri") || "";
    const expected = `${CANON}/auth/callback`;
    const endsOk = typeof redirectParam === "string" && redirectParam.endsWith(expected);
    const notLocalhost = !/localhost/i.test(redirectParam || "");
    checkStatus = endsOk && notLocalhost ? "OK" : "FAIL";
  }

  // Diag page
  const page2 = await context.newPage();
  await page2.goto(DIAG_URL, { waitUntil: "domcontentloaded" });
  await page2.screenshot({ path: "apps/web/qa-diag.png", fullPage: true });
  const bodyText = await page2.textContent("body");
  if (bodyText && bodyText.includes(CANON)) {
    diagValue = CANON;
    diagStatus = "OK";
  } else {
    const m = bodyText && bodyText.match(/NEXT_PUBLIC_SITE_URL\s*[:=]\s*(https?:\/\/[^\s]+)/i);
    if (m && m[1]) {
      diagValue = m[1];
    }
    diagStatus = diagValue === CANON ? "OK" : "FAIL";
  }

  await browser.close();
} catch (err) {
  // fall through to final print
}

// Final required output
console.log("Deploy: https://app.anoig.com");
console.log(`Google redirect param: ${redirectParam || "<empty>"}`);
console.log(`Check: ${checkStatus} (esperado terminar em https://app.anoig.com/auth/callback)`);
console.log(`Diag page: ${diagStatus} (NEXT_PUBLIC_SITE_URL=${diagValue})`);
console.log("Screenshots: apps/web/qa-login.png, apps/web/qa-diag.png");
