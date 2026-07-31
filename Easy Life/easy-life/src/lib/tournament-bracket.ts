import {
  buildPlayerStandingStats,
  DEFAULT_TIEBREAKERS,
  parseTiebreakersJson,
  sortStandingsWithTiebreakers,
  tiebreakerLabel,
  type TiebreakerCriterion,
} from "@/lib/tournament-tiebreakers";
import { isTennisSport } from "@/lib/tournament-ratings";
import { deriveTennisWinners, type TournamentScoresData } from "@/lib/tournament-scores";

export interface BracketMatch {
  id: string;
  p1: string | null;
  p2: string | null;
}

export function validWinner(match: BracketMatch, winners: Record<string, string>): string | null {
  const w = winners[match.id];
  return w && (w === match.p1 || w === match.p2) ? w : null;
}

export function buildRounds(
  tid: string,
  seeds: string[],
  winners: Record<string, string>,
): BracketMatch[][] {
  const rounds: BracketMatch[][] = [];
  let matches: BracketMatch[] = [];
  for (let i = 0; i < seeds.length; i += 2) {
    matches.push({ id: `${tid}-r0-m${i / 2}`, p1: seeds[i] ?? null, p2: seeds[i + 1] ?? null });
  }
  rounds.push(matches);
  let round = 0;
  while (matches.length > 1) {
    const prev = matches;
    const next: BracketMatch[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push({
        id: `${tid}-r${round + 1}-m${i / 2}`,
        p1: validWinner(prev[i], winners),
        p2: validWinner(prev[i + 1], winners),
      });
    }
    rounds.push(next);
    matches = next;
    round++;
  }
  return rounds;
}

export function roundName(roundIdx: number, totalRounds: number, tr: (k: string) => string): string {
  const fromEnd = totalRounds - roundIdx;
  if (fromEnd === 1) return tr("Final");
  if (fromEnd === 2) return tr("Semifinals");
  if (fromEnd === 3) return tr("Quarterfinals");
  return `${tr("Round")} ${roundIdx + 1}`;
}

export function computeStandings(
  seeds: string[],
  winners: Record<string, string>,
  tid: string,
  opts?: {
    scores?: TournamentScoresData;
    tiebreakers?: TiebreakerCriterion[];
  },
): { name: string; wins: number; eliminated: boolean }[] {
  const rounds = buildRounds(tid, seeds, winners);
  const stats = buildPlayerStandingStats(seeds, winners, rounds, opts?.scores);
  const rows = [...stats.values()];
  const tiebreakers = opts?.tiebreakers ?? DEFAULT_TIEBREAKERS;
  return sortStandingsWithTiebreakers(rows, tiebreakers, rounds, winners);
}

export { parseTiebreakersJson, tiebreakerLabel, type TiebreakerCriterion };

export function bracketWinnersForTournament(tournament: {
  id: string;
  sport: string;
  seeds: string[] | null;
  winners: Record<string, string>;
  scoringFormat: string;
  scores: TournamentScoresData;
}): Record<string, string> {
  if (!tournament.seeds) return tournament.winners;
  if (isTennisSport(tournament.sport)) {
    return deriveTennisWinners(
      tournament.id,
      tournament.seeds,
      tournament.scoringFormat,
      tournament.scores,
      tournament.winners,
    );
  }
  return tournament.winners;
}
