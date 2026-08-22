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

/**
 * Client-supplied amenityId must resolve in the caller's club.
 * Rejecting unknown ids prevents forging a miss so createBooking skips
 * fee / membership / hours checks and books by free-form name only.
 */
export function unknownAmenityIdMustReject(
  amenityId: string | undefined | null,
  resolved: boolean,
): boolean {
  return Boolean(amenityId?.trim()) && !resolved;
}
