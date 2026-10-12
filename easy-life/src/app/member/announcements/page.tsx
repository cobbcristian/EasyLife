import { MemberMvpAnnouncements } from "@/components/member/member-mvp-announcements";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded, listAnnouncements } from "@/lib/server/records";

export const dynamic = "force-dynamic";

export default async function MemberAnnouncementsPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  const announcements = await listAnnouncements(session?.communityId);

  return (
    <MemberMvpAnnouncements
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        author: a.author,
        priority: a.priority,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
