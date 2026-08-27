/**
 * Fundraising donations must not inflate raisedAmount until a MemberCharge is paid.
 * Unauthenticated / unpaid POST must not count as money raised.
 */

export function fundraisingCountsTowardRaised(input: {
  chargeStatus: "due" | "paid" | null;
}): boolean {
  return input.chargeStatus === "paid";
}
