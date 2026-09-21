/**
 * When staff voids a POS chit that was already posted to the member account,
 * the linked due MemberCharge must be cancelled — otherwise the tab disappears
 * from POS while the member is still billed (and autopay may collect).
 */

export type PosChitVoidPlan = {
  voidChit: boolean;
  cancelDueCharge: boolean;
};

export function planPosChitVoid(input: {
  chitStatus: string | null | undefined;
  chargeId: string | null | undefined;
  chargeStatus: string | null | undefined;
}): PosChitVoidPlan {
  if (!input.chitStatus || input.chitStatus === "paid" || input.chitStatus === "void") {
    return { voidChit: false, cancelDueCharge: false };
  }
  return {
    voidChit: true,
    cancelDueCharge:
      Boolean(input.chargeId) &&
      (input.chitStatus === "posted" || input.chitStatus === "posting") &&
      input.chargeStatus === "due",
  };
}
