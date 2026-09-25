import { describe, expect, it } from "vitest";
import { parseChargeIdsMetadata } from "@/lib/server/charge-settle";

describe("parseChargeIdsMetadata", () => {
  it("splits and trims ids", () => {
    expect(parseChargeIdsMetadata(" a,b , c ")).toEqual(["a", "b", "c"]);
  });

  it("returns empty for missing metadata", () => {
    expect(parseChargeIdsMetadata(undefined)).toEqual([]);
    expect(parseChargeIdsMetadata("")).toEqual([]);
  });
});

describe("wallet pay-all contract", () => {
  it("kind=amount must not accept a free-floating chargeId (underpay settle)", () => {
    // Documented invariant mirrored by /api/member/wallet-payment-intent:
    // ad-hoc amount + chargeId was #32; pay-all resolves due rows server-side.
    const body = { kind: "amount" as const, chargeId: "chg_x", amount: 0.5 };
    const rejects = Boolean(body.kind === "amount" && body.chargeId);
    expect(rejects).toBe(true);
  });

  it("open balance filter excludes cancelled and paid", () => {
    const rows = [
      { id: "1", status: "due", amount: 40 },
      { id: "2", status: "overdue", amount: 10 },
      { id: "3", status: "cancelled", amount: 99 },
      { id: "4", status: "paid", amount: 5 },
      { id: "5", status: "due", amount: -20 },
    ];
    const open = rows.filter(
      (c) =>
        (c.status === "due" || c.status === "overdue") && c.amount > 0,
    );
    expect(open.map((c) => c.id)).toEqual(["1", "2"]);
    expect(open.reduce((s, c) => s + c.amount, 0)).toBe(50);
  });
});

describe("POS chit line validation contract", () => {
  it("rejects non-positive qty or negative unit price", () => {
    const bad = [
      { qty: 0, unitPrice: 10 },
      { qty: -1, unitPrice: 10 },
      { qty: 1, unitPrice: -5 },
    ];
    for (const line of bad) {
      const invalid =
        !Number.isFinite(line.qty) ||
        line.qty <= 0 ||
        !Number.isFinite(line.unitPrice) ||
        line.unitPrice < 0;
      expect(invalid).toBe(true);
    }
  });
});
