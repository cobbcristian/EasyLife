import { prisma } from "@/lib/server/prisma";
import { buildAllMatches } from "@/lib/server/tournament-scheduling";
import { notifyTournamentCourtAssignments } from "@/lib/server/tournament-notify";
import type { MatchSlot } from "@/lib/tournament-display";

const TOURNAMENT_HOLDER = "tournament@easylife.com";
const MATCH_MINUTES = 90;

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function parseSchedule(raw: string): Record<string, MatchSlot | string> {
  try {
    return JSON.parse(raw) as Record<string, MatchSlot | string>;
  } catch {
    return {};
  }
}

/** Reserve courts on the amenity calendar for each scheduled tournament match. */
export async function syncTournamentCourtBookings(tournamentId: string): Promise<number> {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament?.seedsJson) return 0;

  const seeds = JSON.parse(tournament.seedsJson) as string[];
  const winners = JSON.parse(tournament.winnersJson) as Record<string, string>;
  const schedule = parseSchedule(tournament.scheduleJson);
  const matches = buildAllMatches(tournamentId, seeds, winners);

  await prisma.booking.deleteMany({ where: { tournamentId } });

  let created = 0;
  for (const [matchId, slotVal] of Object.entries(schedule)) {
    if (typeof slotVal === "string") continue;
    const slot = slotVal;
    if (!slot.amenityId || !slot.time) continue;

    const match = matches.find((m) => m.id === matchId);
    if (!match?.p1 || !match.p2 || match.p1.startsWith("BYE") || match.p2.startsWith("BYE")) {
      continue;
    }

    const endTime = addMinutes(slot.time, MATCH_MINUTES);
    await prisma.booking.create({
      data: {
        communityId: tournament.communityId,
        amenityId: slot.amenityId,
        unitNumber: slot.unitNumber ?? 1,
        memberEmail: TOURNAMENT_HOLDER,
        memberName: `${tournament.title}: ${match.p1} vs ${match.p2}`,
        amenity: slot.amenityName ?? "Court",
        date: slot.date ?? tournament.date,
        startTime: slot.time,
        endTime,
        status: "confirmed",
        tournamentId,
        tournamentMatchId: matchId,
      },
    });
    created++;
  }

  await notifyTournamentCourtAssignments(tournamentId);

  return created;
}
