import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  buildCalendarSubscribeLinks,
  createCalendarFeedToken,
  encodeCalendarFeedTokenParam,
} from "@/lib/server/calendar-feed";
import { buildMemberCalendarAgenda } from "@/lib/server/member-calendar";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";
import {
  buildIcsCalendar,
  calendarItemsFromAgenda,
} from "@/lib/calendar-ics";

function appOrigin(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

async function clubCalendarName(communityId: string) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { appDisplayName: true, name: true },
  });
  return community?.appDisplayName ?? community?.name ?? "Club Calendar";
}

/** Returns subscribe links for Google, Apple, Outlook + optional ICS body. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  await ensureRecordsSeeded();
  const calendarName = await clubCalendarName(session.communityId);
  const jwt = await createCalendarFeedToken({
    email: session.email,
    name: session.name,
    communityId: session.communityId,
  });
  const tokenParam = encodeCalendarFeedTokenParam(jwt);
  const httpsFeedUrl = `${appOrigin(request)}/api/calendar/feed/${tokenParam}.ics`;
  const links = buildCalendarSubscribeLinks(httpsFeedUrl);

  const wantDownload = new URL(request.url).searchParams.get("download") === "1";
  if (wantDownload) {
    const agenda = await buildMemberCalendarAgenda({
      communityId: session.communityId,
      email: session.email,
      name: session.name,
    });
    const ics = buildIcsCalendar({
      name: calendarName,
      items: calendarItemsFromAgenda(agenda),
    });
    const safeFile =
      calendarName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "club";
    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFile}-calendar.ics"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({
    ...links,
    instructions: {
      apple: `Opens Apple Calendar and adds this ${calendarName} feed as a subscribed calendar.`,
      google:
        "Opens Google Calendar. If prompted, confirm adding the calendar from URL. You can also paste the feed URL under Settings → Add calendar → From URL.",
      outlook:
        "Opens Outlook on the web to subscribe. For Outlook desktop, use Add calendar → From internet and paste the feed URL.",
    },
  });
}
