import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { ensureRecordsSeeded, listAmenities } from "@/lib/server/records";
import { AmenitiesClient } from "./amenities-client";

export const dynamic = "force-dynamic";

export default async function AmenitiesAdminPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  if (!session) return null;

  const communityId = await resolveScopedCommunityId(session);
  const rows = await listAmenities(communityId);

  const initial = rows.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    fee: a.fee,
    schedule: a.schedule,
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
    <AmenitiesClient
      initial={initial}
    />
  );
}
