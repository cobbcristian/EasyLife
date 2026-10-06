"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MemberMvpBookings } from "@/components/member/member-mvp-bookings";
import { isBookableAmenityKind, type AmenityDTO, type BookingDTO } from "@/lib/member-dtos";
import { readScreen, writeScreen } from "@/lib/screen-cache";

type ReserveCache = {
  amenities: AmenityDTO[];
  bookings: BookingDTO[];
};

function mapBooking(row: BookingDTO): BookingDTO {
  return {
    id: row.id,
    amenity: row.amenity,
    amenityId: row.amenityId,
    unitNumber: row.unitNumber,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
  };
}

function mapAmenity(row: AmenityDTO): AmenityDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    fee: row.fee,
    schedule: row.schedule,
    hoursJson: row.hoursJson,
    kind: row.kind,
    unitCount: row.unitCount,
    holes: row.holes,
    surface: row.surface,
    ownership: row.ownership,
    partnerName: row.partnerName,
    playable: row.playable,
    unplayableReason: row.unplayableReason,
    unplayableUntil: row.unplayableUntil,
  };
}

/** Reserve paints the last list immediately, then refreshes from the server. */
export function MemberBookingsLive() {
  const searchParams = useSearchParams();
  const [amenities, setAmenities] = useState<AmenityDTO[]>([]);
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [bookingRes, amenityRes] = await Promise.all([
      fetch("/api/bookings"),
      fetch("/api/amenities"),
    ]);
    if (!bookingRes.ok || !amenityRes.ok) return;
    const bookingData = (await bookingRes.json()) as { bookings?: BookingDTO[] };
    const amenityData = (await amenityRes.json()) as { amenities?: AmenityDTO[] };
    const nextBookings = (bookingData.bookings ?? []).map(mapBooking);
    const nextAmenities = (amenityData.amenities ?? [])
      .filter((row) => isBookableAmenityKind(row.kind))
      .map(mapAmenity);
    setBookings(nextBookings);
    setAmenities(nextAmenities);
    setReady(true);
    writeScreen("member-reserve", {
      amenities: nextAmenities,
      bookings: nextBookings,
    } satisfies ReserveCache);
  }, []);

  useLayoutEffect(() => {
    const saved = readScreen<ReserveCache>("member-reserve");
    if (saved?.amenities?.length) {
      setAmenities(saved.amenities);
      setBookings(saved.bookings ?? []);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => {
      void load();
    };
    window.addEventListener("member:bookings-changed", onChange);
    return () => window.removeEventListener("member:bookings-changed", onChange);
  }, [load]);

  if (!ready) {
    return (
      <div className="px-4 py-16 text-center text-sm text-grey">Loading…</div>
    );
  }

  return (
    <MemberMvpBookings
      amenities={amenities}
      initialBookings={bookings}
      initialAmenityId={searchParams.get("amenity") ?? undefined}
    />
  );
}
