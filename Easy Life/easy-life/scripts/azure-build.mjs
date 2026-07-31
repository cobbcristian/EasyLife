/**
 * Azure / container production build.
 * Does NOT seed demo clubs unless ALLOW_DEMO_SEED=1.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
if (!url?.startsWith("postgres")) {
  console.error(
    "azure-build requires DATABASE_URL (or POSTGRES_PRISMA_URL) starting with postgres://",
  );
  process.exit(1);
}

const schemaPath = "prisma/schema.prisma";
const schema = readFileSync(schemaPath, "utf8");
if (schema.includes('provider = "sqlite"')) {
  writeFileSync(
    schemaPath,
    schema.replace('provider = "sqlite"', 'provider = "postgresql"'),
  );
}

process.env.DATABASE_URL = url;
execSync("npx prisma generate", { stdio: "inherit", env: process.env });

try {
  execSync("npx prisma db push", { stdio: "inherit", env: process.env });
} catch (err) {
  console.error("[azure-build] prisma db push failed", err);
  throw err;
}

if (process.env.ALLOW_DEMO_SEED === "1" || process.env.ALLOW_DEMO_SEED === "true") {
  try {
    execSync("npx --yes tsx scripts/seed-chats-now.ts", {
      stdio: "inherit",
      env: process.env,
    });
  } catch (err) {
    console.warn("[azure-build] demo seed failed (non-fatal)", err);
  }
} else {
  console.log("[azure-build] skipping demo seed (set ALLOW_DEMO_SEED=1 to enable)");
}

execSync("npx next build", { stdio: "inherit", env: process.env });
console.log("[azure-build] done");
