/** Shared member DTO types (extracted from retired *-client.tsx pages). */

export interface BookingDTO {
  id: string;
  amenity: string;
  amenityId?: string | null;
  unitNumber?: number | null;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface AmenityDTO {
  id: string;
  name: string;
  description: string;
  fee: number;
  schedule: string;
  hoursJson?: string;
  kind: string;
  unitCount: number;
  holes: number | null;
  surface: string | null;
  ownership: string;
  partnerName: string | null;
  playable: boolean;
  unplayableReason: string | null;
  unplayableUntil: string | null;
}

export const BOOKABLE_AMENITY_KINDS = new Set([
  "court",
  "pickleball",
  "golf_course",
  "driving_range",
  "spa",
  "fitness_class",
  "restaurant",
  "clubhouse",
  // Reservable condo / plaza rooms (e.g. Plaza at Oceanside)
  "simulator",
  "theatre",
  "grill",
  // gym / generic facility / pool are walk-in — book classes, not the room
]);

export function isBookableAmenityKind(kind: string): boolean {
  return BOOKABLE_AMENITY_KINDS.has(kind);
}

export interface CalendarEventDTO {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string | null;
  endTime?: string | null;
  location: string;
  category: string;
  isPromoted: boolean;
  requirePayment?: boolean;
  feeCents?: number;
  rsvpCount: number;
  userRsvped: boolean;
  /** event | booking | service | dining | tournament */
  source?: "booking" | "event" | "service" | "dining" | "tournament";
  /** Club-wide activity vs personal agenda item */
  scope?: "club" | "you";
  bookingId?: string;
  href?: string;
}

export interface OrderDTO {
  id: string;
  items: string;
  total: number;
  fulfillment: string;
  status: string;
  createdAt: string;
  restaurant?: string | null;
  arriveDate?: string | null;
  arriveTime?: string | null;
  partySize?: number | null;
  tableLabel?: string | null;
  readyBy?: string | null;
}

export interface VehicleDTO {
  id: string;
  make: string;
  model: string;
  color: string;
  plate: string;
  year?: number | null;
  ownerName?: string;
  registrationUrl?: string | null;
  insuranceUrl?: string | null;
  govIdUrl?: string | null;
  verificationStatus?: string;
  verificationJson?: string;
  verifiedAt?: string | null;
}

export interface PetDTO {
  id: string;
  name: string;
  type: string;
  breed: string;
}
