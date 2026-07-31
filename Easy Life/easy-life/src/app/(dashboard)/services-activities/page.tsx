import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { getCommunityById } from "@/lib/server/db";
import { ensureRecordsSeeded, listVendorDirectory } from "@/lib/server/records";
import type { Provider } from "@/lib/types";
import { ServicesActivitiesClient } from "./services-activities-client";

export const dynamic = "force-dynamic";

export default async function ServicesActivitiesPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  if (!session) return null;

  const communityId = await resolveScopedCommunityId(session);
  const communityName =
    (await getCommunityById(communityId))?.name ?? "Community";
  const rows = await listVendorDirectory(communityId);
  const withCommunity = rows.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    type: p.type as Provider["type"],
    rating: p.rating ?? undefined,
    status: (p.status as Provider["status"]) ?? "active",
    email: p.email ?? undefined,
    community: communityName,
    communityId,
  }));
  const services = withCommunity.filter((p) => p.type === "service");
  const activities = withCommunity.filter((p) => p.type === "activity");

  return <ServicesActivitiesClient services={services} activities={activities} />;
}
