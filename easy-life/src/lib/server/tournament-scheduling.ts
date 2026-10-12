import { prisma } from "@/lib/server/prisma";
import { countOverlappingBookings, timeRangesOverlap } from "@/lib/scheduling";
import type { MatchSlot } from "@/lib/tournament-display";
import { surfaceLabel } from "@/lib/court-surfaces";

export type { MatchSlot };
export type TournamentSchedule = Record<string, MatchSlot | string>;

const MATCH_MINUTES = 90;

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function parseSchedule(raw: string): TournamentSchedule {
  try {
    return JSON.parse(raw) as TournamentSchedule;
  } catch {
    return {};
  }
}

interface BracketMatch {
  id: string;
  p1: string | null;
  p2: string | null;
  round: number;
}

function validWinner(
  match: BracketMatch,
  winners: Record<string, string>,
): string | null {
  const w = winners[match.id];
  return w && (w === match.p1 || w === match.p2) ? w : null;
}

export function buildAllMatches(
  tournamentId: string,
  seeds: string[],
  winners: Record<string, string>,
): BracketMatch[] {
  const all: BracketMatch[] = [];
  let matches: BracketMatch[] = [];
  for (let i = 0; i < seeds.length; i += 2) {
    matches.push({
      id: `${tournamentId}-r0-m${i / 2}`,
      p1: seeds[i] ?? null,
      p2: seeds[i + 1] ?? null,
      round: 0,
    });
  }
  all.push(...matches);
  let round = 0;
  while (matches.length > 1) {
    const prev = matches;
    const next: BracketMatch[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push({
        id: `${tournamentId}-r${round + 1}-m${i / 2}`,
        p1: validWinner(prev[i], winners),
        p2: validWinner(prev[i + 1], winners),
        round: round + 1,
      });
    }
    all.push(...next);
    matches = next;
    round++;
  }
  return all;
}

interface CourtResource {
  amenityId: string;
  amenityName: string;
  unitNumber: number;
  courtLabel: string;
  surface: string | null;
}

async function loadCourtResources(
  communityId: string,
  sport: string,
  courtSurface?: string | null,
): Promise<CourtResource[]> {
  const kind = sport.toLowerCase() === "golf" ? "golf_course" : "court";
  const amenities = await prisma.amenity.findMany({
    where: {
      communityId,
      kind,
      ...(sport.toLowerCase() === "tennis" && courtSurface ? { surface: courtSurface } : {}),
    },
    orderBy: { name: "asc" },
  });
  const resources: CourtResource[] = [];
  for (const a of amenities) {
    const surfLabel = surfaceLabel(a.surface);
    for (let u = 1; u <= a.unitCount; u++) {
      resources.push({
        amenityId: a.id,
        amenityName: a.name,
        unitNumber: u,
        surface: a.surface,
        courtLabel:
          kind === "golf_course"
            ? u === 1 && a.holes
              ? `${a.name} (${a.holes} holes)`
              : `Tee ${u}`
            : surfLabel
              ? `Court ${u} · ${surfLabel}`
              : `Court ${u}`,
      });
    }
  }
  if (resources.length === 0) {
    resources.push({
      amenityId: "",
      amenityName: "Main Court",
      unitNumber: 1,
      surface: courtSurface ?? null,
      courtLabel: courtSurface ? `Court 1 · ${surfaceLabel(courtSurface)}` : "Court 1",
    });
  }
  return resources;
}

function playersInMatch(m: BracketMatch): string[] {
  return [m.p1, m.p2].filter((p): p is string => Boolean(p && !p.startsWith("BYE")));
}

function slotEnd(time: string): string {
  return addMinutes(time, MATCH_MINUTES);
}

function courtKey(r: CourtResource): string {
  return `${r.amenityId}:${r.unitNumber}`;
}

export async function scheduleTournamentMatches(input: {
  tournamentId: string;
  communityId: string;
  sport: string;
  courtSurface?: string | null;
  date: string;
  startTime: string;
  seeds: string[];
  winners: Record<string, string>;
  preserveExisting?: boolean;
  existingScheduleJson?: string;
}): Promise<TournamentSchedule> {
  const courts = await loadCourtResources(
    input.communityId,
    input.sport,
    input.courtSurface,
  );
  const existing = input.preserveExisting
    ? parseSchedule(input.existingScheduleJson ?? "{}")
    : {};

  const amenityIds = courts.map((c) => c.amenityId).filter(Boolean);
  const bookings =
    amenityIds.length > 0
      ? await prisma.booking.findMany({
          where: {
            communityId: input.communityId,
            date: input.date,
            status: { not: "cancelled" },
            OR: amenityIds.map((id) => ({ amenityId: id })),
          },
        })
      : [];

  const matches = buildAllMatches(input.tournamentId, input.seeds, input.winners);
  const schedule: TournamentSchedule = { ...existing };

  type Scheduled = { matchId: string; start: string; end: string; court: CourtResource; players: string[] };
  const scheduled: Scheduled[] = [];

  for (const existingEntry of Object.entries(schedule)) {
    const [matchId, val] = existingEntry;
    if (typeof val === "string") continue;
    const court = courts.find(
      (c) => c.amenityId === val.amenityId && c.unitNumber === val.unitNumber,
    );
    if (!court) continue;
    const m = matches.find((x) => x.id === matchId);
    scheduled.push({
      matchId,
      start: val.time,
      end: slotEnd(val.time),
      court,
      players: m ? playersInMatch(m) : [],
    });
  }

  let cursor = input.startTime;

  for (const round of [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)) {
    const roundMatches = matches.filter((m) => m.round === round);
    for (const m of roundMatches) {
      if (schedule[m.id] && input.preserveExisting) continue;
      if (!m.p1 || !m.p2 || m.p1.startsWith("BYE") || m.p2.startsWith("BYE")) continue;
      if (round > 0 && (!m.p1 || !m.p2)) continue;

      const matchPlayers = playersInMatch(m);
      let placed = false;

      for (let attempt = 0; attempt < 48 && !placed; attempt++) {
        const start = addMinutes(cursor, attempt * 15);
        const end = slotEnd(start);

        for (const court of courts) {
          const courtBusy = scheduled.some(
            (s) =>
              courtKey(s.court) === courtKey(court) &&
              timeRangesOverlap(start, end, s.start, s.end),
          );
          if (courtBusy) continue;

          const amenityBookings = bookings.filter(
            (b) => b.amenityId === court.amenityId && b.unitNumber === court.unitNumber,
          );
          if (countOverlappingBookings(amenityBookings, start, end) > 0) continue;

          const playerBusy = scheduled.some(
            (s) =>
              timeRangesOverlap(start, end, s.start, s.end) &&
              s.players.some((p) => matchPlayers.includes(p)),
          );
          if (playerBusy) continue;

          const slot: MatchSlot = {
            time: start,
            date: input.date,
            amenityId: court.amenityId || undefined,
            amenityName: court.amenityName,
            unitNumber: court.unitNumber,
            courtLabel: court.courtLabel,
            surface: court.surface ?? undefined,
          };
          schedule[m.id] = slot;
          scheduled.push({ matchId: m.id, start, end, court, players: matchPlayers });
          placed = true;
          break;
        }
      }
    }
    const roundEnd = scheduled
      .filter((s) => roundMatches.some((m) => m.id === s.matchId))
      .map((s) => s.end)
      .sort()
      .pop();
    if (roundEnd) cursor = roundEnd;
  }

  return schedule;
}
