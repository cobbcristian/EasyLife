import type { ServiceBooking } from "@/lib/types";

/**
 * Providers may only mutate bookings assigned to their business name.
 * Prefer `updateCommunityBookingStatusForProvider` so ownership is checked
 * before any in-place status write.
 */
export function providerOwnsBooking(
  booking: ServiceBooking | null | undefined,
  providerName: string,
): booking is ServiceBooking {
  if (!booking) return false;
  return booking.provider === providerName;
}

/** Server-side service amount — never trust client-supplied amounts. */
export function amountForProviderServices(services: string[]): number {
  return services.reduce((sum, name) => {
    if (name.includes("Full House")) return sum + 250;
    if (name.includes("Carpet")) return sum + 150;
    if (/court/i.test(name)) return sum + 0;
    return sum + 100;
  }, 0);
}
