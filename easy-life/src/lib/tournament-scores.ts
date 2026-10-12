import { isGolfSport } from "@/lib/tournament-ratings";

export type TennisMatchStatus =
  | "none"
  | "complete"
  | "did_not_start"
  | "walkover"
  | "default"
  | "retirement"
  | "other"
  | "withdrawal";

export type LeaderboardPlayerStatus = "played" | "did_not_start";

export interface TennisSetScores {
  p1: string[];
  p2: string[];
}

export interface MatchScore {
  /** Full match score (tennis: "6-4, 4-6, 6-3") */
  score?: string;
  /** Per-player scores for head-to-head sports (pickleball, bocce) */
  p1?: string;
  p2?: string;
  /** Tennis set-by-set game counts */
  sets?: TennisSetScores;
  matchStatus?: TennisMatchStatus;
  statusDetail?: string;
  /** Who advances when matchStatus is not "none" */
  statusWinner?: "p1" | "p2";
}

export interface LeaderboardEntry {
  gross?: number;
  net?: number;
  status?: LeaderboardPlayerStatus;
}

export interface TournamentScoresData {
  matches: Record<string, MatchScore>;
  leaderboard: Record<string, LeaderboardEntry>;
}

export const EMPTY_SCORES: TournamentScoresData = { matches: {}, leaderboard: {} };

export function parseScoresJson(json: string | null | undefined): TournamentScoresData {
  if (!json) return { ...EMPTY_SCORES };
  try {
    const raw = JSON.parse(json) as Partial<TournamentScoresData>;
    return {
      matches: raw.matches ?? {},
      leaderboard: raw.leaderboard ?? {},
    };
  } catch {
    return { ...EMPTY_SCORES };
  }
}

export function serializeScores(data: TournamentScoresData): string {
  return JSON.stringify(data);
}

export function matchScorePlaceholder(sport: string, scoringFormat: string): string {
  if (isGolfSport(sport)) return "72";
  if (scoringFormat === "Best of 3") return "e.g. 6-4, 6-3";
  if (scoringFormat === "Fast4") return "e.g. 4-2, 4-1";
  return "e.g. 6-4, 6-3";
}

export function tennisSetsToWin(scoringFormat: string): number {
  if (scoringFormat === "Best of 5") return 3;
  return 2;
}

export function tennisMaxSets(scoringFormat: string): number {
  if (scoringFormat === "Best of 5") return 5;
  return 3;
}

export function emptyTennisSets(maxSets: number): TennisSetScores {
  return { p1: Array(maxSets).fill(""), p2: Array(maxSets).fill("") };
}

export function normalizeTennisSets(
  scores: MatchScore | undefined,
  scoringFormat: string,
): TennisSetScores {
  const maxSets = tennisMaxSets(scoringFormat);
  if (scores?.sets?.p1?.length) {
    const p1 = [...scores.sets.p1];
    const p2 = [...(scores.sets.p2 ?? [])];
    while (p1.length < maxSets) p1.push("");
    while (p2.length < maxSets) p2.push("");
    return { p1: p1.slice(0, maxSets), p2: p2.slice(0, maxSets) };
  }
  const raw = scores?.score?.trim();
  if (!raw) return emptyTennisSets(maxSets);
  const p1: string[] = Array(maxSets).fill("");
  const p2: string[] = Array(maxSets).fill("");
  const setMatches = raw.match(/\d+\s*[-–]\s*\d+/g) ?? [];
  setMatches.forEach((set, i) => {
    if (i >= maxSets) return;
    const m = set.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (m) {
      p1[i] = m[1];
      p2[i] = m[2];
    }
  });
  return { p1, p2 };
}

export function formatTennisSetsFromBoxes(sets: TennisSetScores): string {
  const parts: string[] = [];
  for (let i = 0; i < sets.p1.length; i++) {
    const a = sets.p1[i]?.trim();
    const b = sets.p2[i]?.trim();
    if (!a && !b) continue;
    if (a && b) parts.push(`${a}-${b}`);
  }
  return parts.join(", ");
}

function isTennisSetComplete(p1: string | undefined, p2: string | undefined): boolean {
  const a = Number(p1);
  const b = Number(p2);
  if (!p1?.trim() || !p2?.trim() || Number.isNaN(a) || Number.isNaN(b) || a === b) {
    return false;
  }
  return true;
}

