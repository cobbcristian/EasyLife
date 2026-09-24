import { describe, expect, it } from "vitest";
import { planPosChitVoid, isChargeOwed } from "@/lib/pos-chit-void-policy";

describe("isChargeOwed", () => {
  it("returns true for due and overdue", () => {
    expect(isChargeOwed("due")).toBe(true);
    expect(isChargeOwed("overdue")).toBe(true);
  });
  it("returns false for paid, cancelled, null", () => {
    expect(isChargeOwed("paid")).toBe(false);
    expect(isChargeOwed("cancelled")).toBe(false);
    expect(isChargeOwed(null)).toBe(false);
    expect(isChargeOwed(undefined)).toBe(false);
  });
});

describe("planPosChitVoid", () => {
  it("voids an open chit with no charge cleanup", () => {
    expect(
      planPosChitVoid({
        chitStatus: "open",
        chargeId: null,
        chargeStatus: null,
      }),
    ).toEqual({ voidChit: true, cancelDueCharge: false });
  });

  it("voids a posted chit and cancels the due MemberCharge", () => {
    expect(
      planPosChitVoid({
        chitStatus: "posted",
        chargeId: "ch_1",
        chargeStatus: "due",
      }),
    ).toEqual({ voidChit: true, cancelDueCharge: true });
  });

  it("voids a posted chit and cancels an overdue MemberCharge", () => {
    expect(
      planPosChitVoid({
        chitStatus: "posted",
        chargeId: "ch_1",
        chargeStatus: "overdue",
      }),
    ).toEqual({ voidChit: true, cancelDueCharge: true });
  });

  it("REFUSES void of posted chit whose charge is already paid (requires refund)", () => {
    const result = planPosChitVoid({
      chitStatus: "posted",
      chargeId: "ch_1",
      chargeStatus: "paid",
    });
    expect(result.voidChit).toBe(false);
    expect(result.refusedReason).toBe("already_paid");
  });

  it("rejects void of paid chit (already settled)", () => {
    const result = planPosChitVoid({
      chitStatus: "paid",
      chargeId: "ch_1",
      chargeStatus: "paid",
    });
    expect(result.voidChit).toBe(false);
    expect(result.refusedReason).toBe("already_settled");
  });

  it("rejects void of already-void chit", () => {
    const result = planPosChitVoid({
      chitStatus: "void",
      chargeId: "ch_1",
      chargeStatus: "due",
    });
    expect(result.voidChit).toBe(false);
    expect(result.refusedReason).toBe("already_void");
  });

  it("voids open chit even if chargeId exists but charge is cancelled", () => {
    expect(
      planPosChitVoid({
        chitStatus: "open",
        chargeId: "ch_1",
        chargeStatus: "cancelled",
      }),
    ).toEqual({ voidChit: true, cancelDueCharge: false });
  });
});
