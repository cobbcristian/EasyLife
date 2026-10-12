import { getSession } from "@/lib/server/auth";
import { ensureFourClubDemoContent } from "@/lib/server/four-club-demo-content";
import { ensureRecordsSeeded, listMenuItems } from "@/lib/server/records";
import { diningProviderEmail } from "@/lib/server/dining";
import { PmDiningClient } from "./dining-client";

export const dynamic = "force-dynamic";

export default async function PmDiningPage() {
  const session = await getSession();
  try {
    await ensureRecordsSeeded();
  } catch (err) {
    console.error("[pm/dining] ensureRecordsSeeded failed", err);
  }
  try {
    await ensureFourClubDemoContent("full", session?.communityId, session?.email);
  } catch (err) {
    console.error("[pm/dining] four-club seed failed", err);
  }
  const rows = await listMenuItems(diningProviderEmail(session?.communityId));
  const initial = rows.map((m) => ({
    id: m.id,
    name: m.name,
    price: m.price,
    category: m.category,
    available: m.available,
  }));
  return <PmDiningClient initial={initial} />;
}
