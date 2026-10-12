export const COURT_SURFACES = [
  { id: "hard_court", label: "Hard court" },
  { id: "green_clay", label: "Green clay" },
  { id: "red_clay", label: "Red clay" },
  { id: "grass", label: "Grass" },
  { id: "carpet", label: "Carpet" },
] as const;

export type CourtSurfaceId = (typeof COURT_SURFACES)[number]["id"];

const LABELS: Record<string, string> = Object.fromEntries(
  COURT_SURFACES.map((s) => [s.id, s.label]),
);

export function surfaceLabel(surface: string | null | undefined): string {
  if (!surface) return "";
  return LABELS[surface] ?? surface.replace(/_/g, " ");
}

export function translateSurfaceLabel(
  t: (key: string) => string,
  surface: string | null | undefined,
): string {
  if (!surface) return "";
  const label = LABELS[surface];
  return label ? t(label) : surface.replace(/_/g, " ");
}

export function isCourtSurface(value: string): value is CourtSurfaceId {
  return COURT_SURFACES.some((s) => s.id === value);
}

/** e.g. "court 12 · Green clay" */
export function courtCapacityLabel(unitCount: number, surface: string | null | undefined): string {
  return translateCourtCapacityLabel((k) => k, unitCount, surface);
}

export function translateCourtCapacityLabel(
  t: (key: string) => string,
  unitCount: number,
  surface: string | null | undefined,
): string {
  const courts = `${t("court")} ${unitCount}`;
  const surf = translateSurfaceLabel(t, surface);
  return surf ? `${courts} · ${surf}` : courts;
}
