import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });
process.env.ALLOW_DEMO_SEED = "1";

const { ensureIronLakeDemoChats } = await import("../src/lib/server/iron-lake-seed.ts");
const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient();

try {
  console.log("Seeding chats...");
  await ensureIronLakeDemoChats();
  const parts = await p.chatParticipant.count();
  const threads = await p.chatThread.count();
  const caroline = await p.chatParticipant.findMany({
    where: { userEmail: "member.golf@theclubatironlake.com" },
  });
  console.log(JSON.stringify({ parts, threads, carolineCount: caroline.length }, null, 2));
} catch (e) {
  console.error("SEED FAILED", e);
  process.exitCode = 1;
} finally {
  await p.$disconnect();
}
