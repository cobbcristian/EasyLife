import { NextResponse } from "next/server";
import {
  decodeCalendarFeedTokenParam,
  verifyCalendarFeedToken,
} from "@/lib/server/calendar-feed";
import { buildMemberCalendarAgenda } from "@/lib/server/member-calendar";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";
import {
  buildIcsCalendar,
  calendarItemsFromAgenda,
} from "@/lib/calendar-ics";

type Params = { params: Promise<{ token: string }> };

/**
 * Public ICS feed for Google / Apple / Outlook subscribe.
 * Token is base64url(JWT) so the path has no raw JWT dots.
 */
export async function GET(_request: Request, { params }: Params) {
  const encoded = (await params).token.replace(/\.ics$/i, "");
  const jwt = decodeCalendarFeedTokenParam(encoded);
  const payload = jwt ? await verifyCalendarFeedToken(jwt) : null;
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired calendar link" }, { status: 401 });
  }

  await ensureRecordsSeeded();
  const communityId = payload.communityId?.trim() || null;
  const community = communityId
    ? await prisma.community.findUnique({
        where: { id: communityId },
        select: { appDisplayName: true, name: true },
      })
    : null;
  const calendarName =
    community?.appDisplayName ?? community?.name ?? "Club Calendar";

  const agenda = await buildMemberCalendarAgenda({
    communityId,
    email: payload.email,
    name: payload.name,
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
      "Content-Disposition": `inline; filename="${safeFile}.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
