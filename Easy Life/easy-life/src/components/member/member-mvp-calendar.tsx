"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { imageForBookingRow, imageForEvent, imageForTournament } from "@/lib/brand-assets";
import { AddEventSheet } from "@/components/member/add-event-sheet";
import { CalendarSyncSheet } from "@/components/member/calendar-sync-sheet";
import { MemberMvpBottomNav } from "@/components/member/member-mvp-bottom-nav";
import { buildIcsEvent, downloadIcs } from "@/lib/calendar-ics";
import { communityIsResidentialHoa } from "@/lib/community-features";
import { useI18n } from "@/lib/i18n";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import type { CalendarEventDTO } from "@/lib/member-dtos";

type Props = {
  events: CalendarEventDTO[];
  ads: { id: string; title: string; sponsor: string; linkUrl: string | null }[];
  communityId?: string | null;
};

type CalendarView = "list" | "week" | "month";
type DotKind =
  | "event"
  | "social"
  | "booking"
  | "service"
  | "board"
  | "dining"
  | "tournament";

const DOT_COLORS: Record<DotKind, string> = {
  event: "bg-[var(--mvp-blue)]",
  social: "bg-[#34c759]",
  booking: "bg-[#f99f25]",
  service: "bg-[#af52de]",
  board: "bg-[#8e8e93]",
  dining: "bg-[#ff2d55]",
  tournament: "bg-[#5856d6]",
};

const DOT_LEGEND: Array<{ kind: DotKind; label: string }> = [
  { kind: "event", label: "Community" },
  { kind: "social", label: "Social" },
  { kind: "booking", label: "Amenity" },
  { kind: "service", label: "Service visit" },
  { kind: "dining", label: "Dining" },
  { kind: "tournament", label: "Tournament" },
  { kind: "board", label: "Board" },
];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calendarDotKind(event: CalendarEventDTO): DotKind {
  if (event.source === "service" || event.category === "service") return "service";
  if (event.source === "dining" || event.category === "dining") return "dining";
  if (event.source === "tournament") {
    return "tournament";
  }
  if (event.source === "booking" || event.category === "booking") return "booking";
  const hay = `${event.category} ${event.title}`.toLowerCase();
  if (/social|party|mixer|dinner|happy hour|wine/.test(hay)) return "social";
  if (/board|hoa|governance|budget|maintenance|meeting/.test(hay)) return "board";
  return "event";
}

function uniqueDotKinds(dayEvents: CalendarEventDTO[]): DotKind[] {
  const seen = new Set<DotKind>();
  const kinds: DotKind[] = [];
  for (const event of dayEvents) {
    const kind = calendarDotKind(event);
    if (seen.has(kind)) continue;
    seen.add(kind);
    kinds.push(kind);
    if (kinds.length >= 4) break;
  }
  return kinds;
}

function isTimeOnlyDescription(description: string, time?: string | null) {
  const normalized = description.replace(/\s+/g, "").replace(/[–—]/g, "-");
  if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(normalized)) return false;
  if (!time) return true;
  const timeNorm = time.replace(/\s+/g, "").replace(/[–—]/g, "-");
  return normalized === timeNorm;
}

function eventImage(event: CalendarEventDTO): string {
  if (event.source === "tournament") {
    return imageForTournament(event.category || event.title);
  }
  if (
    event.source === "booking" ||
    event.source === "service" ||
    /golf|pickle|tennis|court|tee|range/i.test(
      `${event.title} ${event.location ?? ""} ${event.category}`,
    )
  ) {
    return imageForBookingRow(
      event.source === "booking" || event.source === "service"
        ? event.title
        : event.location || event.title,
    );
  }
  if (event.source === "dining") {
    return imageForEvent("dining", event.title);
  }
  return imageForEvent(event.category, event.title);
}

function sourceLabel(event: CalendarEventDTO, t: (s: string) => string): string {
  switch (event.source) {
    case "service":
      return t("Service visit");
    case "booking":
      return t("Booking");
    case "dining":
      return t("Dining");
    case "tournament":
      return t("Tournament");
    case "event":
      return event.scope === "you" ? t("Going") : t("Club");
    default:
      return event.scope === "you" ? t("You") : t("Club");
  }
}

