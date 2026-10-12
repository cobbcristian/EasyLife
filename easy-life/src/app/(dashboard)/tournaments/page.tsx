import { getSession } from "@/lib/server/auth";
import { resolveScopedCommunityId } from "@/lib/server/community-context";
import { ensureRecordsSeeded, listTournaments } from "@/lib/server/records";
import { parseScoresJson } from "@/lib/tournament-scores";
import { parseTiebreakersJson } from "@/lib/tournament-tiebreakers";
import { parseNoStartDefault } from "@/lib/tournament-no-start";
import { TournamentsClient } from "./tournaments-client";

export const dynamic = "force-dynamic";

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

export default async function TournamentsAdminPage() {
  const session = await getSession();
  await ensureRecordsSeeded();
  if (!session) return null;

  const communityId = await resolveScopedCommunityId(session);
  const rows = await listTournaments(communityId);
  return <TournamentsClient initial={rows.map(mapTournament)} />;
}
