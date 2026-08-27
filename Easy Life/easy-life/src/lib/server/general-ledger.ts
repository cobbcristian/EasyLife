import { prisma } from "@/lib/server/prisma";
import { ensureRecordsSeeded } from "@/lib/server/records";

const DEFAULT_ACCOUNTS = [
  { code: "1000", name: "Cash", type: "asset" },
  { code: "1100", name: "Accounts Receivable — Members", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "3000", name: "Member Equity", type: "equity" },
  { code: "4000", name: "Membership Dues", type: "revenue" },
  { code: "4100", name: "Food & Beverage", type: "revenue" },
  { code: "4200", name: "Golf & Amenities", type: "revenue" },
  { code: "5000", name: "Operating Expenses", type: "expense" },
];

export async function ensureDefaultGlAccounts(communityId: string): Promise<void> {
  await ensureRecordsSeeded();
  for (const acct of DEFAULT_ACCOUNTS) {
    await prisma.glAccount.upsert({
      where: { communityId_code: { communityId, code: acct.code } },
      create: { communityId, ...acct },
      update: {},
    });
  }
}

export async function listGlAccounts(communityId: string) {
  await ensureDefaultGlAccounts(communityId);
  return prisma.glAccount.findMany({
    where: { communityId, active: true },
    orderBy: { code: "asc" },
  });
}

export async function createJournalEntry(input: {
  communityId: string;
  entryDate: string;
  memo: string;
  postedBy: string;
  lines: { accountId: string; debit: number; credit: number; memo?: string }[];
  sourceType?: string;
  sourceId?: string;
}) {
  await ensureRecordsSeeded();
  const totalDebit = input.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = input.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error("Journal entry must balance (debits = credits)");
  }

  const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
  const owned = await prisma.glAccount.findMany({
    where: { id: { in: accountIds }, communityId: input.communityId },
    select: { id: true },
  });
  if (owned.length !== accountIds.length) {
    throw new Error("Journal lines must use accounts from this club");
  }

  return prisma.glJournalEntry.create({
    data: {
      communityId: input.communityId,
      entryDate: input.entryDate,
      memo: input.memo,
      postedBy: input.postedBy,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      lines: {
        create: input.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          memo: l.memo ?? "",
        })),
      },
    },
    include: { lines: true },
  });
}

export async function listJournalEntries(communityId: string, limit = 50) {
  return prisma.glJournalEntry.findMany({
    where: { communityId },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Record member charge payment as GL entry. */
export async function postChargePaymentToGl(input: {
  communityId: string;
  amount: number;
  category: string;
  postedBy: string;
  chargeId: string;
}) {
  await ensureDefaultGlAccounts(input.communityId);
  const cash = await prisma.glAccount.findFirst({
    where: { communityId: input.communityId, code: "1000" },
  });
  const revenueCode =
    input.category === "dining"
      ? "4100"
      : input.category === "dues"
        ? "4000"
        : "4200";
  const revenue = await prisma.glAccount.findFirst({
    where: { communityId: input.communityId, code: revenueCode },
  });
  if (!cash || !revenue) return null;

  return createJournalEntry({
    communityId: input.communityId,
    entryDate: new Date().toISOString().slice(0, 10),
    memo: `Payment — ${input.category}`,
    postedBy: input.postedBy,
    sourceType: "member_charge",
    sourceId: input.chargeId,
    lines: [
      { accountId: cash.id, debit: input.amount, credit: 0 },
      { accountId: revenue.id, debit: 0, credit: input.amount },
    ],
  });
}
