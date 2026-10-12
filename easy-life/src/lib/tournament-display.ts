import type { BracketMatch } from "@/lib/tournament-bracket";
import { validWinner } from "@/lib/tournament-bracket";
import { isTennisSport } from "@/lib/tournament-ratings";

export interface MatchSlot {
  time: string;
  date: string;
  amenityId?: string;
  amenityName?: string;
  unitNumber?: number;
  courtLabel?: string;
  surface?: string;
}

export function parseMatchSlot(slot: MatchSlot | string | undefined): MatchSlot | null {
  if (!slot || typeof slot === "string") return null;
  return slot;
}

export function tennisCourtNumber(slot: MatchSlot): number | null {
  if (slot.unitNumber != null) return slot.unitNumber;
  const match = slot.courtLabel?.match(/Court\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function formatTennisCourt(slot: MatchSlot): string {
  const n = tennisCourtNumber(slot);
  if (n != null) return `Court ${n}`;
  return slot.courtLabel ?? "";
}

export function formatMatchSlot(slot: MatchSlot | string | undefined, sport?: string): string {
  if (!slot) return "";
  if (typeof slot === "string") return slot;
  if (sport && isTennisSport(sport)) {
    const court = formatTennisCourt(slot);
    const extra = slot.courtLabel?.includes("·")
      ? slot.courtLabel
          .split("·")
          .slice(1)
          .map((part) => part.trim())
          .filter(Boolean)
          .join(" · ")
      : "";
    return [court, extra, slot.time].filter(Boolean).join(" · ");
  }
  const court = slot.courtLabel ? ` · ${slot.courtLabel}` : "";
  return `${slot.time}${court}`;
}

export function formatTennisCourtSmsBody(input: {
  tournamentTitle: string;
  playerName: string;
  opponent: string;
  courtNumber: number;
  time: string;
  date: string;
}): string {
  return `Hi ${input.playerName}, your ${input.tournamentTitle} match is on Court ${input.courtNumber} at ${input.time} on ${input.date}. Opponent: ${input.opponent}.`;
}

export interface NextMatchInfo {
  matchId: string;
  opponent: string;
  courtNumber: number | null;
  courtLabel: string;
  time: string;
  date: string;
}

function slotSortKey(slot: MatchSlot | null): string {
  if (!slot) return "9999-99-99T99:99";
  return `${slot.date || "9999-99-99"}T${slot.time || "99:99"}`;
}

export function findNextMatchForPlayer(
  rounds: BracketMatch[][],
  winners: Record<string, string>,
  playerName: string,
  schedule: Record<string, MatchSlot | string>,
  sport: string,
): NextMatchInfo | null {
  const candidates = rounds
    .flat()
    .filter(
      (m) =>
        !validWinner(m, winners) &&
        (m.p1 === playerName || m.p2 === playerName) &&
        m.p1 &&
        m.p2 &&
        !m.p1.startsWith("BYE") &&
        !m.p2.startsWith("BYE"),
    )
    .sort((a, b) =>
      slotSortKey(parseMatchSlot(schedule[a.id])).localeCompare(
        slotSortKey(parseMatchSlot(schedule[b.id])),
      ),
    );

  const match = candidates[0];
  if (!match) return null;

  const slot = parseMatchSlot(schedule[match.id]);
  const opponent = match.p1 === playerName ? match.p2! : match.p1!;
  const courtNumber =
    slot && isTennisSport(sport) ? tennisCourtNumber(slot) : (slot?.unitNumber ?? null);
  const courtLabel = slot
    ? isTennisSport(sport)
      ? formatTennisCourt(slot)
      : (slot.courtLabel ?? "")
    : "";

  return {
    matchId: match.id,
    opponent,
    courtNumber,
    courtLabel,
    time: slot?.time ?? "",
    date: slot?.date ?? "",
  };
}
