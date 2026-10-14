export type LapseStage = "30" | "7" | "lapsed";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** How close a credential is to lapsing, compared with a YYYY-MM-DD day. */
export function lapseStage(expiresOn: string, today = utcDay()): LapseStage | null {
  if (!DAY.test(expiresOn) || !DAY.test(today)) return null;
  if (expiresOn < today) return "lapsed";
  if (expiresOn <= addUtcDays(today, 7)) return "7";
  if (expiresOn <= addUtcDays(today, 30)) return "30";
  return null;
}

export function credentialKindLabel(kind: string): string {
  if (kind === "insurance") return "Insurance";
  if (kind === "license") return "License";
  return kind;
}
