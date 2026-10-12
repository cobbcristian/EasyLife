import { getSession } from "@/lib/server/auth";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { ensureRecordsSeeded, listRegistrations } from "@/lib/server/records";
import { RegistrationsClient } from "./registrations-client";

export const dynamic = "force-dynamic";

export default async function PmRegistrationsPage() {
  const session = await getSession();
  try {
    await ensureRecordsSeeded();
  } catch (err) {
    console.error("[pm/registrations] ensureRecordsSeeded failed", err);
  }
  try {
    await ensureFourClubDemoContent("full", session?.communityId, session?.email);
  } catch (err) {
    console.error("[pm/registrations] four-club seed failed", err);
  }

  let registrations: Awaited<ReturnType<typeof listRegistrations>> = [];
  try {
    registrations = await listRegistrations(session?.communityId);
  } catch (err) {
    console.error("[pm/registrations] listRegistrations failed", err);
  }

  return <RegistrationsClient initial={registrations} />;
}
