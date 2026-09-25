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

/** Normalize + validate journal lines. Exported for unit tests. */
export function normalizeJournalLines(
  lines: { accountId: string; debit?: number; credit?: number; memo?: string }[],
): { accountId: string; debit: number; credit: number; memo: string }[] {
  if (!lines.length) {
    throw new Error("Journal entry requires at least one line");
  }
  const normalized = lines.map((l) => {
    const debit = Number(l.debit ?? 0);
    const credit = Number(l.credit ?? 0);
    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) {
      throw new Error("Journal line debit/credit must be finite and non-negative");
    }
    if (debit > 0 && credit > 0) {
      throw new Error("Journal line cannot have both debit and credit");
    }
    return { accountId: l.accountId, debit, credit, memo: l.memo ?? "" };
  });
  const totalDebit = normalized.reduce((s, l) => s + l.debit, 0);
  const totalCredit = normalized.reduce((s, l) => s + l.credit, 0);
  // NaN must not pass: Math.abs(NaN) > 0.01 is false and would store unbalanced books.
  if (
    !Number.isFinite(totalDebit) ||
    !Number.isFinite(totalCredit) ||
    Math.abs(totalDebit - totalCredit) > 0.01
  ) {
    throw new Error("Journal entry must balance (debits = credits)");
  }
  return normalized;
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
  const normalized = normalizeJournalLines(input.lines);

  return prisma.glJournalEntry.create({
    data: {
      communityId: input.communityId,
      entryDate: input.entryDate,
      memo: input.memo,
      postedBy: input.postedBy,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      lines: {
        create: normalized.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          memo: l.memo,
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
