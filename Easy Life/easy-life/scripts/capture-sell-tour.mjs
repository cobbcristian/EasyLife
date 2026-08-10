/**
 * Capture Oceanside demo screenshots for /sell/tour pitch.
 * Usage: WALK_BASE=https://easylife-plaza-app.azurewebsites.net node scripts/capture-sell-tour.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE =
  process.env.WALK_BASE ?? "https://easylife-plaza-app.azurewebsites.net";
const OUT = join(process.cwd(), "public", "sell", "tour");
mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 1280, height: 800 };

async function clearAuth(context) {
  await context.clearCookies();
}

async function goLogin(page, email, password) {
  await page.goto(
    `${BASE}/go/oceansideresidents?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    { waitUntil: "domcontentloaded", timeout: 90000 },
  );
  await page.waitForTimeout(2000);
  // If still on login, fill and submit
  if (page.url().includes("/login")) {
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
      await page.waitForTimeout(2000);
    }
  }
}

async function shot(page, name, path) {
  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 90000,
  }).catch(async () => {
    await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
  });
  await page.waitForTimeout(1800);
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", file, "from", page.url());
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Resident / social committee
  await goLogin(
    page,
    "social.committee@oceansideresidents.com",
    "password",
  );
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
  await shot(page2, "08-pm-home", "/pm");
  await shot(page2, "09-pm-front-desk", "/pm/front-desk");
  await shot(page2, "10-pm-bookings", "/pm/bookings");

  await clearAuth(context);
  const page3 = await context.newPage();
  await goLogin(page3, "board.demo@oceansideresidents.com", "password");
  await shot(page3, "11-board-home", "/board");
  await shot(page3, "12-board-budget", "/board/budget");

  // Provider — Isaac if possible, else skip gracefully
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
