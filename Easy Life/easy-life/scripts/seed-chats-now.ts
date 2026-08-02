/**
 * Seed demo tenants into the current DATABASE_URL.
 * Used by local scripts and Vercel builds so login accounts exist before first visit.
 */
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

function loadEnvFile(file: string) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key in process.env && process.env[key]) continue;
    process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");
process.env.ALLOW_DEMO_SEED = process.env.ALLOW_DEMO_SEED || "1";

async function main() {
  const {
    ensureIronLakeDemoChats,
    ensureIronLakeDemoEngagement,
    ensureIronLakeDemoSeeded,
  } = await import("../src/lib/server/iron-lake-seed");
  const { ensureHuntersRidgeDemoSeeded } = await import(
    "../src/lib/server/hunters-ridge-seed"
  );
  const { ensureBonitaBayDemoSeeded } = await import(
    "../src/lib/server/bonita-bay-seed"
  );
  const { ensureShadowWoodDemoSeeded } = await import(
    "../src/lib/server/shadow-wood-seed"
  );
  const { ensureHeronCreekDemoSeeded } = await import(
    "../src/lib/server/heron-creek-seed"
  );
  const { ensureDebaryDemoSeeded } = await import(
    "../src/lib/server/debary-seed"
  );
  const { ensureJacarandaDemoSeeded } = await import(
    "../src/lib/server/jacaranda-seed"
  );
  const { ensureTheDunesDemoSeeded } = await import(
    "../src/lib/server/the-dunes-seed"
  );
  const { ensureMartinDownsDemoSeeded } = await import(
    "../src/lib/server/martin-downs-seed"
  );
  const { ensureTheNestDemoSeeded } = await import(
    "../src/lib/server/the-nest-seed"
  );
  const { ensureWorthingtonDemoSeeded } = await import(
    "../src/lib/server/worthington-seed"
  );
  const { ensureEsteroDemoSeeded } = await import(
    "../src/lib/server/estero-seed"
  );
  const { ensureSeagateDemoSeeded } = await import(
    "../src/lib/server/seagate-seed"
  );
  const { ensureCopperleafDemoSeeded } = await import(
    "../src/lib/server/copperleaf-seed"
  );
  const { ensureClubRenaissanceDemoSeeded } = await import(
    "../src/lib/server/club-renaissance-seed"
  );
  const { ensureFallsClubDemoSeeded } = await import(
    "../src/lib/server/falls-club-seed"
  );
  const { ensureWildcatRunDemoSeeded } = await import(
    "../src/lib/server/wildcat-run-seed"
  );
  const { ensureHighlandWoodsDemoSeeded } = await import(
    "../src/lib/server/highland-woods-seed"
  );
  const { ensureBonitaNationalDemoSeeded } = await import(
    "../src/lib/server/bonita-national-seed"
  );
  const { ensureCarrollwoodDemoSeeded } = await import(
    "../src/lib/server/carrollwood-seed"
  );
  const { ensureWindsorDemoSeeded } = await import(
    "../src/lib/server/windsor-seed"
  );
  const { ensureSpanishWellsDemoSeeded } = await import(
    "../src/lib/server/spanish-wells-seed"
  );
  const { ensureHarborPointeDemoSeeded } = await import(
    "../src/lib/server/harbor-pointe-seed"
  );
  const { ensureWillowCreekDemoSeeded } = await import(
    "../src/lib/server/willow-creek-seed"
  );
  const { ensureAlliantDemoSeeded } = await import(
    "../src/lib/server/alliant-seed"
  );
  const { ensureOceansideResidentsDemoSeeded } = await import(
    "../src/lib/server/oceanside-residents-seed"
  );
  const { ensureSeeded } = await import("../src/lib/server/db");
  const { PrismaClient } = await import("@prisma/client");
  const p = new PrismaClient();
  try {
    try {
      console.log("Backfilling seed users + communities…");
      await ensureSeeded();
    } catch (err) {
      console.warn("[seed] ensureSeeded failed (continuing)", err);
    }
    try {
      console.log("Seeding IronCrest full demo…");
      await ensureIronLakeDemoSeeded();
    } catch (err) {
      console.warn("[seed] full Iron Lake seed failed (continuing with chats/engagement)", err);
    }
    for (const [label, run] of [
      ["Hunters Ridge", ensureHuntersRidgeDemoSeeded],
      ["Bonita Bay", ensureBonitaBayDemoSeeded],
      ["Shadow Wood", ensureShadowWoodDemoSeeded],
      ["Heron Creek", ensureHeronCreekDemoSeeded],
      ["DeBary", ensureDebaryDemoSeeded],
      ["Jacaranda", ensureJacarandaDemoSeeded],
      ["The Dunes", ensureTheDunesDemoSeeded],
      ["Martin Downs", ensureMartinDownsDemoSeeded],
      ["The Nest", ensureTheNestDemoSeeded],
      ["Estero Country Club", ensureEsteroDemoSeeded],
      ["Worthington", ensureWorthingtonDemoSeeded],
      ["Seagate", ensureSeagateDemoSeeded],
      ["Copperleaf", ensureCopperleafDemoSeeded],
      ["Club Renaissance", ensureClubRenaissanceDemoSeeded],
      ["The Falls Club", ensureFallsClubDemoSeeded],
      ["Wildcat Run", ensureWildcatRunDemoSeeded],
      ["Highland Woods", ensureHighlandWoodsDemoSeeded],
      ["Bonita National", ensureBonitaNationalDemoSeeded],
      ["Carrollwood", ensureCarrollwoodDemoSeeded],
      ["Windsor", ensureWindsorDemoSeeded],
      ["Spanish Wells", ensureSpanishWellsDemoSeeded],
      ["Harbor Pointe", ensureHarborPointeDemoSeeded],
      ["Willow Creek", ensureWillowCreekDemoSeeded],
      ["Alliant", ensureAlliantDemoSeeded],
      ["Oceanside Residents", ensureOceansideResidentsDemoSeeded],
    ] as const) {
      try {
        console.log(`Seeding ${label} demo…`);
        await run();
      } catch (err) {
        console.warn(`[seed] ${label} seed failed (non-fatal)`, err);
      }
    }
    console.log("Seeding chats + engagement…");
    await ensureIronLakeDemoChats();
    await ensureIronLakeDemoEngagement();
    const parts = await p.chatParticipant.count();
    const threads = await p.chatThread.count();
    const posts = await p.groupPost.count();
    const tickets = await p.helpTicket.count();
    const caroline = await p.chatParticipant.count({
      where: { userEmail: "member.golf@theclubatironlake.com" },
    });
    const bb = await p.user.findUnique({
      where: { email: "member.demo@bonitabayclub.net" },
      select: { id: true },
    });
    const sw = await p.user.findUnique({
      where: { email: "member.demo@shadowwoodcc.com" },
      select: { id: true },
    });
    const spanishWells = await p.user.findUnique({
      where: { email: "member.demo@spanishwellscountryclub.com" },
      select: { id: true },
    });
    const alliantPm = await p.user.findUnique({
      where: { email: "pm.demo@alliantproperty.com" },
      select: { id: true },
    });
    const oceansideMember = await p.user.findUnique({
      where: { email: "member.demo@oceansideresidents.com" },
      select: { id: true },
    });
    const oceansidePartner = await p.user.findUnique({
      where: { email: "dlms6768@gmail.com" },
      select: { id: true, role: true },
    });
    console.log(
      JSON.stringify(
        {
          parts,
          threads,
          posts,
          tickets,
          caroline,
          bonitaBayMember: Boolean(bb),
          shadowWoodMember: Boolean(sw),
          spanishWellsMember: Boolean(spanishWells),
          alliantPm: Boolean(alliantPm),
          oceansideMember: Boolean(oceansideMember),
          oceansidePartnerRole: oceansidePartner?.role ?? null,
        },
        null,
        2,
      ),
    );
  } finally {
    await p.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
