/** ICS helpers for single events and full calendar feeds (Google / Apple / Outlook). */

export type IcsCalendarItem = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
};

export function buildIcsEvent(input: {
  title: string;
  description?: string;
  location?: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  uid?: string;
  calendarName?: string;
}): string {
  return buildIcsCalendar({
    name: input.calendarName?.trim() || "Club Calendar",
    items: [
      {
        id: input.uid ?? `event-${Date.now()}`,
        title: input.title,
        description: input.description,
        location: input.location,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    ],
  });
}

export function buildIcsCalendar(input: {
  name: string;
  items: IcsCalendarItem[];
}): string {
  const stamp = formatIcsUtcStamp(new Date());
  const events = input.items.map((item) => {
    const { start, end } = resolveIcsRange(item.date, item.startTime, item.endTime);
    const uid = `${sanitizeUid(item.id)}@club.calendar`;
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(item.title)}`,
      item.description ? `DESCRIPTION:${escapeIcs(item.description)}` : null,
      item.location ? `LOCATION:${escapeIcs(item.location)}` : null,
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Club//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(input.name)}`,
    "X-WR-TIMEZONE:America/New_York",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...events,
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function calendarItemsFromAgenda(
  events: Array<{
    id: string;
    title: string;
    description?: string;
    location?: string | null;
    date: string;
    time?: string | null;
    endTime?: string | null;
  }>,
): IcsCalendarItem[] {
  return events.map((event) => {
    const { startTime, endTime } = splitTimeRange(event.time, event.endTime);
    return {
      id: event.id,
      title: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      date: event.date.slice(0, 10),
      startTime,
      endTime,
    };
  });
}

function splitTimeRange(
  time: string | null | undefined,
  endTime: string | null | undefined,
): { startTime: string; endTime: string } {
  if (!time) {
    return { startTime: "09:00", endTime: endTime ?? "10:00" };
  }
  const cleaned = time.replace(/[–—]/g, "-");
  if (cleaned.includes("-")) {
    const [start, end] = cleaned.split("-").map((p) => p.trim());
    return {
      startTime: start || "09:00",
      endTime: endTime?.trim() || end || start || "10:00",
    };
  }
  return {
    startTime: cleaned.trim(),
    endTime: endTime?.trim() || cleaned.trim(),
  };
}

function resolveIcsRange(
  date: string,
  startTime?: string | null,
  endTime?: string | null,
): { start: string; end: string } {
  const start = toIcsLocalDateTime(date, startTime ?? "09:00");
  let end = toIcsLocalDateTime(date, endTime ?? startTime ?? "10:00");
  if (end <= start) {
    // Default one-hour block when end is missing or equal.
    end = toIcsLocalDateTime(date, bumpHour(startTime ?? "09:00"));
  }
  return { start, end };
}

function bumpHour(time: string): string {
  const minutes = parseTimeToMinutes(time);
  const next = (minutes + 60) % (24 * 60);
  const hh = String(Math.floor(next / 60)).padStart(2, "0");
  const mm = String(next % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseTimeToMinutes(time: string): number {
  const raw = time.trim();
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!ampm) {
    const [h = "9", m = "0"] = raw.split(":");
    return (Number(h) || 9) * 60 + (Number(m.replace(/\D/g, "")) || 0);
  }
  let hour = Number(ampm[1]);
  const minute = Number(ampm[2]);
  const meridiem = ampm[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** Floating local time (no Z) — clubs are Florida / Eastern demos. */
function toIcsLocalDateTime(date: string, time: string): string {
  const minutes = parseTimeToMinutes(time);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  const day = date.slice(0, 10).replace(/-/g, "");
  return `${day}T${hh}${mm}00`;
}

function formatIcsUtcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function sanitizeUid(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}
