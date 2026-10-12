import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  createCommunityEvent,
  ensureRecordsSeeded,
  listCommunityEvents,
  logEvent,
} from "@/lib/server/records";
import { createEventInvites } from "@/lib/server/project-management";
import { weeklyOccurrenceDates } from "@/lib/server/clinics";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  const category = new URL(request.url).searchParams.get("category") ?? undefined;
  const events = (await listCommunityEvents(session.communityId)).filter(
    (e) => !category || e.category === category,
  );
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      time: e.time,
      endTime: e.endTime,
      location: e.location,
      category: e.category,
      isPromoted: e.isPromoted,
      requirePayment: e.requirePayment,
      feeCents: e.feeCents,
      capacity: e.capacity,
      createdBy: e.createdBy,
      rsvpCount: e.rsvps.length,
      rsvps: e.rsvps.map((r) => ({ email: r.memberEmail, name: r.memberName })),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["admin", "board", "pm", "member"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    endTime?: string;
    location?: string;
    category?: string;
    isPromoted?: boolean;
    capacity?: number | null;
    requirePayment?: boolean;
    feeCents?: number;
    /** Extra weekly sessions after the first (0 = one-time). */
    repeatWeeks?: number;
    invites?: Array<{ email: string; name: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.title || !body.date) {
    return NextResponse.json({ error: "Title and date required" }, { status: 400 });
  }

  const dates = weeklyOccurrenceDates(
    body.date.slice(0, 10),
    Math.max(0, Math.floor(Number(body.repeatWeeks) || 0)),
  );
  const invites = body.invites ?? [];
  const created = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]!;
    const occurrenceNote =
      dates.length > 1 ? ` (week ${i + 1} of ${dates.length})` : "";
    const event = await createCommunityEvent({
      communityId: session.communityId,
      title: `${body.title.trim()}${occurrenceNote}`,
      description: body.description,
      date,
      time: body.time,
      endTime: body.endTime,
      location: body.location,
      category: body.category,
      isPromoted: body.isPromoted,
      capacity: body.capacity,
      requirePayment: body.requirePayment,
      feeCents: body.feeCents,
      createdBy: session.name,
    });
    created.push(event);

    if (invites.length) {
      await createEventInvites({
        eventId: event.id,
        invites,
      });
    }

    await prisma.eventRsvp.upsert({
      where: {
        eventId_memberEmail: {
          eventId: event.id,
          memberEmail: session.email.trim().toLowerCase(),
        },
      },
      create: {
        eventId: event.id,
        memberEmail: session.email.trim().toLowerCase(),
        memberName: session.name,
      },
      update: {},
    });
  }

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Event created",
    detail:
      dates.length > 1
        ? `${body.title} · ${dates.length} weekly sessions`
        : body.title,
  });
  revalidatePath("/member/calendar");
  revalidatePath("/member/notifications");
  const first = created[0];
  return NextResponse.json({
    ok: true,
    event: first,
    events: created.map((e) => ({ id: e.id, title: e.title, date: e.date })),
    redirectTo: first ? `/member/events/${first.id}?added=1` : "/member/calendar",
  });
}
