import { MemberMvpBookings } from "@/components/member/member-mvp-bookings";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listAmenities, listBookingsForMember } from "@/lib/server/records";
import { isBookableAmenityKind } from "@/lib/member-dtos";

export const dynamic = "force-dynamic";

export default async function MemberBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ amenity?: string }>;
}) {
  const session = await getSession();
  await ensureRecordsSeeded();
  const sp = await searchParams;
  const rows = session ? await listBookingsForMember(session.email) : [];
  const amenityRows = await listAmenities(session?.communityId);
  const bookings = rows.map((b) => ({
    id: b.id,
    amenity: b.amenity,
    amenityId: b.amenityId,
    unitNumber: b.unitNumber,
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
  }));
  const amenities = amenityRows
    .filter((a) => isBookableAmenityKind(a.kind))
    .map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      fee: a.fee,
      schedule: a.schedule,
      hoursJson: a.hoursJson,
      kind: a.kind,
      unitCount: a.unitCount,
      holes: a.holes,
      surface: a.surface,
      ownership: a.ownership,
      partnerName: a.partnerName,
      playable: a.playable,
      unplayableReason: a.unplayableReason,
      unplayableUntil: a.unplayableUntil,
    }));

  return (
    <MemberMvpBookings
      amenities={amenities}
      initialBookings={bookings}
      initialAmenityId={sp.amenity}
    />
  );
}
