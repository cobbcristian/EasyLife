import { getSession } from "@/lib/server/auth";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { ensureRecordsSeeded, listCheckins } from "@/lib/server/records";
import { mergeApprovedBookingsIntoCheckins } from "@/lib/server/gate-arrivals";
import { FrontDeskClient } from "./front-desk-client";

export const dynamic = "force-dynamic";

export default async function PmFrontDeskPage() {
  const session = await getSession();
  try {
    await ensureRecordsSeeded();
  } catch (err) {
    console.error("[pm/front-desk] ensureRecordsSeeded failed", err);
  }
  try {
    await ensureFourClubDemoContent("full", session?.communityId, session?.email);
  } catch (err) {
    console.error("[pm/front-desk] four-club seed failed", err);
  }

  let rows: Awaited<ReturnType<typeof listCheckins>> = [];
  try {
    rows = await listCheckins(session?.communityId);
  } catch (err) {
    console.error("[pm/front-desk] listCheckins failed", err);
  }

  const initial = mergeApprovedBookingsIntoCheckins({
    communityId: session?.communityId,
    checkins: rows,
  }).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    host: c.host,
    unit: c.unit,
    time: c.time,
    status: c.status,
    photo: c.photo ?? undefined,
    service: c.service,
    fromBooking: c.fromBooking,
    admitWithoutCall: c.admitWithoutCall,
  }));

  return <FrontDeskClient initial={initial} />;
}
