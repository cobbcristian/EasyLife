import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import {
  addSharedCalendarEvent,
  listSharedCalendarEvents,
  listSharedCalendarsForMember,
  startSharedCalendar,
} from "@/lib/server/local-pros";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const calendarId = new URL(request.url).searchParams.get("calendarId");
  if (calendarId) {
    const calendars = await listSharedCalendarsForMember(session.email);
    const mine = calendars.find((c) => c.id === calendarId);
    if (!mine) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const events = await listSharedCalendarEvents(calendarId);
    return NextResponse.json({ calendar: mine, events });
  }

  const calendars = await listSharedCalendarsForMember(session.email);
  return NextResponse.json({ calendars });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    action?: "start" | "add_event";
    providerId?: string;
    calendarId?: string;
    title?: string;
    note?: string;
    startsAt?: string;
    endsAt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "add_event") {
    if (!body.calendarId || !body.title || !body.startsAt || !body.endsAt) {
      return NextResponse.json({ error: "Missing event fields" }, { status: 400 });
    }
    const calendars = await listSharedCalendarsForMember(session.email);
    if (!calendars.some((c) => c.id === body.calendarId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const event = await addSharedCalendarEvent({
      calendarId: body.calendarId,
      title: body.title,
      note: body.note,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      createdBy: session.email,
    });
    if (!event) {
      return NextResponse.json(
        { error: "Calendar is not active yet — pay the share fee first." },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: true, event });
  }

  if (!body.providerId) {
    return NextResponse.json({ error: "Provider required" }, { status: 400 });
  }

  const result = await startSharedCalendar({
    communityId: session.communityId ?? null,
    providerId: body.providerId,
    memberEmail: session.email,
    memberName: session.name,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...result });
}
