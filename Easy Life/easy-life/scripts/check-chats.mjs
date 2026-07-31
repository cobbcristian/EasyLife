import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const parts = await p.chatParticipant.count();
  const threads = await p.chatThread.count();
  const caroline = await p.chatParticipant.findMany({
    where: { userEmail: "member.golf@theclubatironlake.com" },
  });
  const sample = await p.chatThread.findMany({
    take: 8,
    select: { id: true, communityId: true, kind: true, title: true },
  });
  console.log(JSON.stringify({ parts, threads, carolineCount: caroline.length, caroline, sample }, null, 2));
} finally {
  await p.$disconnect();
}
