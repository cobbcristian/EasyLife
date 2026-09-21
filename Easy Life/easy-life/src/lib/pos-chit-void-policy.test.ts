import { describe, expect, it } from "vitest";
import { planPosChitVoid } from "@/lib/pos-chit-void-policy";

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

  it("does not cancel an already-paid charge when voiding", () => {
    expect(
      planPosChitVoid({
        chitStatus: "posted",
        chargeId: "ch_1",
        chargeStatus: "paid",
      }),
    ).toEqual({ voidChit: true, cancelDueCharge: false });
  });

  it("rejects void of paid or already-void chits", () => {
    expect(
      planPosChitVoid({
        chitStatus: "paid",
        chargeId: "ch_1",
        chargeStatus: "paid",
      }),
    ).toEqual({ voidChit: false, cancelDueCharge: false });
    expect(
      planPosChitVoid({
        chitStatus: "void",
        chargeId: "ch_1",
        chargeStatus: "due",
      }),
    ).toEqual({ voidChit: false, cancelDueCharge: false });
  });
});
