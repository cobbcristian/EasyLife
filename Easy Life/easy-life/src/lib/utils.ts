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

export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

/** True when the item is today or later, and today's slot has not ended. */
export function isUpcomingItem(date: string, time?: string | null): boolean {
  const day = toDateKey(date);
  const today = localDateKey();
  if (day > today) return true;
  if (day < today) return false;
  const end = parseEndMinutes(time);
  if (end == null) return true;
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() < end;
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
