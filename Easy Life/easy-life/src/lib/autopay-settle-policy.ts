/**
 * Autopay must only mark MemberCharges paid when the stored-card charge
 * actually settled. `action_required` (e.g. 3DS) means no capture yet —
 * treating it as success would wipe dues without payment.
 */
export function shouldSettleAutopayCharges(
  result: { status: "paid" | "action_required" },
): boolean {
  return result.status === "paid";
}
