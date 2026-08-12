/**
 * Capture Oceanside demo screenshots for /sell/tour — phone-native.
 *
 * Usage:
 *   WALK_BASE=https://easylife-plaza-app.azurewebsites.net node scripts/capture-sell-tour.mjs
 *
 * Critical: clip exactly 393×852 so PNGs match PhoneFrame and never crop.
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE =
  process.env.WALK_BASE ?? "https://easylife-plaza-app.azurewebsites.net";
const OUT = join(process.cwd(), "public", "sell", "tour");
mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 393, height: 852 };
const DPR = 3;

const DEMO_BUDGET = {
  lines: [
    { id: "bl1", category: "Landscaping", budgeted: 120000, spent: 54000 },
    { id: "bl2", category: "Pool & Spa", budgeted: 85000, spent: 38000 },
    { id: "bl3", category: "Security", budgeted: 95000, spent: 42000 },
    { id: "bl4", category: "Reserve Fund", budgeted: 200000, spent: 75000 },
    { id: "bl5", category: "Utilities", budgeted: 110000, spent: 51000 },
  ],
};

const DEMO_INVOICES = {
  invoices: [
    {
      id: "inv1",
      vendor: "Greenscape Lawn Care",
      description: "August landscaping",
      amount: 3400,
      status: "pending",
      createdAt: "2026-08-10T12:00:00.000Z",
    },
    {
      id: "inv2",
      vendor: "BlueWave Pool Service",
      description: "Pool maintenance Q3",
      amount: 2100,
      status: "pending",
      createdAt: "2026-08-09T12:00:00.000Z",
    },
  ],
};

const DEMO_SURVEYS = {
  surveys: [
    { id: "sv1", status: "open", title: "Roof bid approval" },
    { id: "sv2", status: "open", title: "Reserve study allocation" },
  ],
};

async function clearAuth(context) {
  await context.clearCookies();
}

async function goLogin(page, email, password) {
  await page.goto(
    `${BASE}/go/oceansideresidents?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    { waitUntil: "domcontentloaded", timeout: 90000 },
  );
  await page.waitForTimeout(2500);
  if (page.url().includes("/login") || page.url().includes("/go/")) {
    const emailInput = page
      .locator('input[type="email"], input[name="email"]')
      .first();
    const passInput = page
      .locator('input[type="password"], input[name="password"]')
      .first();
    if (await emailInput.count()) {
      await emailInput.fill(email);
      await passInput.fill(password);
      await Promise.all([
        page
          .waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 })
          .catch(() => null),
        page
          .getByRole("button", { name: /log\s*in|sign\s*in|continue/i })
          .first()
          .click(),
      ]);
      await page.waitForTimeout(2500);
    }
  }
}

async function scrubUi(page) {
  await page
    .evaluate(() => {
      document
        .querySelectorAll(
          '[data-cookie], .cookie-banner, [aria-label*="cookie" i], [class*="Cookie"]',
        )
        .forEach((el) => el.remove());

      document.querySelectorAll("a, button, span, p").forEach((el) => {
        const text = (el.textContent || "").trim();
        if (/join another club/i.test(text)) {
          const host =
            el.closest("a, button, [class*='switch']") || el.parentElement;
          if (host) host.style.display = "none";
          else el.style.display = "none";
        }
      });
    })
    .catch(() => null);

  for (let i = 0; i < 2; i++) {
    await page.keyboard.press("Escape").catch(() => null);
    await page.waitForTimeout(150);
  }
}

async function settle(page) {
  await page
    .waitForLoadState("networkidle", { timeout: 20000 })
    .catch(() => null);
  await page.waitForTimeout(1200);
  await scrubUi(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
}

async function shot(page, name, path) {
  await page
    .goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    })
    .catch(async () => {
      await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
    });
  await settle(page);

  const file = join(OUT, `${name}.png`);
  await page.screenshot({
    path: file,
    type: "png",
    animations: "disabled",
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
  });
  console.log("saved", name, "←", page.url());
}

async function postJson(page, path, body) {
  const res = await page.request.post(`${BASE}${path}`, {
    data: body,
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok()) {
    const text = await res.text().catch(() => "");
    console.warn("POST", path, res.status(), text.slice(0, 160));
  }
  return res.ok();
}

async function seedResidentTraffic(page) {
  await postJson(page, "/api/service-requests", {
    title: "AC not cooling in living room",
    category: "HVAC",
    description: "Running but not cooling since this morning.",
    unit: "1204",
  });
  await postJson(page, "/api/service-requests", {
    title: "Lobby package locker jammed",
    category: "Common area",
    description: "Locker B-12 won't open — guest arriving at 5.",
    unit: "Lobby",
  });
}

async function seedPmTraffic(page) {
  const existing = await page.request.get(`${BASE}/api/checkins`);
  if (existing.ok()) {
    const data = await existing.json().catch(() => ({ checkins: [] }));
    const expected = (data.checkins || []).filter(
      (c) => c.status === "expected",
    );
    if (expected.length >= 2) {
      console.log("check-ins already seeded — skipping");
      return;
    }
  }

  const names = [
    { name: "Maya Chen", type: "guest", host: "Social Committee", unit: "1204" },
    { name: "Afonso Andrade", type: "vendor", host: "Unit 1204", unit: "1204" },
    { name: "FedEx", type: "vendor", host: "Front Desk", unit: "Lobby" },
  ];
  const ids = [];
  for (const row of names) {
    const res = await page.request.post(`${BASE}/api/checkins`, {
      data: row,
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok()) continue;
    const data = await res.json();
    if (data?.checkin?.id) ids.push(data.checkin.id);
  }
  for (const id of ids.slice(0, 2)) {
    await page.request.patch(`${BASE}/api/checkins`, {
      data: { id, status: "expected" },
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function focusFrontDeskLog(page) {
  await page
    .evaluate(() => {
      const headings = [...document.querySelectorAll("h2")];
      const formHeading = headings.find((h) =>
        /check in/i.test(h.textContent || ""),
      );
      formHeading?.closest(".rounded-xl")?.remove();

      const seen = new Set();
      const rows = [
        ...document.querySelectorAll(".space-y-3 > .flex.items-center"),
      ];
      for (const row of rows) {
        const name = row.querySelector("p")?.textContent?.trim() || "";
        if (!name) continue;
        if (seen.has(name) || seen.size >= 4) {
          row.remove();
          continue;
        }
        seen.add(name);
      }

      const log = headings.find((h) =>
        /today'?s log/i.test(h.textContent || ""),
      );
      log?.scrollIntoView({ block: "start" });
      window.scrollBy(0, -12);
    })
    .catch(() => null);
  await page.waitForTimeout(400);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DPR,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    locale: "en-US",
    timezoneId: "America/New_York",
  });

  await context.route("**/api/budget", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DEMO_BUDGET),
    });
  });
  await context.route("**/api/invoices", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DEMO_INVOICES),
    });
  });
  await context.route("**/api/surveys", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DEMO_SURVEYS),
    });
  });

  const page = await context.newPage();
  await goLogin(
    page,
    "social.committee@oceansideresidents.com",
    "password",
  );
  await seedResidentTraffic(page);
  await shot(page, "01-member-home", "/member");
  await shot(page, "02-amenities", "/member/amenities");
  await shot(page, "03-calendar", "/member/calendar");
  await shot(page, "04-messages", "/member/messages");
  await shot(page, "05-local-pros", "/member/local-pros");
  await shot(page, "06-payments", "/member/payments");
  await shot(page, "07-visitors", "/member/visitors");

  await clearAuth(context);
  const page2 = await context.newPage();
  await goLogin(page2, "pm.demo@oceansideresidents.com", "password");
  await seedPmTraffic(page2);
  await shot(page2, "08-pm-home", "/pm");

  await page2
    .goto(`${BASE}/pm/front-desk`, {
      waitUntil: "networkidle",
      timeout: 90000,
    })
    .catch(async () => {
      await page2.goto(`${BASE}/pm/front-desk`, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
    });
  await settle(page2);
  await focusFrontDeskLog(page2);
  await scrubUi(page2);
  await page2.screenshot({
    path: join(OUT, "09-pm-front-desk.png"),
    type: "png",
    animations: "disabled",
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
  });
  console.log("saved 09-pm-front-desk ←", page2.url());
  await shot(page2, "10-pm-bookings", "/pm/maintenance");

  await clearAuth(context);
  const page3 = await context.newPage();
  await goLogin(page3, "board.demo@oceansideresidents.com", "password");
  await shot(page3, "11-board-home", "/board");
  await shot(page3, "12-board-budget", "/board/budget");

  await clearAuth(context);
  const page4 = await context.newPage();
  try {
    await goLogin(page4, "isaacbreno@gmail.com", "password");
    await shot(page4, "13-provider-home", "/provider");
  } catch (err) {
    console.warn("provider capture skipped", err);
  }

  await browser.close();
  console.log("done →", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
