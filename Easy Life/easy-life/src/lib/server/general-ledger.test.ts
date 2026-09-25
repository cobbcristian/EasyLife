import { describe, expect, it } from "vitest";
import { normalizeJournalLines } from "@/lib/server/general-ledger";

describe("normalizeJournalLines", () => {
  it("accepts a balanced entry", () => {
    const lines = normalizeJournalLines([
      { accountId: "cash", debit: 100, credit: 0 },
      { accountId: "rev", debit: 0, credit: 100 },
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.debit).toBe(100);
    expect(lines[1]!.credit).toBe(100);
  });

  it("rejects omitted debit/credit that used to bypass via NaN", () => {
    // Pre-fix: reduce(s + undefined) → NaN and Math.abs(NaN) > 0.01 is false.
    expect(() =>
      normalizeJournalLines([{ accountId: "cash", debit: 50000 } as { accountId: string; debit: number; credit: number }]),
    ).toThrow(/balance/i);
  });

  it("treats missing sides as zero and still requires balance", () => {
    expect(() =>
      normalizeJournalLines([
        { accountId: "cash", debit: 50 },
        { accountId: "rev" },
      ]),
    ).toThrow(/balance/i);
  });

  it("rejects negative amounts", () => {
    expect(() =>
      normalizeJournalLines([
        { accountId: "cash", debit: -10, credit: 0 },
        { accountId: "rev", debit: 0, credit: -10 },
      ]),
    ).toThrow(/non-negative/i);
  });

  it("rejects a line with both debit and credit", () => {
    expect(() =>
      normalizeJournalLines([{ accountId: "cash", debit: 10, credit: 10 }]),
    ).toThrow(/both debit and credit/i);
  });
});
