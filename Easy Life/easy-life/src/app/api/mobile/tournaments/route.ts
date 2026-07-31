import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/server/auth";
import { ensureRecordsSeeded, listTournaments } from "@/lib/server/records";
import { bracketWinnersForTournament, buildRounds } from "@/lib/tournament-bracket";
import { findNextMatchForPlayer, type MatchSlot } from "@/lib/tournament-display";
import { parseScoresJson } from "@/lib/tournament-scores";

function bearer(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : undefined;
}

function playerDisplayName(
  player: { name: string; partnerName: string | null },
  eventType: string,
): string {
  if (eventType !== "Singles" && player.partnerName) {
    return `${player.name} / ${player.partnerName}`;
  }
  return player.name;
}

export async function GET(request: Request) {
  const session = await verifySessionToken(bearer(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureRecordsSeeded();
  const tournaments = await listTournaments(session.communityId);

  return NextResponse.json({
    tournaments: tournaments.map((t) => {
      const seeds = t.seedsJson ? (JSON.parse(t.seedsJson) as string[]) : null;
      const winners = JSON.parse(t.winnersJson) as Record<string, string>;
      const schedule = JSON.parse(t.scheduleJson) as Record<string, MatchSlot | string>;
      const scores = parseScoresJson(t.scoresJson);

      const myPlayer = t.players.find(
        (p) => p.memberEmail?.toLowerCase() === session.email.toLowerCase(),
      );

      let myNextMatch = null;
      if (seeds && myPlayer) {
        const tournament = {
          id: t.id,
          title: t.title,
          sport: t.sport,
          scoringFormat: t.scoringFormat,
          seeds,
          winners,
          scores,
        };
        const derived = bracketWinnersForTournament(tournament);
        const rounds = buildRounds(t.id, seeds, derived);
        const playerName = playerDisplayName(myPlayer, t.eventType);
        const next = findNextMatchForPlayer(rounds, derived, playerName, schedule, t.sport);
        if (next) {
          myNextMatch = {
            opponent: next.opponent,
            courtNumber: next.courtNumber,
            courtLabel: next.courtLabel,
            time: next.time,
            date: next.date || t.date,
            matchId: next.matchId,
          };
        }
      }

      return {
        id: t.id,
        title: t.title,
        sport: t.sport,
        date: t.date,
        startTime: t.startTime,
        seeds,
        winners,
        schedule,
        scores,
        myNextMatch,
      };
    }),
  });
}
