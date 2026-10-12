import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { ensureRecordsSeeded } from "@/lib/server/records";
import { MembershipAccessError } from "@/lib/server/membership";
import {
  createLessonBooking,
  ensureLessonProsForCommunity,
  LessonConflictError,
  listClubPros,
  listMemberLessons,
  type LessonSport,
} from "@/lib/server/lessons";

function isLessonSport(value: string | null | undefined): value is LessonSport {
  return value === "tennis" || value === "golf" || value === "pickleball";
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  await ensureRecordsSeeded();

  const url = new URL(request.url);
  const sport = url.searchParams.get("sport");
  const communityId = session.communityId;
  await ensureLessonProsForCommunity(communityId);

  const [lessons, tennisPros, golfPros, pickleballPros] = await Promise.all([
    listMemberLessons(session.email),
    listClubPros(communityId, "tennis"),
    listClubPros(communityId, "golf"),
    listClubPros(communityId, "pickleball"),
  ]);

  return NextResponse.json({
    lessons,
    pros: {
      tennis: tennisPros,
      golf: golfPros,
      pickleball: pickleballPros,
      all: isLessonSport(sport)
        ? sport === "tennis"
          ? tennisPros
          : sport === "golf"
            ? golfPros
            : pickleballPros
        : [...tennisPros, ...golfPros, ...pickleballPros],
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.communityId) {
    return NextResponse.json({ error: "Community required" }, { status: 400 });
  }
  await ensureRecordsSeeded();
  await ensureLessonProsForCommunity(session.communityId);

  let body: {
    providerId?: string;
    sport?: LessonSport;
    date?: string;
    startTime?: string;
    durationMinutes?: number;
    onCourse?: boolean;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.providerId || !body.sport || !body.date || !body.startTime) {
    return NextResponse.json(
      { error: "providerId, sport, date, and startTime are required" },
      { status: 400 },
    );
  }
  if (!isLessonSport(body.sport)) {
    return NextResponse.json(
      { error: "sport must be tennis, golf, or pickleball" },
      { status: 400 },
    );
  }

  try {
    const result = await createLessonBooking({
      communityId: session.communityId,
      memberEmail: session.email,
      memberName: session.name,
      providerId: body.providerId,
      sport: body.sport,
      date: body.date,
      startTime: body.startTime,
      durationMinutes: body.durationMinutes,
      onCourse: body.onCourse,
      notes: body.notes,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof LessonConflictError || err instanceof MembershipAccessError) {
      return NextResponse.json(
        { error: err.message },
        { status: err instanceof MembershipAccessError ? 403 : 409 },
      );
    }
    throw err;
  }
}
