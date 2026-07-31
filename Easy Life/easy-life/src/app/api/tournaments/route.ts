import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import {
  createTournament,
  ensureRecordsSeeded,
  listTournaments,
  logEvent,
  resyncTournamentSchedule,
  updateTournament,
} from "@/lib/server/records";
import { prisma } from "@/lib/server/prisma";
import { parseBody, tournamentSchema } from "@/lib/server/validation";

import { parseScoresJson } from "@/lib/tournament-scores";
import { parseTiebreakersJson } from "@/lib/tournament-tiebreakers";
import { parseNoStartDefault } from "@/lib/tournament-no-start";

function mapTournament(t: Awaited<ReturnType<typeof listTournaments>>[number]) {
  return {
    id: t.id,
    title: t.title,
    sport: t.sport,
    courtSurface: t.courtSurface,
    date: t.date,
    startTime: t.startTime,
    format: t.format,
    scoringFormat: t.scoringFormat,
    eventType: t.eventType,
    entryFee: t.entryFee,
    participants: t.participants,
    seeds: t.seedsJson ? (JSON.parse(t.seedsJson) as string[]) : null,
    winners: JSON.parse(t.winnersJson) as Record<string, string>,
    schedule: JSON.parse(t.scheduleJson) as Record<string, string>,
    scores: parseScoresJson(t.scoresJson),
    tiebreakers: parseTiebreakersJson(t.tiebreakersJson),
    noStartDefault: parseNoStartDefault(t.noStartDefault),
    players: t.players.map((p) => ({
      id: p.id,
      name: p.name,
      memberEmail: p.memberEmail,
      ustaRating: p.ustaRating,
      utrRating: p.utrRating,
      handicap: p.handicap,
      partnerName: p.partnerName,
      partnerEmail: p.partnerEmail,
      paid: p.paid,
    })),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureRecordsSeeded();
  const communityId = await resolveScopedCommunityId(session);
  const tournaments = await listTournaments(
    session.role === "admin" ? communityId : session.communityId,
  );
  return NextResponse.json({ tournaments: tournaments.map(mapTournament) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = parseBody(tournamentSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const communityId = await resolveScopedCommunityId(session);
  const tournament = await createTournament({
    communityId,
    title: parsed.data.title,
    sport: parsed.data.sport,
    date: parsed.data.date,
    startTime: parsed.data.startTime,
    entryFee: parsed.data.entryFee,
    participants: parsed.data.participants ?? 8,
    scoringFormat: parsed.data.scoringFormat,
    eventType: parsed.data.eventType,
    courtSurface: parsed.data.courtSurface ?? null,
    tiebreakers: parsed.data.tiebreakers,
    noStartDefault: parsed.data.noStartDefault,
  });
  await logEvent({
    communityId,
    userName: session.name,
    action: "Tournament",
    detail: `Created: ${parsed.data.title}`,
  });
  revalidatePath("/tournaments");
  revalidatePath("/member/tournaments");
  return NextResponse.json({ ok: true, tournament: mapTournament(tournament) });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    id?: string;
    seeds?: string[] | null;
    winners?: Record<string, string>;
    schedule?: Record<string, string>;
    scores?: ReturnType<typeof parseScoresJson>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const data: {
    seedsJson?: string | null;
    winnersJson?: string;
    scheduleJson?: string;
    scoresJson?: string;
  } = {};
  if (body.seeds !== undefined) data.seedsJson = body.seeds ? JSON.stringify(body.seeds) : null;
  if (body.winners !== undefined) data.winnersJson = JSON.stringify(body.winners);
  if (body.schedule !== undefined) data.scheduleJson = JSON.stringify(body.schedule);
  if (body.scores !== undefined) data.scoresJson = JSON.stringify(body.scores);
  if (body.winners !== undefined) {
    const result = await resyncTournamentSchedule(body.id, body.winners);
    if (!result) {
      return NextResponse.json({ error: "Tournament not found or not seeded" }, { status: 404 });
    }
    if (body.scores !== undefined) {
      await updateTournament(body.id, { scoresJson: JSON.stringify(body.scores) });
    }
    await logEvent({
      communityId: session.communityId,
      userName: session.name,
      action: "Tournament scores updated",
      detail: `${body.id} — ${result.courtBookings} courts reserved`,
    });
    const fresh = await prisma.tournament.findUnique({
      where: { id: body.id },
      include: { players: { orderBy: { createdAt: "asc" } } },
    });
    revalidatePath("/tournaments");
    revalidatePath("/member/tournaments");
    return NextResponse.json({
      ok: true,
      courtBookings: result.courtBookings,
      tournament: fresh
        ? {
            ...fresh,
            winnersJson: fresh.winnersJson,
            scheduleJson: fresh.scheduleJson,
            scoresJson: fresh.scoresJson,
          }
        : result.updated,
    });
  }
  const updated = await updateTournament(body.id, data);
  revalidatePath("/tournaments");
  revalidatePath("/member/tournaments");
  return NextResponse.json({ ok: true, tournament: updated });
}
