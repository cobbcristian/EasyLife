import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { ensureRecordsSeeded, listNotificationFeed } from "@/lib/server/records";
import { NotificationsClient } from "./notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  if (!session) return null;

  const communityId = await resolveScopedCommunityId(session);
  const notifications = await listNotificationFeed(communityId);

  return <NotificationsClient notifications={notifications} />;
}