function tennisSetWinsThrough(sets: TennisSetScores, throughIndex: number): { p1: number; p2: number } {
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i <= throughIndex && i < sets.p1.length; i++) {
    if (!isTennisSetComplete(sets.p1[i], sets.p2[i])) continue;
    const a = Number(sets.p1[i]);
    const b = Number(sets.p2[i]);
    if (a > b) p1++;
    else p2++;
  }
  return { p1, p2 };
}

/** How many set score columns to show (best-of-3: 2 until split 1–1, then 3). */
export function visibleTennisSetColumns(
  sets: TennisSetScores,
  scoringFormat: string,
): number {
  const maxSets = tennisMaxSets(scoringFormat);
  const needed = tennisSetsToWin(scoringFormat);

  if (maxSets === 3) {
    const set0 = isTennisSetComplete(sets.p1[0], sets.p2[0]);
    const set1 = isTennisSetComplete(sets.p1[1], sets.p2[1]);
    if (set0 && set1) {
      const w = tennisSetWinsThrough(sets, 1);
      if (w.p1 === 1 && w.p2 === 1) return 3;
      if (w.p1 >= needed || w.p2 >= needed) return 2;
    }
    return 2;
  }

  let visible = 2;
  for (let i = 0; i < maxSets; i++) {
    if (sets.p1[i]?.trim() || sets.p2[i]?.trim()) visible = Math.max(visible, i + 1);
    if (!isTennisSetComplete(sets.p1[i], sets.p2[i])) continue;
    const w = tennisSetWinsThrough(sets, i);
    if (w.p1 >= needed || w.p2 >= needed) return Math.max(2, i + 1);
    if (i >= 2 && w.p1 === w.p2 && w.p1 > 0) visible = Math.min(maxSets, i + 2);
  }
  return Math.min(maxSets, Math.max(2, visible));
}

export function tennisMatchStatusLabel(status: TennisMatchStatus): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "did_not_start":
      return "Did not start";
    case "walkover":
      return "Walkovers";
    case "default":
      return "Default (no-show)";
    case "retirement":
      return "Retirements";
    case "withdrawal":
      return "Withdrawals";
    case "other":
      return "Other";
    default:
      return "None";
  }
}

export function matchScoreValue(scores: MatchScore | undefined): string {
  if (!scores) return "";
  if (scores.sets) {
    const formatted = formatTennisSetsFromBoxes(scores.sets);
    if (formatted) return formatted;
  }
  if (scores.score?.trim()) return scores.score;
  if (scores.p1?.trim() && !scores.p2?.trim()) return scores.p1;
  return "";
}

export function resolveTennisMatchWinner(
  match: { p1: string | null; p2: string | null },
  entry: MatchScore | undefined,
  scoringFormat: string,
): { winner: string | null; complete: boolean } {
  if (!match.p1 || !match.p2 || match.p1.startsWith("BYE") || match.p2.startsWith("BYE")) {
    return { winner: null, complete: false };
  }
  const status = entry?.matchStatus ?? "none";
  if (status !== "none" && entry?.statusWinner) {
    const winner = entry.statusWinner === "p1" ? match.p1 : match.p2;
    return { winner, complete: true };
  }
  const scoreStr = matchScoreValue(entry);
  if (!scoreStr) return { winner: null, complete: false };
  const parsed = parseTennisMatchScore(scoreStr, scoringFormat);
  if (!parsed.complete) return { winner: null, complete: false };
  const winner =
    parsed.winnerSide === "p1" ? match.p1 : parsed.winnerSide === "p2" ? match.p2 : null;
  return { winner, complete: true };
}

/** Winner side implied by entered set scores, if the match is decided. */
export function tennisScoreWinnerSide(
  scoreText: string,
  scoringFormat: string,
): "p1" | "p2" | null {
  if (!scoreText.trim()) return null;
  const parsed = parseTennisMatchScore(scoreText, scoringFormat);
  return parsed.complete ? parsed.winnerSide : null;
}

/** Whether the UI should ask for a manual winner pick (walkover, retirement, etc.). */
export function tennisMatchNeedsWinnerPick(
  matchStatus: TennisMatchStatus,
  scoreText: string,
  scoringFormat: string,
  autoStatusWinner: "p1" | "p2" | null | undefined,
): boolean {
  if (matchStatus === "none" || matchStatus === "complete") return false;
  if (autoStatusWinner) return false;
  if (tennisScoreWinnerSide(scoreText, scoringFormat)) return false;
  return true;
}

