/** Weekly hours — keys Mon..Sun, null = closed that day. */
export type DayHours = {
  open: string;
  close: string;
  /** Mid-day closures (irrigation, maintenance, etc.) within open–close. */
  closed?: ClosedWindow[];
} | null;

export type ClosedWindow = {
  start: string;
  end: string;
  reason?: string;
};

export type WeeklyHours = {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function defaultDailyHours(open: string, close: string): WeeklyHours {
  const day = { open, close };
  return { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day };
}

/** Same open/close every day, with shared mid-day closed windows. */
export function defaultDailyHoursWithClosed(
  open: string,
  close: string,
  closed: ClosedWindow[],
): WeeklyHours {
  const day = { open, close, closed };
  return { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day };
}

export function weekdayHours(
  weekdayOpen: string,
  weekdayClose: string,
  weekendOpen: string,
  weekendClose: string,
): WeeklyHours {
  const wd = { open: weekdayOpen, close: weekdayClose };
  const we = { open: weekendOpen, close: weekendClose };
  return { mon: wd, tue: wd, wed: wd, thu: wd, fri: wd, sat: we, sun: we };
}

export function parseWeeklyHours(raw: string | null | undefined): WeeklyHours | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as WeeklyHours;
    if (!parsed?.mon && !parsed?.tue) return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatClosedNote(day: NonNullable<DayHours>): string {
  const closed = day.closed ?? [];
  if (closed.length === 0) return "";
  return closed
    .map((c) => `closed ${c.start}–${c.end}${c.reason ? ` (${c.reason})` : ""}`)
    .join("; ");
}

export function formatHoursSummary(hours: WeeklyHours | null, fallback = ""): string {
  if (!hours) return fallback;
  const mon = hours.mon;
  const sat = hours.sat;
  let base = fallback;
  if (mon && sat && mon.open === sat.open && mon.close === sat.close) {
    base = `Daily ${mon.open} – ${mon.close}`;
  } else if (mon && sat) {
    base = `Mon–Fri ${mon.open}–${mon.close} · Sat–Sun ${sat.open}–${sat.close}`;
  } else if (mon) {
    base = `Weekdays ${mon.open} – ${mon.close}`;
  }
  if (!mon) return base || fallback;
  const note = formatClosedNote(mon);
  return note ? `${base} · ${note}` : base;
}

export function dayHoursForDate(
  hours: WeeklyHours | null,
  date: string,
): DayHours {
  if (!hours) return null;
  const d = new Date(`${date}T12:00:00`);
  const key = DAY_KEYS[d.getDay()];
  return hours[key] ?? null;
}

/** True when [startA, endA) overlaps [startB, endB). */
export function timeRangeOverlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && startB < endA;
}

export function closedWindowForRange(
  hours: WeeklyHours | null,
  date: string,
  startTime: string,
  endTime: string,
): ClosedWindow | null {
  const day = dayHoursForDate(hours, date);
  if (!day?.closed?.length) return null;
  for (const window of day.closed) {
    if (timeRangeOverlaps(startTime, endTime, window.start, window.end)) {
      return window;
    }
  }
  return null;
}

export function isOpenAt(
  hours: WeeklyHours | null,
  date: string,
  startTime: string,
  endTime: string,
): boolean {
  if (!hours) return true; // no structured hours → allow
  const day = dayHoursForDate(hours, date);
  if (!day) return false;
  if (!(startTime >= day.open && endTime <= day.close)) return false;
  return closedWindowForRange(hours, date, startTime, endTime) == null;
}

export function hoursClosedMessage(
  hours: WeeklyHours | null,
  date: string,
  startTime?: string,
  endTime?: string,
): string | null {
  if (!hours) return null;
  const day = dayHoursForDate(hours, date);
  if (!day) return "Closed on this day.";
  if (startTime && endTime) {
    const closed = closedWindowForRange(hours, date, startTime, endTime);
    if (closed) {
      const reason = closed.reason?.trim();
      return reason
        ? `Closed ${closed.start}–${closed.end}: ${reason}`
        : `Closed ${closed.start}–${closed.end} on this day.`;
    }
  }
  const note = formatClosedNote(day);
  return note
    ? `Open ${day.open} – ${day.close} on this day (${note}).`
    : `Open ${day.open} – ${day.close} on this day.`;
}
