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
 * Free-slot amenities → confirmed; approval rooms → pending.
 */
export function initialBookingStatus(amenityName: string): "confirmed" | "pending" {
  return amenityRequiresManagementApproval(amenityName)
    ? "pending"
    : "confirmed";
}
