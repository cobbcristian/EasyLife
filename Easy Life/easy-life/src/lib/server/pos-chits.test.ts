import { describe, expect, it } from "vitest";

/**
 * Documents the POS void charge-reversal rule used by voidPosChit:
 * a posted chit with an open due charge must cancel that charge when voided.
 */
function shouldVoidLinkedCharge(input: {
  chitStatus: string;
  chargeStatus: string | null;
}): boolean {
  if (input.chitStatus === "paid") return false;
  if (!input.chargeStatus) return false;
  return (
    (input.chitStatus === "posted" || input.chitStatus === "open") &&
    input.chargeStatus === "due"
  );
}

describe("POS void linked-charge rule", () => {
  it("voids the due charge when a posted chit is voided", () => {
    expect(
      shouldVoidLinkedCharge({ chitStatus: "posted", chargeStatus: "due" }),
    ).toBe(true);
  });

  it("does not touch already-paid charges", () => {
    expect(
      shouldVoidLinkedCharge({ chitStatus: "posted", chargeStatus: "paid" }),
    ).toBe(false);
  });

  it("does not void paid chits", () => {
    expect(
      shouldVoidLinkedCharge({ chitStatus: "paid", chargeStatus: "due" }),
    ).toBe(false);
  });
});
