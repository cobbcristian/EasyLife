import { translateCourtCapacityLabel } from "@/lib/court-surfaces";

/** Returns true when [startA, endA) overlaps [startB, endB) — times as HH:MM. */
export function timeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && startB < endA;
}

export function countOverlappingBookings<
  T extends { startTime: string; endTime: string; status: string },
>(
  bookings: T[],
  startTime: string,
  endTime: string,
): number {
  return bookings.filter(
    (b) =>
      b.status !== "cancelled" &&
      timeRangesOverlap(startTime, endTime, b.startTime, b.endTime),
  ).length;
}

export function assignUnitNumber(
  unitCount: number,
  bookings: { startTime: string; endTime: string; status: string; unitNumber: number | null }[],
  startTime: string,
  endTime: string,
  preferredUnit?: number | null,
): number | null {
  const free = listFreeUnitNumbers(unitCount, bookings, startTime, endTime);
  if (preferredUnit != null) {
    return free.includes(preferredUnit) ? preferredUnit : null;
  }
  return free[0] ?? null;
}

/** Unit numbers still free for the given time window (1..unitCount). */
export function listFreeUnitNumbers(
  unitCount: number,
  bookings: { startTime: string; endTime: string; status: string; unitNumber: number | null }[],
  startTime: string,
  endTime: string,
): number[] {
  const overlapping = bookings.filter(
    (b) =>
      b.status !== "cancelled" &&
      timeRangesOverlap(startTime, endTime, b.startTime, b.endTime),
  );
  const taken = new Set(
    overlapping.map((b) => b.unitNumber).filter((n): n is number => n != null),
  );
  const free: number[] = [];
  for (let u = 1; u <= unitCount; u++) {
    if (!taken.has(u)) free.push(u);
  }
  return free;
}

/** Short noun for multi-unit facilities (court / tee time / lane / room). */
export function unitNoun(kind: string): string {
  if (kind === "golf_course") return "Tee time";
  if (kind === "driving_range") return "Lane";
  if (kind === "spa") return "Room";
  if (kind === "court" || kind === "pickleball") return "Court";
  if (kind === "fitness_class") return "Class";
  if (kind === "restaurant") return "Table";
  if (kind === "grill") return "Grill";
  if (kind === "simulator") return "Bay";
  if (kind === "theatre") return "Screening";
  if (kind === "clubhouse") return "Room";
  return "Unit";
}

export function amenityCapacityLabel(
  kind: string,
  unitCount: number,
  holes: number | null,
  surface?: string | null,
): string {
  return translateCapacityLabel((k) => k, kind, unitCount, holes, surface);
}

/** Build hourly windows for a day and mark free vs busy given capacity. */
export function availabilityWindows(
  bookings: Array<{ startTime: string; endTime: string; status: string }>,
  unitCount: number,
  options?: {
    dayStart?: string;
    dayEnd?: string;
    slotMinutes?: number;
    /** Mid-day closures — overlapping slots are not bookable. */
    closed?: Array<{ start: string; end: string; reason?: string }>;
  },
): Array<{
  start: string;
  end: string;
  free: boolean;
  unitsFree: number;
  closedReason?: string | null;
}> {
  const dayStart = options?.dayStart ?? "08:00";
  const dayEnd = options?.dayEnd ?? "20:00";
  const slotMinutes = options?.slotMinutes ?? 60;
  const closed = options?.closed ?? [];
  const [sh, sm] = dayStart.split(":").map(Number);
  const [eh, em] = dayEnd.split(":").map(Number);
  let cursor = (sh || 0) * 60 + (sm || 0);
  const endMins = (eh || 20) * 60 + (em || 0);
  const windows: Array<{
    start: string;
    end: string;
    free: boolean;
    unitsFree: number;
    closedReason?: string | null;
  }> = [];

  while (cursor + slotMinutes <= endMins) {
    const start = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
    const next = cursor + slotMinutes;
    const end = `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
    const closedHit = closed.find(
      (c) => start < c.end && c.start < end,
    );
    if (closedHit) {
      windows.push({
        start,
        end,
        free: false,
        unitsFree: 0,
        closedReason:
          closedHit.reason?.trim() ||
          `Closed ${closedHit.start}–${closedHit.end}`,
      });
    } else {
      const used = countOverlappingBookings(bookings, start, end);
      const unitsFree = Math.max(0, unitCount - used);
      windows.push({ start, end, free: unitsFree > 0, unitsFree, closedReason: null });
    }
    cursor = next;
  }
  return windows;
}

export function translateCapacityLabel(
  t: (key: string) => string,
  kind: string,
  unitCount: number,
  holes: number | null,
  surface?: string | null,
): string {
  if (kind === "golf_course") {
    const teeLabel = `${t("tee time")} ${unitCount}`;
    const holeLabel = holes ? ` · ${holes} ${t("holes")}` : "";
    return `${teeLabel}${holeLabel}`;
  }
  if (kind === "court") {
    return translateCourtCapacityLabel(t, unitCount, surface);
  }
  if (unitCount <= 1) return "";
  const noun = unitNoun(kind).toLowerCase();
  if (noun === "unit") return `${t("unit")} ${unitCount}`;
  return `${t(noun)} ${unitCount}`;
}
