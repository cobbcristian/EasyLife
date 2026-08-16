/**
 * Member service-booking rows identify the resident by display name (demo store).
 * Accept/deny must only succeed for the resident who owns the booking.
 */
export function canMemberActOnServiceBooking(input: {
  sessionName: string;
  bookingResident: string;
}): boolean {
  const sessionName = input.sessionName.trim().toLowerCase();
  const resident = input.bookingResident.trim().toLowerCase();
  if (!sessionName || !resident) return false;
  return sessionName === resident;
}