export function parseTennisMatchScore(
  raw: string,
  scoringFormat: string,
): { winnerSide: "p1" | "p2" | null; complete: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { winnerSide: null, complete: false };

  const needed = tennisSetsToWin(scoringFormat);
  let p1Sets = 0;
  let p2Sets = 0;

  const setMatches = trimmed.match(/\d+\s*[-–]\s*\d+/g) ?? [];
  for (const set of setMatches) {
    const m = set.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (!m) continue;
    const g1 = Number(m[1]);
    const g2 = Number(m[2]);
    if (Number.isNaN(g1) || Number.isNaN(g2) || g1 === g2) continue;
    if (g1 > g2) p1Sets++;
    else p2Sets++;
  }

  if (p1Sets >= needed) return { winnerSide: "p1", complete: true };
  if (p2Sets >= needed) return { winnerSide: "p2", complete: true };
  return { winnerSide: null, complete: false };
}

export function deriveTennisWinners(
  tournamentId: string,
  seeds: string[],
  scoringFormat: string,
  scores: TournamentScoresData,
  existingWinners: Record<string, string> = {},
): Record<string, string> {
  const winners: Record<string, string> = { ...existingWinners };
  let rounds = buildTennisRounds(tournamentId, seeds, winners);

  for (let ri = 0; ri < rounds.length; ri++) {
    for (const m of rounds[ri]) {
      if (!m.p1 || !m.p2 || m.p1.startsWith("BYE") || m.p2.startsWith("BYE")) continue;
      const entry = scores.matches[m.id];
      const resolved = resolveTennisMatchWinner(m, entry, scoringFormat);
      if (resolved.complete && resolved.winner) winners[m.id] = resolved.winner;
    }
    rounds = buildTennisRounds(tournamentId, seeds, winners);
  }

  return winners;
}

interface BracketMatchRef {
  id: string;
  p1: string | null;
  p2: string | null;
}

function validBracketWinner(match: BracketMatchRef, winners: Record<string, string>): string | null {
  const w = winners[match.id];
  return w && (w === match.p1 || w === match.p2) ? w : null;
}

function buildTennisRounds(
  tid: string,
  seeds: string[],
  winners: Record<string, string>,
): BracketMatchRef[][] {
  const rounds: BracketMatchRef[][] = [];
  let matches: BracketMatchRef[] = [];
  for (let i = 0; i < seeds.length; i += 2) {
    matches.push({ id: `${tid}-r0-m${i / 2}`, p1: seeds[i] ?? null, p2: seeds[i + 1] ?? null });
  }
  rounds.push(matches);
  let round = 0;
  while (matches.length > 1) {
    const prev = matches;
    const next: BracketMatchRef[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      next.push({
        id: `${tid}-r${round + 1}-m${i / 2}`,
        p1: validBracketWinner(prev[i], winners),
        p2: validBracketWinner(prev[i + 1], winners),
      });
    }
    rounds.push(next);
    matches = next;
    round++;
  }
  return rounds;
}

export function formatLeaderboardScore(
  sport: string,
  entry: LeaderboardEntry | undefined,
): string {
  if (!entry) return "—";
  if (entry.status === "did_not_start") return "Did not start";
  if (entry.gross == null) return "—";
  if (isGolfSport(sport) && entry.net != null) {
    return `${entry.gross} (${entry.net} net)`;
  }
  return String(entry.gross);
}

export function sortGolfLeaderboard(
  players: { id: string; name: string; handicap: number | null }[],
  leaderboard: Record<string, LeaderboardEntry>,
): { id: string; name: string; entry: LeaderboardEntry | undefined }[] {
  return players
    .map((p) => ({ id: p.id, name: p.name, entry: leaderboard[p.id] }))
    .sort((a, b) => {
      const aDns = a.entry?.status === "did_not_start";
      const bDns = b.entry?.status === "did_not_start";
      if (aDns && !bDns) return 1;
      if (!aDns && bDns) return -1;
      const ga = a.entry?.gross;
      const gb = b.entry?.gross;
      if (ga == null && gb == null) return a.name.localeCompare(b.name);
      if (ga == null) return 1;
      if (gb == null) return -1;
      return ga - gb;
    });
}
