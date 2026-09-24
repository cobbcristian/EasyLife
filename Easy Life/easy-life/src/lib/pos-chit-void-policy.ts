/**
 * When staff voids a POS chit that was already posted to the member account,
 * the linked due MemberCharge must be cancelled — otherwise the tab disappears
 * from POS while the member is still billed (and autopay may collect).
 *
 * Voiding a chit whose charge is already paid is REFUSED — the member has
 * already paid, so staff must issue a refund through the proper refund flow
 * rather than silently voiding the chit while the payment stands.
 */

export type MemberChargeStatus = "due" | "overdue" | "paid" | "cancelled";

export function isChargeOwed(status: string | null | undefined): boolean {
  return status === "due" || status === "overdue";
}

export type PosChitVoidPlan = {
  voidChit: boolean;
  cancelDueCharge: boolean;
  refusedReason?: "already_paid" | "already_void" | "already_settled";
};

export function planPosChitVoid(input: {
  chitStatus: string | null | undefined;
  chargeId: string | null | undefined;
  chargeStatus: string | null | undefined;
}): PosChitVoidPlan {
  if (!input.chitStatus || input.chitStatus === "void") {
    return { voidChit: false, cancelDueCharge: false, refusedReason: "already_void" };
  }
  if (input.chitStatus === "paid") {
    return { voidChit: false, cancelDueCharge: false, refusedReason: "already_settled" };
  }

  const isPosted = input.chitStatus === "posted" || input.chitStatus === "posting";
  const hasCharge = Boolean(input.chargeId);

  if (isPosted && hasCharge && input.chargeStatus === "paid") {
    return { voidChit: false, cancelDueCharge: false, refusedReason: "already_paid" };
  }

  return {
    voidChit: true,
    cancelDueCharge: isPosted && hasCharge && isChargeOwed(input.chargeStatus),
  };
}
