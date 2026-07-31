/**
 * Force-seed The Club at Iron Lake / IronCrest demo into the current database.
 * Usage: npm run seed:iron-lake
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
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");
process.env.ALLOW_DEMO_SEED = process.env.ALLOW_DEMO_SEED || "1";

async function main() {
  const { ensureSeeded } = await import("../src/lib/server/db");
  const { ensureIronLakeDemoSeeded } = await import("../src/lib/server/iron-lake-seed");
  const { IRON_LAKE_COMMUNITY_ID, IRON_LAKE_DEMO_USERS } = await import(
    "../src/lib/iron-lake-demo"
  );

  await ensureSeeded();
  await ensureIronLakeDemoSeeded();

  console.log(`Seeded community: ${IRON_LAKE_COMMUNITY_ID}`);
  console.log("Demo logins:");
  for (const u of IRON_LAKE_DEMO_USERS) {
    const tier = "tier" in u ? ` · tier ${u.tier}` : "";
    console.log(`  ${u.role.padEnd(8)}  ${u.email}  /  ${u.password}${tier}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
