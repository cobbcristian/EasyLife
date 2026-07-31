/** Community weather / surface conditions (demo + ops). */

export type RainAdvisory = {
  /** YYYY-MM-DD */
  date: string;
  active?: boolean;
  message?: string;
};

export type CommunityWeather = {
  /** Date-scoped rain advisories (preferred). */
  rainAdvisories?: RainAdvisory[];
  /**
   * Inclusive YYYY-MM-DD: rain advisory active through this date
   * (legacy / single-day demo flag).
   */
  rainUntil?: string | null;
};

export const COURT_RAIN_MESSAGE =
  "Courts are wet after rain — closed until dry";

export const GOLF_RAIN_MESSAGE =
  "Golf course is closed after rain — closed until dry";

export const COURT_ADDON_IDS = [
  "balls",
  "towels",
  "drinks",
  "lights",
] as const;

export type CourtAddonId = (typeof COURT_ADDON_IDS)[number];

export const COURT_ADDON_OPTIONS: Array<{ id: CourtAddonId; label: string }> = [
  { id: "balls", label: "Can of balls" },
  { id: "towels", label: "Towels" },
  { id: "drinks", label: "Drinks" },
  { id: "lights", label: "Lights" },
];

/** Outdoor playing surfaces closed while a rain advisory is active. */
export function isRainSensitiveAmenity(kind: string): boolean {
  return (
    kind === "court" || kind === "golf_course" || kind === "driving_range"
  );
}

export function rainClosureMessage(kind: string): string {
  if (kind === "golf_course" || kind === "driving_range") {
    return GOLF_RAIN_MESSAGE;
  }
  return COURT_RAIN_MESSAGE;
}

export function parseWeatherJson(
  raw: string | null | undefined,
): CommunityWeather {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as CommunityWeather;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function isRainAdvisoryActive(
  weather: CommunityWeather | null | undefined,
  date: string,
): boolean {
  if (!weather || !date) return false;
  const advisories = weather.rainAdvisories ?? [];
  for (const a of advisories) {
    if (!a?.date) continue;
    if (a.date === date && a.active !== false) return true;
  }
  // Single-day demo flag: wet on this calendar date only.
  if (weather.rainUntil && date === weather.rainUntil) return true;
  return false;
}

/**
 * Ocala FL demo dusk rule: lights default on after 18:00 or before 07:00
 * (civil dusk / dawn approximation).
 */
export function lightsDefaultOn(startTime: string): boolean {
  if (!startTime || startTime.length < 4) return false;
  return startTime >= "18:00" || startTime < "07:00";
}

export function normalizeCourtAddons(
  raw: string[] | null | undefined,
): CourtAddonId[] {
  if (!raw?.length) return [];
  const allowed = new Set<string>(COURT_ADDON_IDS);
  const out: CourtAddonId[] = [];
  for (const id of raw) {
    if (allowed.has(id) && !out.includes(id as CourtAddonId)) {
      out.push(id as CourtAddonId);
    }
  }
  return out;
}

/** YYYY-MM-DD for local calendar day offset from today (server local TZ). */
export function localDateOffset(daysFromToday: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD offset from today in America/New_York (Ocala FL club local day). */
export function easternDateOffset(daysFromToday: number): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = fmt.format(new Date());
  const [y, m, d] = todayStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + daysFromToday);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
