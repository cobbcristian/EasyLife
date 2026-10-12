import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
if (!url?.startsWith("postgres")) {
  console.error(
    "\nEasy Life deploy needs Postgres.\n" +
      "1. Open https://vercel.com/cobbcristians-projects/~/integrations/accept-terms/neon\n" +
      "2. Accept terms, then run: npx vercel integration add neon/neon\n" +
      "3. Create a Neon database in Vercel → Storage and connect it to easy-life\n" +
      "4. Redeploy: npx vercel deploy --prod\n",
  );
  process.exit(1);
}

const schemaPath = "prisma/schema.prisma";
const schema = readFileSync(schemaPath, "utf8");
writeFileSync(
  schemaPath,
  schema.replace('provider = "sqlite"', 'provider = "postgresql"'),
);

process.env.DATABASE_URL = url;
execSync("npx prisma generate", { stdio: "inherit", env: process.env });
// Prefer schema sync without destructive flags. Once prisma/migrations exists, switch to:
//   npx prisma migrate deploy
try {
  execSync("npx prisma db push --accept-data-loss", {
    stdio: "inherit",
    env: process.env,
  });
} catch (err) {
  console.error("[vercel-build] prisma db push failed", err);
  throw err;
}
// Seed demo chats at build time so Messages is populated before the first visit
// (runtime seed on cold serverless was timing out → empty inbox).
try {
  execSync("npx --yes tsx scripts/seed-chats-now.ts", {
    stdio: "inherit",
    env: process.env,
  });
} catch (err) {
  console.warn("[vercel-build] chat seed failed (non-fatal)", err);
}
execSync("npx next build", { stdio: "inherit", env: process.env });