function AgendaRow({
  event,
  t,
  onAdd,
  onRsvp,
  isPast,
}: {
  event: CalendarEventDTO;
  t: (s: string) => string;
  onAdd: (e: CalendarEventDTO) => void;
  onRsvp: (e: CalendarEventDTO) => void;
  isPast?: boolean;
}) {
  const router = useRouter();
  const canRsvp = event.source === "event" && !isPast;

  return (
    <li className="flex gap-3 py-3.5 first:pt-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={eventImage(event)}
        alt=""
        className="h-[52px] w-[52px] shrink-0 rounded-[10px] object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 text-left text-[15px] font-semibold leading-snug text-ink"
            onClick={() => {
              if (event.href) router.push(event.href);
            }}
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                DOT_COLORS[calendarDotKind(event)],
              )}
              aria-hidden
            />
            <span className="truncate">{event.title}</span>
          </button>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              event.scope === "you"
                ? "bg-[var(--mvp-blue)]/10 text-[var(--mvp-blue)]"
                : "bg-[#f2f4f7] text-grey",
            )}
          >
            {event.scope === "you" ? t("You") : t("Club")}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-grey">
          {event.date}
          {event.time ? ` · ${event.time}` : ""}
          {event.location ? ` · ${event.location}` : ""}
          {` · ${sourceLabel(event, t)}`}
          {event.requirePayment && event.feeCents
            ? ` · ${formatCurrency(event.feeCents / 100)}`
            : ""}
        </p>
        {event.description &&
        !isTimeOnlyDescription(event.description, event.time) ? (
          <p className="mt-1 line-clamp-2 text-[12px] text-grey">{event.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAdd(event)}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-[#f2f4f7] px-3 text-[12px] font-semibold text-ink"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            {t("Add to calendar")}
          </button>
          {canRsvp ? (
            <button
              type="button"
              onClick={() => onRsvp(event)}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold",
                event.userRsvped
                  ? "bg-[#f2f4f7] text-ink"
                  : "bg-[var(--mvp-blue)] text-white",
              )}
            >
                            {event.userRsvped ? t("Not going") : t("Going")}
                          </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** Figma-aligned member community calendar — club + personal day agenda. */
export function MemberMvpCalendar({ events, ads, communityId }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [view, setView] = useState<CalendarView>("month");
  const [addOpen, setAddOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const todayKey = useSyncExternalStore(
    () => () => {},
    () => toDateKey(new Date()),
    () => null,
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const effectiveSelectedDay =
    selectedDay ?? (view === "month" || view === "week" ? todayKey : null);

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  const isPastDay = Boolean(
    effectiveSelectedDay && todayKey && effectiveSelectedDay < todayKey,
  );
  const isFutureDay = Boolean(
    effectiveSelectedDay && todayKey && effectiveSelectedDay > todayKey,
  );

  const weekDays = useMemo(() => {
    if (!todayKey) return [] as Date[];
    const start = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [todayKey]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventDTO[]>();
    for (const event of sorted) {
      const key = event.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [sorted]);

  const monthCells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const first = new Date(year, month, 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [monthCursor]);

  const listEvents = useMemo(() => {
    if ((view === "month" || view === "week") && effectiveSelectedDay) {
      return sorted.filter((e) => e.date.slice(0, 10) === effectiveSelectedDay);
    }
    return sorted;
  }, [sorted, view, effectiveSelectedDay]);

  const pastListEvents = useMemo(() => {
    if (view !== "list" || !todayKey) return [] as CalendarEventDTO[];
    return sorted.filter((e) => e.date.slice(0, 10) < todayKey);
  }, [sorted, view, todayKey]);

  const upcomingListEvents = useMemo(() => {
    if (view !== "list" || !todayKey) return listEvents;
    return sorted.filter((e) => e.date.slice(0, 10) >= todayKey);
  }, [sorted, view, todayKey, listEvents]);

  const selectedDayLabel = useMemo(() => {
    if (!effectiveSelectedDay) return null;
    try {
      return new Date(`${effectiveSelectedDay}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return effectiveSelectedDay;
    }
  }, [effectiveSelectedDay]);

  async function toggleRsvp(event: CalendarEventDTO) {
    if (event.source !== "event") return;
    const res = await fetch(`/api/events/${event.id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.needsPayment && data.amount) {
      if (data.payUrl) {
        window.location.href = data.payUrl as string;
        return;
      }
      const pay = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: data.amount,
          description: data.description ?? `Event fee: ${event.title}`,
          returnPath: `/member/calendar?paidEvent=${event.id}`,
        }),
      });
      const payData = await pay.json();
      if (!pay.ok) {
        toast({
          variant: "warning",
          title: t("Payment required"),
          description: payData.error ?? t("Add a payment method to RSVP."),
        });
        return;
      }
      if (payData.url) {
        window.location.href = payData.url;
        return;
      }
      if (payData.paid) {
        await fetch(`/api/events/${event.id}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paid: true }),
        });
        toast({ variant: "success", title: t("You're going!") });
        router.refresh();
        return;
      }
    }
    if (res.status === 409 || data.full) {
      toast({
        variant: "warning",
        title: t("Clinic is full"),
        description: data.error,
      });
      return;
    }
    if (!res.ok && !data.ok) {
      toast({ variant: "warning", title: t("Could not update RSVP") });
      return;
    }
    toast({
      variant: "success",
      title: data.rsvped ? t("You're going!") : t("Marked not going"),
    });
    router.refresh();
  }

  function addToDeviceCalendar(event: CalendarEventDTO) {
    const [startPart, endPart] = (event.time ?? "09:00-10:00").split("-");
    const ics = buildIcsEvent({
      title: event.title,
      description: event.description,
      location: event.location,
      date: event.date.slice(0, 10),
      startTime: startPart,
      endTime: endPart ?? event.endTime ?? startPart,
    });
    void downloadIcs(
      `${event.title.replace(/\s+/g, "-").toLowerCase()}.ics`,
      ics,
    ).then((result) => {
      toast({
        variant: result.ok ? "success" : "warning",
        title: result.ok
          ? t("Added to calendar")
          : t("Could not add to calendar"),
        description:
          result.method === "native" || result.method === "share"
            ? t("Choose Calendar to save this booking.")
            : undefined,
      });
    });
  }

  const monthLabel = monthCursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function renderDaySplit(items: CalendarEventDTO[], past: boolean) {
    const yours = items.filter((e) => e.scope === "you");
    const club = items.filter((e) => e.scope !== "you");
    return (
      <div className="mt-3 space-y-6">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-grey">
            {t("Your Schedule")}
            <span className="ml-2 font-medium normal-case text-grey/80">
              ({yours.length})
            </span>
          </h3>
          {yours.length === 0 ? (
            past ? (
              <p className="mt-2 text-sm text-grey">{t("Nothing personal on this day.")}</p>
            ) : (
              <div className="mt-2 rounded-xl bg-[#F7F8FA] p-4">
                <p className="text-sm text-grey">{t("Nothing personal scheduled.")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/member/bookings"
                    className="inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                  >
                    {t("Book")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="inline-flex h-9 items-center rounded-lg border border-[#e8ebf0] bg-white px-3 text-sm font-semibold text-ink"
                  >
                    {t("Add Event")}
                  </button>
                </div>
              </div>
            )
          ) : (
            <ul className="mt-1 divide-y divide-[#eceff3]">
              {yours.map((event) => (
                <AgendaRow
                  key={event.id}
                  event={event}
                  t={t}
                  isPast={past}
                  onAdd={addToDeviceCalendar}
                  onRsvp={(e) => void toggleRsvp(e)}
                />
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-grey">
            {t("Around the club")}
            <span className="ml-2 font-medium normal-case text-grey/80">
              ({club.length})
            </span>
          </h3>
          {club.length === 0 ? (
            <p className="mt-2 text-sm text-grey">
              {past
                ? t("No club events that day.")
                : t("No club events this day.")}
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-[#eceff3]">
              {club.map((event) => (
                <AgendaRow
                  key={event.id}
                  event={event}
                  t={t}
                  isPast={past}
                  onAdd={addToDeviceCalendar}
                  onRsvp={(e) => void toggleRsvp(e)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  function renderAgendaSections() {
    if (view === "list") {
      return (
        <div className="mt-3 space-y-8">
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-grey">
              {t("Coming up")}
            </h3>
            {upcomingListEvents.length === 0 ? (
              <div className="mt-2 rounded-xl bg-[#F7F8FA] p-4">
                <p className="text-sm text-grey">{t("Nothing coming up.")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/member/bookings"
                    className="inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                  >
                    {t("Book")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="inline-flex h-9 items-center rounded-lg border border-[#e8ebf0] bg-white px-3 text-sm font-semibold text-ink"
                  >
                    {t("Add Event")}
                  </button>
                </div>
              </div>
            ) : (
              renderDaySplit(upcomingListEvents, false)
            )}
          </div>
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-grey">
              {t("Earlier")}
            </h3>
            {pastListEvents.length === 0 ? (
              <p className="mt-2 text-sm text-grey">{t("No earlier activity yet.")}</p>
            ) : (
              renderDaySplit([...pastListEvents].reverse(), true)
            )}
          </div>
        </div>
      );
    }

    if (listEvents.length === 0) {
      return isPastDay ? (
        <p className="mt-3 text-sm text-grey">
          {t("Nothing happened on the club calendar or your schedule this day.")}
        </p>
      ) : (
        <div className="mt-3 rounded-xl bg-[#F7F8FA] p-4">
          <p className="text-sm text-grey">
            {t("Nothing on the club calendar or your schedule for this day.")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/member/bookings"
              className="inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
            >
              {t("Book")}
            </Link>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex h-9 items-center rounded-lg border border-[#e8ebf0] bg-white px-3 text-sm font-semibold text-ink"
            >
              {t("Add Event")}
            </button>
          </div>
        </div>
      );
    }

    return renderDaySplit(listEvents, isPastDay);
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg pb-28 md:max-w-3xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
              {t("Calendar")}
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSyncOpen(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#e8ebf0] bg-white px-3 text-sm font-semibold text-ink"
              >
                <RefreshCw className="h-4 w-4" />
                {t("Sync")}
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                {t("Add Event")}
              </button>
            </div>
          </div>
          <p className="mt-1 text-[12px] text-grey">
            {t(
              communityIsResidentialHoa(communityId)
                ? "Building activity and your bookings, dining, and service visits."
                : "Club activity and your bookings, dining, and service visits.",
            )}
          </p>
          <div className="mt-3 flex rounded-full bg-[#f2f4f7] p-1">
            {(
              [
                { mode: "list" as const, label: "List" },
                { mode: "week" as const, label: "Week" },
                { mode: "month" as const, label: "Month" },
              ] as const
            ).map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  "flex-1 rounded-full py-2 text-sm font-semibold capitalize transition",
                  view === mode
                    ? "bg-white text-ink shadow-sm"
                    : "text-grey",
                )}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-5 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {ads.length > 0 ? (
            <div className="space-y-2">
              {ads.map((ad) =>
                ad.linkUrl ? (
                <a
                  key={ad.id}
                  href={ad.linkUrl}
                  className="block rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--mvp-blue)]">
                    {t("Sponsored")}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{ad.title}</p>
                  <p className="text-[12px] text-grey">{ad.sponsor}</p>
                </a>
                ) : (
                <div
                  key={ad.id}
                  className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--mvp-blue)]">
                    {t("Sponsored")}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{ad.title}</p>
                  <p className="text-[12px] text-grey">{ad.sponsor}</p>
                </div>
                ),
              )}
            </div>
          ) : null}

          {view === "week" ? (
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((day) => {
                const key = toDateKey(day);
                const dayEvents = eventsByDay.get(key) ?? [];
                const isToday = todayKey !== null && todayKey === key;
                const isSelected = effectiveSelectedDay === key;
                const dots = uniqueDotKinds(dayEvents);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={cn(
                      "min-h-[88px] rounded-xl border px-1.5 py-2 text-left",
                      isSelected
                        ? "border-[var(--mvp-blue)] bg-[var(--mvp-blue)] text-white"
                        : isToday
                          ? "border-[var(--mvp-blue)] bg-[var(--mvp-blue)]/5"
                          : "border-[#eceff3]",
                    )}
                  >
                    <p
                      className={cn(
                        "text-center text-[10px] font-medium",
                        isSelected ? "text-white/80" : "text-grey",
                      )}
                    >
                      {day.toLocaleDateString("en-US", { weekday: "narrow" })}
                    </p>
                    <p
                      className={cn(
                        "text-center text-sm font-semibold",
                        isSelected ? "text-white" : "text-ink",
                      )}
                    >
                      {day.getDate()}
                    </p>
                    <div className="mt-1.5 flex justify-center gap-0.5">
                      {dots.map((kind) => (
                        <span
                          key={kind}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            isSelected ? "bg-white/90" : DOT_COLORS[kind],
                          )}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {view === "month" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label={t("Previous month")}
                  onClick={() =>
                    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-[#f2f4f7]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-[15px] font-semibold text-ink">{monthLabel}</h2>
                <button
                  type="button"
                  aria-label={t("Next month")}
                  onClick={() =>
                    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-[#f2f4f7]"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-grey">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={`${d}-${i}`} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthCells.map((day) => {
                  const key = toDateKey(day);
                  const inMonth = day.getMonth() === monthCursor.getMonth();
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const dots = uniqueDotKinds(dayEvents);
                  const isToday = todayKey === key;
                  const isSelected = effectiveSelectedDay === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(key)}
                      className={cn(
                        "flex min-h-[52px] flex-col items-center rounded-xl px-0.5 py-1.5 transition",
                        !inMonth && "opacity-35",
                        isSelected
                          ? "bg-[var(--mvp-blue)] text-white"
                          : isToday
                            ? "bg-[var(--mvp-blue)]/10 text-ink"
                            : "text-ink hover:bg-[#f2f4f7]",
                      )}
                    >
                      <span className="text-sm font-semibold">{day.getDate()}</span>
                      <span className="mt-1 flex min-h-[6px] items-center justify-center gap-0.5">
                        {dots.map((kind) => (
                          <span
                            key={kind}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              isSelected ? "bg-white/90" : DOT_COLORS[kind],
                            )}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1.5 rounded-xl border border-[#eceff3] bg-[#fafbfc] px-3 py-2.5">
                {DOT_LEGEND.map((item) => (
                  <span
                    key={item.kind}
                    className="inline-flex items-center gap-1.5 text-[11px] text-grey"
                  >
                    <span
                      className={cn("h-2 w-2 rounded-full", DOT_COLORS[item.kind])}
                    />
                    {t(item.label)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <section>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-ink">
                {view === "list"
                  ? t("Full schedule")
                  : isPastDay
                    ? t("What happened")
                    : isFutureDay
                      ? t("Coming up")
                      : t("Everything this day")}
              </h2>
              {selectedDayLabel && view !== "list" ? (
                <p className="text-[12px] font-medium text-grey">{selectedDayLabel}</p>
              ) : null}
            </div>
            {view !== "list" ? (
              <p className="mt-1 text-[12px] text-grey">
                {t("Tap any day on the calendar to see club activity and your schedule.")}
              </p>
            ) : null}
            {renderAgendaSections()}
          </section>
        </div>
      </div>
      <AddEventSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <CalendarSyncSheet open={syncOpen} onClose={() => setSyncOpen(false)} />
      <MemberMvpBottomNav />
    </div>
  );
}
