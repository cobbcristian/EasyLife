import { getCommunityBookings } from "@/lib/communities-data";
import { easternDateOffset } from "@/lib/weather";
import type { ServiceBooking } from "@/lib/types";

export const SERVICE_BOOKING_CHECKIN_PREFIX = "booking:";
export const SERVICE_BOOKING_UNIT_PREFIX = "svc:";

export function serviceBookingCheckinId(bookingId: string): string {
  return `${SERVICE_BOOKING_CHECKIN_PREFIX}${bookingId}`;
}

export function serviceBookingUnit(bookingId: string): string {
  return `${SERVICE_BOOKING_UNIT_PREFIX}${bookingId}`;
}

export function parseServiceBookingIdFromCheckinId(id: string): string | null {
  if (!id.startsWith(SERVICE_BOOKING_CHECKIN_PREFIX)) return null;
  return id.slice(SERVICE_BOOKING_CHECKIN_PREFIX.length) || null;
}

export function isGateEligibleServiceBooking(booking: ServiceBooking): boolean {
  if (booking.status !== "accepted" && booking.status !== "upcoming") return false;
  // Court/activity rows are on-property amenities, not vendors needing gate admit.
  if (/^court\b/i.test(booking.service.trim())) return false;
  return true;
}

/** Approved provider visits for today — guard can admit without calling the member. */
export function listApprovedProviderVisitsForToday(
  communityId: string | null | undefined,
): ServiceBooking[] {
  if (!communityId) return [];
  const today = easternDateOffset(0);
  return getCommunityBookings(communityId).filter(
    (b) => isGateEligibleServiceBooking(b) && b.date === today,
  );
}

export type GateArrivalRow = {
  id: string;
  name: string;
  type: "guest" | "vendor";
  host: string;
  unit: string;
  time: string;
  status: "expected" | "checked_in" | "checked_out";
  photo: string | null;
  service?: string;
  fromBooking?: boolean;
  admitWithoutCall?: boolean;
};

export function mergeApprovedBookingsIntoCheckins(input: {
  communityId: string | null | undefined;
  checkins: Array<{
    id: string;
    name: string;
    type: string;
    host: string;
    unit: string;
    status: string;
    photoUrl?: string | null;
    createdAt: Date;
  }>;
}): GateArrivalRow[] {
  const base: GateArrivalRow[] = input.checkins.map((c) => ({
    id: c.id,
    name: c.name,
    type: (c.type === "vendor" ? "vendor" : "guest") as "guest" | "vendor",
    host: c.host,
    unit: c.unit,
    time: c.createdAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    status: (["expected", "checked_in", "checked_out"].includes(c.status)
      ? c.status
      : "checked_in") as GateArrivalRow["status"],
    photo: c.photoUrl ?? null,
    fromBooking: c.unit.startsWith(SERVICE_BOOKING_UNIT_PREFIX),
    admitWithoutCall: c.unit.startsWith(SERVICE_BOOKING_UNIT_PREFIX),
  }));

  const admittedBookingIds = new Set(
    base
      .filter(
        (c) =>
          c.unit.startsWith(SERVICE_BOOKING_UNIT_PREFIX) &&
          (c.status === "checked_in" || c.status === "checked_out"),
      )
      .map((c) => c.unit.slice(SERVICE_BOOKING_UNIT_PREFIX.length)),
  );

  // Also treat same-day vendor+host check-ins as covering that visit.
  const admittedVendorKeys = new Set(
    base
      .filter((c) => c.type === "vendor" && c.status !== "expected")
      .map((c) => `${c.name.toLowerCase()}|${c.host.toLowerCase()}`),
  );

  const expectedFromBookings: GateArrivalRow[] = listApprovedProviderVisitsForToday(
    input.communityId,
  )
    .filter((b) => !admittedBookingIds.has(b.id))
    .filter(
      (b) =>
        !admittedVendorKeys.has(
          `${b.provider.toLowerCase()}|${b.resident.toLowerCase()}`,
        ),
    )
    .filter(
      (b) =>
        !base.some(
          (c) =>
            c.id === serviceBookingCheckinId(b.id) ||
            c.unit === serviceBookingUnit(b.id),
        ),
    )
    .map((b) => ({
      id: serviceBookingCheckinId(b.id),
      name: b.provider,
      type: "vendor" as const,
      host: b.resident,
      unit: serviceBookingUnit(b.id),
      time: b.endTime ? `${b.time} – ${b.endTime}` : b.time,
      status: "expected" as const,
      photo: null,
      service: b.service,
      fromBooking: true,
      admitWithoutCall: true,
    }));

  return [...expectedFromBookings, ...base];
}
