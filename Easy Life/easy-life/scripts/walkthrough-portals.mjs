/**
 * One-off portal walkthrough: member → provider → Managing Club.
 * Captures status, visible errors, and screenshots.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = process.env.WALK_BASE ?? "https://easy-life-peach-two.vercel.app";
const OUT = join(process.cwd(), ".walkthrough-artifacts");
mkdirSync(OUT, { recursive: true });

const issues = [];
const log = [];

function note(level, portal, message, extra = {}) {
  const row = { level, portal, message, ...extra, at: new Date().toISOString() };
  log.push(row);
  if (level === "error" || level === "warn") issues.push(row);
  console.log(`[${level}] ${portal}: ${message}`);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(500);
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page.locator('input[type="password"], input[name="password"]').first();
  await emailInput.fill(email);
  await passInput.fill(password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null),
    page.getByRole("button", { name: /log\s*in|sign\s*in|continue/i }).first().click(),
  ]);
  await page.waitForTimeout(1500);
  return page.url();
}

async function logout(page) {
  // Try common logout paths
  const menu = page.locator("button, a").filter({ hasText: /log\s*out|sign\s*out/i }).first();
  if (await menu.count()) {
    await menu.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  await page.goto(`${BASE}/api/auth/logout`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" }).catch(() => {});
}

async function collectPageProblems(page, portal, label) {
  const url = page.url();
  const title = await page.title().catch(() => "");
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const shot = join(OUT, `${portal}-${label}.png`);
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});

  const bad =
    /Something went wrong|Could not load|Unauthorized|Internal Server Error|Application error|404|Not Found|Payments are not configured|Add STRIPE/i.test(
      bodyText,
    );
  const emptyAwkward =
    /No results\s*$|undefined|\[object Object\]|NaN|null\b/i.test(bodyText.slice(0, 2000));

  if (bad) {
    note("error", portal, `Broken or error UI on ${label}`, {
      url,
      title,
      shot,
      snippet: bodyText.slice(0, 280),
    });
  } else if (emptyAwkward) {
    note("warn", portal, `Awkward empty/raw content on ${label}`, {
      url,
      shot,
      snippet: bodyText.slice(0, 280),
    });
  } else {
    note("ok", portal, `OK ${label}`, { url, shot });
  }
  return { url, bodyText };
}

async function visitPaths(page, portal, paths) {
  for (const path of paths) {
    const label = path.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "home";
    try {
      const res = await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.waitForTimeout(1000);
      const status = res?.status?.() ?? 0;
      if (status >= 400) {
        note("error", portal, `HTTP ${status} on ${path}`, { url: page.url() });
      }
      await collectPageProblems(page, portal, label);
    } catch (e) {
      note("error", portal, `Failed to open ${path}: ${e.message}`);
    }
  }
}

async function walkMember(page) {
  const portal = "member";
  const url = await login(page, "sarah.mitchell@oceanside.com", "password");
  if (!/member|calendar|home/i.test(url) && !page.url().includes("/member")) {
    note("warn", portal, `Unexpected post-login URL: ${page.url()}`);
  }
  await collectPageProblems(page, portal, "after-login");

  await visitPaths(page, portal, [
    "/member",
    "/member/notifications",
    "/member/calendar",
    "/member/bookings",
    "/member/payments",
    "/member/messages",
    "/member/local-pros",
    "/member/dining",
    "/member/profile",
  ]);

  // Invite accept surface
  await page.goto(`${BASE}/member/notifications`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const accept = page.getByRole("button", { name: /accept|pay & go/i }).first();
  if (await accept.count()) {
    note("ok", portal, "Invite Accept button present");
  } else {
    note("warn", portal, "No Accept button visible (may be empty invites — OK)");
  }

  // Bookings CTA
  await page.goto(`${BASE}/member/bookings`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const bookish = await page.getByText(/book|reserve|facility/i).count();
  if (!bookish) note("warn", portal, "Bookings page may lack a clear Book entry");
}

async function walkProvider(page) {
  const portal = "provider";
  await logout(page);
  const url = await login(page, "cassiesmeticuloustouch@gmail.com", "password1!");
  if (!page.url().includes("/provider")) {
    note("warn", portal, `Unexpected post-login URL: ${page.url()} (from ${url})`);
  }
  await collectPageProblems(page, portal, "after-login");

  await visitPaths(page, portal, [
    "/provider",
    "/provider/bookings",
    "/provider/services",
    "/provider/messages",
    "/provider/transactions",
    "/provider/account",
    "/provider/calendar",
  ]);

  await page.goto(`${BASE}/provider/bookings`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const hasDay = await page.getByText(/day schedule|schedule|create booking|\+/i).count();
  if (!hasDay) note("warn", portal, "Provider bookings lacks schedule/create cues");
}

async function walkAdmin(page) {
  const portal = "admin";
  await logout(page);
  const url = await login(page, "goldenocala01@gmail.com", "password");
  if (!/dashboard|communities|admin/i.test(page.url()) && !page.url().includes("/dashboard")) {
    // may land on dashboard
    note("warn", portal, `Unexpected post-login URL: ${page.url()} (from ${url})`);
  }
  await collectPageProblems(page, portal, "after-login");

  await visitPaths(page, portal, [
    "/dashboard",
    "/communities",
    "/services-activities",
    "/subscriptions",
    "/account",
    "/help-desk",
    "/tournaments",
    "/roles",
    "/amenities",
  ]);

  // Side nav focus check
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const navText = await page.locator("aside, nav").first().innerText().catch(() => "");
  const allowed = /Communities|Providers|Subscriptions|Dashboard|Account|Managing Club/i;
  const mixed = /Board workspace|Front Desk|Scheduler|Governance/i.test(navText);
  if (mixed) {
    note("error", portal, "Managing Club nav mixes Board/PM items", { snippet: navText.slice(0, 400) });
  }
  if (!allowed.test(navText)) {
    note("warn", portal, "Managing Club nav missing expected primary links", {
      snippet: navText.slice(0, 400),
    });
  } else {
    note("ok", portal, "Managing Club nav looks focused");
  }

  // Kitchen-sink pages still reachable?
  for (const path of ["/tournaments", "/roles", "/amenities"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    const body = await page.locator("body").innerText().catch(() => "");
    if (/Something went wrong|Internal Server Error/i.test(body)) {
      note("error", portal, `Deep-link ${path} crashes`);
    } else {
      note("warn", portal, `Deep-link ${path} still reachable (outside slim nav — note only)`);
    }
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
});
const page = await context.newPage();
page.on("pageerror", (err) => note("error", "runtime", err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") note("warn", "console", msg.text());
});

try {
  await walkMember(page);
  await walkProvider(page);
  await walkAdmin(page);
} catch (e) {
  note("error", "walkthrough", e.message);
} finally {
  writeFileSync(join(OUT, "report.json"), JSON.stringify({ BASE, issues, log }, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(`Issues: ${issues.length}`);
  for (const i of issues) console.log(`- [${i.level}] ${i.portal}: ${i.message}`);
  await browser.close();
}
