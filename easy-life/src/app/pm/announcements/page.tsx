import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listAnnouncements } from "@/lib/server/records";
import { AnnouncementsClient } from "@/app/board/announcements/announcements-client";

export const dynamic = "force-dynamic";

export default async function PmAnnouncementsPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  const rows = await listAnnouncements(session?.communityId);
  const initial = rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    author: a.author,
    priority: a.priority,
    createdAt: a.createdAt.toISOString().slice(0, 10),
  }));
  return <AnnouncementsClient initial={initial} />;
}
