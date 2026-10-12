export type NoStartDefault = "manual" | "higher_seed" | "lower_seed";

export const NO_START_DEFAULT_OPTIONS: NoStartDefault[] = [
  "manual",
  "higher_seed",
  "lower_seed",
];

export const DEFAULT_NO_START_POLICY: NoStartDefault = "manual";

export function noStartDefaultLabel(policy: NoStartDefault): string {
  switch (policy) {
    case "higher_seed":
      return "Higher seed advances";
    case "lower_seed":
      return "Lower seed advances";
    case "manual":
      return "Director chooses winner";
  }
}

export function parseNoStartDefault(value: string | null | undefined): NoStartDefault {
  if (value === "higher_seed" || value === "lower_seed" || value === "manual") {
    return value;
  }
  return DEFAULT_NO_START_POLICY;
}

function seedIndex(name: string, seeds: string[]): number {
  const idx = seeds.indexOf(name);
  return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
}

export function noStartWinnerSide(
  match: { p1: string | null; p2: string | null },
  seeds: string[],
  policy: NoStartDefault,
): "p1" | "p2" | null {
  if (policy === "manual") return null;
  if (!match.p1 || !match.p2 || match.p1.startsWith("BYE") || match.p2.startsWith("BYE")) {
    return null;
  }
  const p1Idx = seedIndex(match.p1, seeds);
  const p2Idx = seedIndex(match.p2, seeds);
  if (policy === "higher_seed") return p1Idx <= p2Idx ? "p1" : "p2";
  return p1Idx > p2Idx ? "p1" : "p2";
}

export function noStartWinnerName(
  match: { p1: string | null; p2: string | null },
  seeds: string[],
  policy: NoStartDefault,
): string | null {
  const side = noStartWinnerSide(match, seeds, policy);
  if (side === "p1") return match.p1;
  if (side === "p2") return match.p2;
  return null;
}
