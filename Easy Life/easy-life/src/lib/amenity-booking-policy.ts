/**
 * Whether an amenity reservation needs staff approval vs auto-confirming
 * when the slot is free (createBooking already rejects conflicts).
 */

const MANAGEMENT_APPROVAL_NAME_RE =
  /\b(social\s*room|board\s*room|party\s*room|event\s*room|ballroom)\b/i;

/** Amenity names that stay `pending` until management accepts. */
export function amenityRequiresManagementApproval(amenityName: string): boolean {
  return MANAGEMENT_APPROVAL_NAME_RE.test(amenityName.trim());
}

/**
 * Initial booking status after a successful create.
 * - Management-approval rooms → pending (staff)
 * - Paid amenities (fee > 0) → pending until MemberCharge is settled
 * - Otherwise → confirmed when the slot is free
 */
export function initialBookingStatus(
  amenityName: string,
  feeUsd = 0,
): "confirmed" | "pending" {
  if (amenityRequiresManagementApproval(amenityName)) {
    return "pending";
  }
  if (Number(feeUsd) > 0) {
    return "pending";
  }
  return "confirmed";
}

/**
 * Status after an amenity booking fee charge is marked paid.
 * Management-approval rooms stay pending for staff; others confirm.
 */
export function bookingStatusAfterAmenityFeePaid(
  amenityName: string,
): "confirmed" | "pending" {
  return amenityRequiresManagementApproval(amenityName)
    ? "pending"
    : "confirmed";
}

export const AMENITY_BOOKING_CHARGE_REF = "amenity_booking" as const;
