import { MemberMvpCalendar } from "@/components/member/member-mvp-calendar";
import { getSession } from "@/lib/server/auth";
import {
  ensureRecordsSeeded,
  listCalendarAds,
} from "@/lib/server/records";
import { autoRsvpPromotedEvents } from "@/lib/server/project-management";
import { buildMemberCalendarAgenda } from "@/lib/server/member-calendar";

export const dynamic = "force-dynamic";

export default async function MemberCalendarPage() {
  const session = await getSession();
  await ensureRecordsSeeded();

  if (session?.email) {
    try {
      await autoRsvpPromotedEvents({
        communityId: session.communityId,
        memberEmail: session.email,
        memberName: session.name,
      });
    } catch (err) {
      console.error("[member/calendar] auto-rsvp failed", err);
    }
  }

  const [ads, events] = await Promise.all([
    listCalendarAds(session?.communityId),
    session
      ? buildMemberCalendarAgenda({
          communityId: session.communityId,
          email: session.email,
          name: session.name,
        })
      : Promise.resolve([]),
  ]);

  return (
    <MemberMvpCalendar
      ads={ads.map((a) => ({
        id: a.id,
        title: a.title,
        sponsor: a.sponsor,
        linkUrl: a.linkUrl,
      }))}
      events={events}
    />
  );
}
