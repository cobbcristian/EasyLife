import type { BracketMatch } from "@/lib/tournament-bracket";
import {
  formatTennisSetsFromBoxes,
  matchScoreValue,
  type MatchScore,
  type TournamentScoresData,
} from "@/lib/tournament-scores";

export type TiebreakerCriterion = "head_to_head" | "set_percentage" | "game_percentage";

export const DEFAULT_TIEBREAKERS: TiebreakerCriterion[] = [
  "head_to_head",
  "set_percentage",
  "game_percentage",
];

export const TIEBREAKER_OPTIONS: TiebreakerCriterion[] = [
  "head_to_head",
  "set_percentage",
  "game_percentage",
];

export function tiebreakerLabel(criterion: TiebreakerCriterion): string {
  switch (criterion) {
    case "head_to_head":
      return "Head-to-head result";
    case "set_percentage":
      return "Set record / set percentage";
    case "game_percentage":
      return "Game record / game percentage";
  }
}

export function parseTiebreakersJson(json: string | null | undefined): TiebreakerCriterion[] {
  if (!json) return [...DEFAULT_TIEBREAKERS];
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [...DEFAULT_TIEBREAKERS];
    const valid = raw.filter(
      (v): v is TiebreakerCriterion =>
        v === "head_to_head" || v === "set_percentage" || v === "game_percentage",
    );
    return valid.length > 0 ? valid.slice(0, 3) : [...DEFAULT_TIEBREAKERS];
  } catch {
    return [...DEFAULT_TIEBREAKERS];
  }
}

export function serializeTiebreakers(criteria: TiebreakerCriterion[]): string {
  return JSON.stringify(criteria.slice(0, 3));
}

export interface PlayerStandingStats {
  name: string;
  wins: number;
  eliminated: boolean;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
}

export type StandingsRow = PlayerStandingStats;

function extractSetGameTotals(entry: MatchScore | undefined): {
  p1Sets: number;
  p2Sets: number;
  p1Games: number;
  p2Games: number;
} | null {
  const scoreStr = entry?.sets
    ? formatTennisSetsFromBoxes(entry.sets)
    : matchScoreValue(entry);
  if (!scoreStr.trim()) return null;

  let p1Sets = 0;
  let p2Sets = 0;
  let p1Games = 0;
  let p2Games = 0;

  const setMatches = scoreStr.match(/\d+\s*[-–]\s*\d+/g) ?? [];
  for (const set of setMatches) {
    const m = set.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (!m) continue;
    const g1 = Number(m[1]);
    const g2 = Number(m[2]);
    if (Number.isNaN(g1) || Number.isNaN(g2) || g1 === g2) continue;
    p1Games += g1;
    p2Games += g2;
    if (g1 > g2) p1Sets++;
    else p2Sets++;
  }

  if (p1Sets + p2Sets === 0) return null;
  return { p1Sets, p2Sets, p1Games, p2Games };
}

function addStats(
  stats: Map<string, PlayerStandingStats>,
  name: string,
  patch: Partial<PlayerStandingStats>,
) {
  const cur = stats.get(name) ?? {
    name,
    wins: 0,
    eliminated: false,
    setsWon: 0,
    setsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
  };
  stats.set(name, {
    ...cur,
    wins: patch.wins ?? cur.wins,
    eliminated: patch.eliminated ?? cur.eliminated,
    setsWon: patch.setsWon ?? cur.setsWon,
    setsLost: patch.setsLost ?? cur.setsLost,
    gamesWon: patch.gamesWon ?? cur.gamesWon,
    gamesLost: patch.gamesLost ?? cur.gamesLost,
  });
}

function headToHeadWins(
  player: string,
  opponents: string[],
  rounds: BracketMatch[][],
  winners: Record<string, string>,
): number {
  let wins = 0;
  for (const round of rounds) {
    for (const m of round) {
      const w = winners[m.id];
      if (!w) continue;
      const others = [m.p1, m.p2].filter(
        (p): p is string => !!p && !p.startsWith("BYE") && p !== player,
      );
      if (!others.some((p) => opponents.includes(p))) continue;
      if (w === player && (m.p1 === player || m.p2 === player)) wins++;
    }
  }
  return wins;
}

