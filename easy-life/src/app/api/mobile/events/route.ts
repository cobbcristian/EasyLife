import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/server/mobile-auth";
import {
  createCommunityEvent,
  ensureRecordsSeeded,
  listCommunityEvents,
  logEvent,
} from "@/lib/server/records";
import { createEventInvites } from "@/lib/server/project-management";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  await ensureRecordsSeeded();
  const events = await listCommunityEvents(session.communityId);
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      time: e.time,
      location: e.location,
      category: e.category,
      going: e.rsvps.some((r) => r.memberEmail === session.email),
      rsvpCount: e.rsvps.length,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session || !["admin", "board", "pm", "member"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }

  let body: {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    endTime?: string;
    location?: string;
    category?: string;
    invites?: Array<{ email: string; name: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.title?.trim() || !body.date) {
    return NextResponse.json({ error: "Title and date required" }, { status: 400 });
  }

  const event = await createCommunityEvent({
    communityId: session.communityId,
    title: body.title.trim(),
    description: body.description,
    date: body.date,
    time: body.time,
    endTime: body.endTime,
    location: body.location,
    category: body.category ?? "activity",
    createdBy: session.name,
  });

  if (body.invites?.length) {
    await createEventInvites({
      eventId: event.id,
      invites: body.invites,
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

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Event created",
    detail: body.title,
  });

  return NextResponse.json({
    ok: true,
    event: {
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
    },
  });
}
