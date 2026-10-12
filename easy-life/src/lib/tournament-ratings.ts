export interface TournamentPlayerRatings {
  name: string;
  ustaRating?: string | null;
  utrRating?: number | null;
  handicap?: number | null;
}

export function isTennisSport(sport: string): boolean {
  return sport.toLowerCase() === "tennis";
}

export function isGolfSport(sport: string): boolean {
  return sport.toLowerCase() === "golf";
}

export function playerRatingLabel(sport: string, player: TournamentPlayerRatings): string {
  if (isTennisSport(sport)) {
    const parts: string[] = [];
    if (player.utrRating != null) parts.push(`UTR ${player.utrRating}`);
    if (player.ustaRating) parts.push(`USTA ${player.ustaRating}`);
    return parts.join(" · ");
  }
  if (isGolfSport(sport) && player.handicap != null) {
    return `Handicap ${player.handicap}`;
  }
  return "";
}

export function bracketSeedingLabel(sport: string): string {
  if (isTennisSport(sport)) return "UTR seeding";
  if (isGolfSport(sport)) return "handicap seeding";
  return "registration order";
}

export function sortPlayersForSeeding<T extends TournamentPlayerRatings>(
  sport: string,
  players: T[],
): T[] {
  const copy = [...players];
  if (isGolfSport(sport)) {
    return copy.sort((a, b) => {
      const ha = a.handicap ?? 999;
      const hb = b.handicap ?? 999;
      if (ha !== hb) return ha - hb;
      return a.name.localeCompare(b.name);
    });
  }
  if (isTennisSport(sport)) {
    return copy.sort((a, b) => {
      const ua = a.utrRating ?? 0;
      const ub = b.utrRating ?? 0;
      if (ub !== ua) return ub - ua;
      return a.name.localeCompare(b.name);
    });
  }
  return copy.sort((a, b) => a.name.localeCompare(b.name));
}

export function comparePlayersForStandings(
  sport: string,
  a: { utr?: number | null; handicap?: number | null },
  b: { utr?: number | null; handicap?: number | null },
): number {
  if (isGolfSport(sport)) {
    return (a.handicap ?? 999) - (b.handicap ?? 999);
  }
  if (isTennisSport(sport)) {
    return (b.utr ?? 0) - (a.utr ?? 0);
  }
  return 0;
}
