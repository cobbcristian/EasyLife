import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import {
  createProClinicSeries,
  type ClinicSport,
} from "@/lib/server/clinics";
import { ensureRecordsSeeded, logEvent, listCommunityEvents } from "@/lib/server/records";
import { providerShowsGroupClinics } from "@/lib/provider-nav";
import { prisma } from "@/lib/server/prisma";

const SPORTS: ClinicSport[] = ["tennis", "golf", "bocce", "pickleball"];

function formatClock(value: string) {
  const [h = "10", m = "00"] = value.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

async function clinicAllowedForSession(session: {
  email: string;
  name: string;
  communityId?: string | null;
}) {
  const email = session.email.toLowerCase();
  const communityId = session.communityId ?? null;
  const provider = communityId
    ? await prisma.provider.findFirst({
        where: {
          communityId,
          OR: [{ email }, { name: session.name }],
        },
        select: { listingKind: true, category: true, type: true },
      })
    : null;
  return providerShowsGroupClinics({
    email,
    listingKind: provider?.listingKind,
    category: provider?.category,
    type: provider?.type,
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await clinicAllowedForSession(session))) {
    return NextResponse.json({ error: "Not available for this provider" }, { status: 403 });
  }
  await ensureRecordsSeeded();
  const events = (await listCommunityEvents(session.communityId)).filter((e) =>
    /clinic/i.test(e.category),
  );
  const mine = events.filter(
    (e) => e.createdBy.toLowerCase() === session.name.toLowerCase(),
  );
  return NextResponse.json({
    clinics: mine.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      time: e.time,
      endTime: e.endTime,
      location: e.location,
      category: e.category,
      capacity: e.capacity,
      requirePayment: e.requirePayment,
      feeCents: e.feeCents,
      goingCount: e.rsvps.length,
      rsvps: e.rsvps.map((r) => ({ name: r.memberName, email: r.memberEmail })),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  if (!(await clinicAllowedForSession(session))) {
    return NextResponse.json({ error: "Not available for this provider" }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    sport?: string;
    location?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    capacity?: number | null;
    requirePayment?: boolean;
    memberFeeCents?: number;
    repeatWeeks?: number;
    invites?: Array<{ email: string; name: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.title?.trim() || !body.date || !body.startTime || !body.endTime) {
    return NextResponse.json(
      { error: "Title, date, and start/end time are required." },
      { status: 400 },
    );
  }

  const sportRaw = (body.sport ?? "tennis").toLowerCase();
  const sport = (SPORTS.includes(sportRaw as ClinicSport)
    ? sportRaw
    : "tennis") as ClinicSport;

  const invites = (body.invites ?? [])
    .map((i) => ({
      email: String(i.email ?? "")
        .trim()
        .toLowerCase(),
      name: String(i.name ?? "").trim() || String(i.email ?? "").trim(),
    }))
    .filter((i) => i.email.includes("@"));

  const memberFeeCents = Math.max(0, Math.floor(Number(body.memberFeeCents) || 0));
  const requirePayment = Boolean(body.requirePayment) && memberFeeCents > 0;
  const capacity =
    typeof body.capacity === "number" && body.capacity > 0
      ? Math.floor(body.capacity)
      : null;

  const events = await createProClinicSeries({
    communityId: session.communityId,
    createdByName: session.name,
    createdByEmail: session.email,
    title: body.title.trim(),
    description: body.description?.trim(),
    sport,
    location: body.location?.trim(),
    date: body.date.slice(0, 10),
    startTime: formatClock(body.startTime),
    endTime: formatClock(body.endTime),
    capacity,
    requirePayment,
    memberFeeCents,
    repeatWeeks: Math.max(0, Math.floor(Number(body.repeatWeeks) || 0)),
    invites,
  });

  await logEvent({
    communityId: session.communityId,
    userName: session.name,
    action: "Clinic invited",
    detail: `${body.title} · ${events.length} session(s) · ${invites.length} invite(s)`,
  });

  revalidatePath("/provider/clinics");
  revalidatePath("/member/calendar");
  revalidatePath("/member/notifications");

  return NextResponse.json({
    ok: true,
    clinics: events.map((e) => ({ id: e.id, title: e.title, date: e.date })),
  });
}
