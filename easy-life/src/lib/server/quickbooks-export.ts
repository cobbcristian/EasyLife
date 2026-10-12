import { listGlAccounts, listJournalEntries } from "@/lib/server/general-ledger";
import { prisma } from "@/lib/server/prisma";

/** Export journal entries as QuickBooks IIF-compatible CSV. */
export async function exportQuickBooksCsv(communityId: string): Promise<string> {
  const [accounts, entries] = await Promise.all([
    listGlAccounts(communityId),
    listJournalEntries(communityId, 500),
  ]);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const lines: string[] = [
    "!TRNS,DATE,ACCNT,NAME,CLASS,AMOUNT,DOCNUM,MEMO",
    "!SPL,DATE,ACCNT,NAME,CLASS,AMOUNT,DOCNUM,MEMO",
    "!ENDTRNS",
  ];

  for (const entry of entries) {
    const firstLine = entry.lines[0];
    if (!firstLine) continue;
    const firstAcct = accountMap.get(firstLine.accountId);
    lines.push(
      `TRNS,${entry.entryDate},${firstAcct?.name ?? "General"},,,-${firstLine.debit || firstLine.credit},${entry.id.slice(0, 8)},${entry.memo}`,
    );
    for (const line of entry.lines) {
      const acct = accountMap.get(line.accountId);
      const amt = line.debit > 0 ? line.debit : -line.credit;
      lines.push(
        `SPL,${entry.entryDate},${acct?.name ?? "General"},,,${amt},${entry.id.slice(0, 8)},${line.memo || entry.memo}`,
      );
    }
    lines.push("ENDTRNS");
  }

  return lines.join("\r\n");
}

export async function getQuickBooksStatus(communityId: string) {
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  return {
    connected: Boolean(community?.quickbooksRealmId),
    realmId: community?.quickbooksRealmId ?? null,
    exportFormat: "IIF/CSV",
  };
}

export async function connectQuickBooksRealm(communityId: string, realmId: string) {
  await prisma.community.update({
    where: { id: communityId },
    data: { quickbooksRealmId: realmId },
  });
  return { connected: true, realmId };
}
