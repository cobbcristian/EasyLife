import { prisma } from "@/lib/server/prisma";

/** Barnaby chats are deleted within this many days after the account is deleted. Policy: /privacy section 8. */
export const AI_CHAT_DELETED_ACCOUNT_DAYS = 30;
/** Barnaby chats older than this are deleted even when the account is still open. */
export const AI_CHAT_MAX_AGE_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

export function aiChatMaxAgeCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - AI_CHAT_MAX_AGE_DAYS * DAY_MS);
}

/** Emails in `chatEmails` with no matching account (case-insensitive). */
export function findOrphanEmails(chatEmails: string[], accountEmails: string[]): string[] {
  const accounts = new Set(accountEmails.map((e) => e.trim().toLowerCase()));
  return chatEmails.filter((e) => !accounts.has(e.trim().toLowerCase()));
}

/**
 * Runs daily from the cron route. Deletes:
 * 1. Barnaby chats whose account no longer exists (daily run keeps this well inside the 30-day promise).
 * 2. Barnaby chats older than 12 months.
 */
export async function purgeExpiredAiChats(now: Date = new Date()) {
  const aged = await prisma.aiChatMessage.deleteMany({
    where: { createdAt: { lt: aiChatMaxAgeCutoff(now) } },
  });

  const chatUsers = await prisma.aiChatMessage.findMany({
    distinct: ["userEmail"],
    select: { userEmail: true },
  });
  const chatEmails = chatUsers.map((r) => r.userEmail);

  let orphanedDeleted = 0;
  const BATCH = 500;
  for (let i = 0; i < chatEmails.length; i += BATCH) {
    const batch = chatEmails.slice(i, i + BATCH);
    const accounts = await prisma.user.findMany({
      where: { email: { in: batch, mode: "insensitive" } },
      select: { email: true },
    });
    const orphans = findOrphanEmails(
      batch,
      accounts.map((a) => a.email),
    );
    if (orphans.length > 0) {
      const res = await prisma.aiChatMessage.deleteMany({
        where: { userEmail: { in: orphans } },
      });
      orphanedDeleted += res.count;
    }
  }

  return { agedDeleted: aged.count, orphanedDeleted };
}
