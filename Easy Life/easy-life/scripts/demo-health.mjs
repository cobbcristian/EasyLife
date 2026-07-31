/**
 * Smoke-check demo tenants: /go lock, logo asset, login, optional apparel.
 *
 * Usage:
 *   node scripts/demo-health.mjs
 *   BASE_URL=https://easy-life-peach-two.vercel.app node scripts/demo-health.mjs
 */
const BASE = (process.env.BASE_URL || "https://easy-life-peach-two.vercel.app").replace(
  /\/$/,
  "",
);

/** Keep in sync with sales-ready tenants in src/lib/tenant.ts */
const TENANTS = [
  { id: "ironcrest", email: "member.golf@theclubatironlake.com", logo: "/brand/community-ironcrest.svg" },
  { id: "bonitabay", email: "member.demo@bonitabayclub.net", logo: "/brand/community-bonita-bay.png", apparel: "/brand/apparel/bb-apparel-polo-navy.png" },
  { id: "highlandwoods", email: "member.demo@hwgcc.com", logo: "/brand/community-highland-woods.png", apparel: "/brand/apparel/hw-apparel-polo-navy.png" },
  { id: "spanishwells", email: "member.demo@spanishwellscountryclub.com", logo: "/brand/community-spanish-wells.png", apparel: "/brand/apparel/sp-apparel-polo-navy.png" },
  { id: "harborpointe", email: "member.demo@harborpointehoa.com", logo: "/brand/community-harbor-pointe.png", apparel: "/brand/apparel/hp-apparel-polo-navy.png" },
  { id: "willowcreek", email: "member.demo@willowcreekhoa.com", logo: "/brand/community-willow-creek.png", apparel: "/brand/apparel/wc-apparel-polo-navy.png" },
  { id: "alliant", email: "pm.demo@alliantproperty.com", logo: "/brand/community-alliant.png", apparel: "/brand/apparel/al-apparel-polo-navy.png" },
];

async function check(url, init) {
  try {
    const res = await fetch(url, { ...init, redirect: "manual" });
    return { ok: res.status >= 200 && res.status < 400, status: res.status, res };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}

async function main() {
  console.log(`Demo health → ${BASE}\n`);

  const health = await check(`${BASE}/api/health`);
  let healthBody = {};
  try {
    healthBody = health.res ? await health.res.json() : {};
  } catch {
    /* ignore */
  }
  console.log(
    `health  ${health.ok && healthBody.ok ? "PASS" : "FAIL"}  status=${health.status} db=${healthBody.db} push=${healthBody.push}`,
  );

  let failed = health.ok && healthBody.ok ? 0 : 1;

  for (const t of TENANTS) {
    const go = await check(`${BASE}/go/${t.id}`);
    const goOk = go.status === 307 || go.status === 302 || go.status === 200;
    const logo = await check(`${BASE}${t.logo}`);
    const login = await check(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: t.email,
        password: "password",
        demoTenantId: t.id,
      }),
    });
    let loginOk = false;
    if (login.res) {
      try {
        const body = await login.res.json();
        loginOk = login.status === 200 && body.ok === true;
      } catch {
        loginOk = false;
      }
    }
    let apparelOk = true;
    if (t.apparel) {
      const ap = await check(`${BASE}${t.apparel}`);
      apparelOk = ap.ok && ap.status === 200;
    }

    const rowOk = goOk && logo.ok && loginOk && apparelOk;
    if (!rowOk) failed += 1;
    console.log(
      `${rowOk ? "PASS" : "FAIL"}  ${t.id.padEnd(16)} go=${go.status} logo=${logo.status} login=${login.status}${loginOk ? "" : "!"} apparel=${t.apparel ? (apparelOk ? "200" : "FAIL") : "n/a"}`,
    );
  }

  console.log(`\n${failed === 0 ? "All checks passed" : `${failed} check(s) failed`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
