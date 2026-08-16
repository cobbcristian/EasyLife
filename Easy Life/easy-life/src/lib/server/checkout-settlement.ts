/**
 * Decide how a completed Stripe Checkout session should settle a linked charge.
 * Clinic guest fees must RSVP the guest after payment — marking the charge paid alone
 * leaves them off the clinic roster.
 */

export type CheckoutSettlementKind = "hoa" | "clinic_guest" | "standard";

export function resolveCheckoutSettlementKind(input: {
  metadataType?: string | null;
  metadataKind?: string | null;
  referenceType?: string | null;
}): CheckoutSettlementKind {
  if (input.metadataType === "hoa") return "hoa";
  if (
    input.metadataKind === "clinic_guest_fee" ||
    input.referenceType === "clinic_guest_fee"
  ) {
    return "clinic_guest";
  }
  return "standard";
}