function compareByCriterion(
  a: PlayerStandingStats,
  b: PlayerStandingStats,
  criterion: TiebreakerCriterion,
  tiedGroup: PlayerStandingStats[],
  rounds: BracketMatch[][],
  winners: Record<string, string>,
): number {
  switch (criterion) {
    case "head_to_head": {
      const names = tiedGroup.map((p) => p.name);
      const aH2h = headToHeadWins(a.name, names, rounds, winners);
      const bH2h = headToHeadWins(b.name, names, rounds, winners);
      return bH2h - aH2h;
    }
    case "set_percentage": {
      const aPlayed = a.setsWon + a.setsLost;
      const bPlayed = b.setsWon + b.setsLost;
      const aPct = aPlayed > 0 ? a.setsWon / aPlayed : 0;
      const bPct = bPlayed > 0 ? b.setsWon / bPlayed : 0;
      return bPct - aPct || b.setsWon - a.setsWon;
    }
    case "game_percentage": {
      const aPlayed = a.gamesWon + a.gamesLost;
      const bPlayed = b.gamesWon + b.gamesLost;
      const aPct = aPlayed > 0 ? a.gamesWon / aPlayed : 0;
      const bPct = bPlayed > 0 ? b.gamesWon / bPlayed : 0;
      return bPct - aPct || b.gamesWon - a.gamesWon;
    }
  }
}

export function buildPlayerStandingStats(
  seeds: string[],
  winners: Record<string, string>,
  rounds: BracketMatch[][],
  scores?: TournamentScoresData,
): Map<string, PlayerStandingStats> {
  const stats = new Map<string, PlayerStandingStats>();
  for (const seed of seeds) {
    if (!seed.startsWith("BYE")) {
      stats.set(seed, {
        name: seed,
        wins: 0,
        eliminated: false,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
      });
    }
  }

  for (const round of rounds) {
    for (const m of round) {
      const w = winners[m.id];
      if (!w) continue;

      addStats(stats, w, { wins: (stats.get(w)?.wins ?? 0) + 1, eliminated: false });
      for (const p of [m.p1, m.p2]) {
        if (p && p !== w && !p.startsWith("BYE")) {
          addStats(stats, p, { wins: stats.get(p)?.wins ?? 0, eliminated: true });
        }
      }

      const entry = scores?.matches[m.id];
      const totals = extractSetGameTotals(entry);
      if (totals && m.p1 && m.p2 && !m.p1.startsWith("BYE") && !m.p2.startsWith("BYE")) {
        addStats(stats, m.p1, {
          setsWon: (stats.get(m.p1)?.setsWon ?? 0) + totals.p1Sets,
          setsLost: (stats.get(m.p1)?.setsLost ?? 0) + totals.p2Sets,
          gamesWon: (stats.get(m.p1)?.gamesWon ?? 0) + totals.p1Games,
          gamesLost: (stats.get(m.p1)?.gamesLost ?? 0) + totals.p2Games,
        });
        addStats(stats, m.p2, {
          setsWon: (stats.get(m.p2)?.setsWon ?? 0) + totals.p2Sets,
          setsLost: (stats.get(m.p2)?.setsLost ?? 0) + totals.p1Sets,
          gamesWon: (stats.get(m.p2)?.gamesWon ?? 0) + totals.p2Games,
          gamesLost: (stats.get(m.p2)?.gamesLost ?? 0) + totals.p1Games,
        });
      }
    }
  }

  return stats;
}

export function sortStandingsWithTiebreakers(
  rows: PlayerStandingStats[],
  tiebreakers: TiebreakerCriterion[],
  rounds: BracketMatch[][],
  winners: Record<string, string>,
): StandingsRow[] {
  const byWins = new Map<number, PlayerStandingStats[]>();
  for (const row of rows) {
    const group = byWins.get(row.wins) ?? [];
    group.push(row);
    byWins.set(row.wins, group);
  }

  const result: StandingsRow[] = [];
  const winCounts = [...byWins.keys()].sort((a, b) => b - a);
  for (const wins of winCounts) {
    const group = byWins.get(wins)!;
    const sortedGroup = [...group].sort((a, b) => {
      for (const criterion of tiebreakers) {
        const cmp = compareByCriterion(a, b, criterion, group, rounds, winners);
        if (cmp !== 0) return cmp;
      }
      return a.name.localeCompare(b.name);
    });
    result.push(...sortedGroup);
  }
  return result;
}
