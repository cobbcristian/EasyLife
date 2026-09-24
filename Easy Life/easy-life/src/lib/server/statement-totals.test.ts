import { describe, expect, it } from "vitest";
import { isChargeOwed } from "@/lib/pos-chit-void-policy";

/**
 * Tests that statement/balance calculations correctly exclude cancelled charges.
 * The actual buildMemberStatement uses: .filter((c) => c.status === "due" || c.status === "overdue")
 * which is equivalent to isChargeOwed(c.status).
 */

describe("statement totalDue logic", () => {
  function calcTotalDue(charges: Array<{ status: string; amount: number }>): number {
    return charges
      .filter((c) => isChargeOwed(c.status))
      .reduce((s, c) => s + c.amount, 0);
  }

  it("sums due and overdue charges", () => {
    const charges = [
      { status: "due", amount: 100 },
      { status: "overdue", amount: 50 },
    ];
    expect(calcTotalDue(charges)).toBe(150);
  });

  it("excludes paid charges from totalDue", () => {
    const charges = [
      { status: "due", amount: 100 },
      { status: "paid", amount: 200 },
    ];
    expect(calcTotalDue(charges)).toBe(100);
  });

  it("excludes cancelled charges from totalDue", () => {
    const charges = [
      { status: "due", amount: 100 },
      { status: "cancelled", amount: 75 },
      { status: "overdue", amount: 25 },
    ];
    expect(calcTotalDue(charges)).toBe(125);
  });

  it("returns zero when all charges are paid or cancelled", () => {
    const charges = [
      { status: "paid", amount: 100 },
      { status: "cancelled", amount: 50 },
    ];
    expect(calcTotalDue(charges)).toBe(0);
  });

  it("handles empty charge list", () => {
    expect(calcTotalDue([])).toBe(0);
  });
});
