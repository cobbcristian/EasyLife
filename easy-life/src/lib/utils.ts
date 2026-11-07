import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/** Florida club wall clock. Azure/Vercel run UTC; amenity times are Eastern. */
export const CLUB_TIME_ZONE = "America/New_York";

export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clubDateParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

/** YYYY-MM-DD in the club timezone (not the host TZ). */
export function clubDateKey(d = new Date()): string {
  const { year, month, day } = clubDateParts(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Minutes since local midnight in the club timezone. */
export function clubMinutesNow(d = new Date()): number {
  const { hour, minute } = clubDateParts(d);
  return hour * 60 + minute;
}

/**
 * Convert a club-local calendar date + HH:MM wall time to a UTC Date.
 * Booking/event times are stored without offsets and mean America/New_York.
 */
export function clubDateTimeToUtc(date: string, time: string): Date {
  const day = toDateKey(date);
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  const hour = match ? Number(match[1]) : 0;
  const minute = match ? Number(match[2]) : 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return new Date(NaN);
  }
  const [year, month, dayNum] = day.split("-").map(Number);
  let utcMs = Date.UTC(year, month - 1, dayNum, hour, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const parts = clubDateParts(new Date(utcMs));
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      0,
    );
    const wanted = Date.UTC(year, month - 1, dayNum, hour, minute, 0);
    utcMs += wanted - asUtc;
  }
  return new Date(utcMs);
}

/** Normalize stored dates (`2026-08-05` or ISO) to a local YYYY-MM-DD key. */
export function toDateKey(value: string): string {
  const trimmed = value.trim();
  const isoDay = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDay;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return localDateKey(parsed);
}

function parseEndMinutes(time?: string | null): number | null {
  if (!time) return null;
  const parts = time
    .split(/[–—-]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const endRaw = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
  if (!endRaw) return null;
  const match = endRaw.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = (match[3] ?? "").toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** Join a start and end into one window. A start that already has a range is left as-is. */
export function eventTimeWindow(
  time?: string | null,
  endTime?: string | null,
): string | null {
  const start = (time ?? "").trim();
  const end = (endTime ?? "").trim();
  if (!start && !end) return null;
  if (!end) return start;
  if (!start) return end;
  if (/[-–—]/.test(start) && /\d/.test(start)) return start;
  return `${start}–${end}`;
}

/**
 * True when the item is today or later in club time, and today's slot has not ended.
 * Must not use the host TZ — production hosts are UTC while clubs are Eastern.
 */
export function isUpcomingItem(
  date: string,
  time?: string | null,
  now: Date = new Date(),
): boolean {
  const day = toDateKey(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = clubDateKey(now);
  if (day > today) return true;
  if (day < today) return false;
  const end = parseEndMinutes(time);
  if (end == null) return true;
  return clubMinutesNow(now) < end;
}

/** True while the date is still ahead, or today's window has not ended. */
export function isOpenSchedule(
  date: string,
  time?: string | null,
  endTime?: string | null,
  now: Date = new Date(),
): boolean {
  return isUpcomingItem(date, eventTimeWindow(time, endTime), now);
}

export function formatDate(date: string) {
  if (!date?.trim()) return "";
  const key = toDateKey(date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const [year, month, day] = key.split("-").map(Number);
    if (!year || !month || !day) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
