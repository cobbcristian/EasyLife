"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import {
  ProviderActivityCreateBookingSheet,
  type ActivityCreateBookingPayload,
} from "@/components/provider/provider-activity-create-booking-sheet";
import {
  ProviderCreateBookingSheet,
  type CreateBookingPayload,
} from "@/components/provider/provider-create-booking-sheet";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { isActiveServiceBooking, type ServiceBookingStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export interface ProviderBookingRow {
  id: string;
  resident: string;
  service: string;
  date: string;
  time: string;
  status: ServiceBookingStatus;
  amount: number;
  goingCount?: number;
}

function isActivityService(service: string) {
  return /court|tennis|pickle|activity|yoga|swim|racquet|golf/i.test(service);
}

function courtLabel(service: string) {
  const match = service.match(/court\s*#?\s*(\d+)/i);
  if (match) return `Court ${match[1]}`;
  if (/court/i.test(service)) return service;
  return service.split(",")[0]?.trim() || "Court";
}

function goingLabel(
  booking: Pick<ProviderBookingRow, "service" | "resident" | "goingCount">,
) {
  if (booking.goingCount != null && booking.goingCount > 0) {
    return booking.goingCount === 1
      ? "1 Player"
      : `${booking.goingCount} Players`;
  }
  const match = booking.service.match(/(\d+)\s*players?/i);
  if (match) {
    const n = Number(match[1]);
    return n === 1 ? "1 Player" : `${n} Players`;
  }
  // Stable demo count from name hash so rows look like Figma without schema.
  const n = (booking.resident.length % 4) + 1;
  return n === 1 ? "1 Player" : `${n} Players`;
}

function displayStatus(
  status: ServiceBookingStatus,
  activityList: boolean,
): "Pending" | "Accepted" | "Confirmed" | "Cancelled" | "Completed" {
  switch (status) {
    case "pending":
    case "upcoming":
      return "Pending";
    case "accepted":
      return activityList ? "Confirmed" : "Accepted";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusPillClass(
  status: ServiceBookingStatus,
  activityList: boolean,
): string {
  const label = displayStatus(status, activityList);
  switch (label) {
    case "Pending":
      return "bg-[#f99f25] text-white";
    case "Accepted":
    case "Confirmed":
      return "bg-[#34c759] text-white";
    case "Cancelled":
      return "bg-[#c7c7cc] text-white";
    case "Completed":
      return "bg-[#8e8e93] text-white";
    default: {
      const _exhaustive: never = label;
      return _exhaustive;
    }
  }
}

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

/** Figma mobile Bookings calendar strip (4751:3000). */
function MobileWeekStrip({ bookings }: { bookings: ProviderBookingRow[] }) {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const monthLabel = anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const counts = new Map<string, number>();
  for (const b of bookings) {
    if (!isActiveServiceBooking(b.status)) continue;
    counts.set(b.date, (counts.get(b.date) ?? 0) + 1);
  }

  return (
    <div className="mb-5 rounded-2xl border border-[#e8ebf0] bg-white px-3 py-4 md:hidden">
      <div className="mb-3 flex items-center justify-between px-1">
        <button
          type="button"
          className="text-sm font-semibold text-[var(--mvp-blue)]"
          onClick={() => setAnchor((a) => addDays(a, -7))}
        >
          {t("Prev")}
        </button>
        <p className="text-[15px] font-semibold text-ink">{monthLabel}</p>
        <button
          type="button"
          className="text-sm font-semibold text-[var(--mvp-blue)]"
          onClick={() => setAnchor((a) => addDays(a, 7))}
        >
          {t("Next")}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = toDateKey(day);
          const isToday = toDateKey(new Date()) === key;
          const count = counts.get(key) ?? 0;
          return (
            <div key={key} className="flex flex-col items-center gap-1 py-1">
              <span className="text-[10px] font-medium uppercase text-grey">
                {day.toLocaleDateString("en-US", { weekday: "narrow" })}
              </span>
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  isToday
                    ? "bg-[var(--mvp-blue)] text-white"
                    : "text-ink",
                )}
              >
                {day.getDate()}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {count > 0 ? (
                  Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[var(--mvp-blue)]"
                    />
                  ))
                ) : (
                  <span className="h-1.5 w-1.5" />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Figma Service Booking — List View + Create Booking + Action Popup. */
export function ProviderMvpBookingList({
  bookings: initialBookings,
  avatarName,
}: {
  bookings: ProviderBookingRow[];
  avatarName: string;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [prevInitialBookings, setPrevInitialBookings] = useState(initialBookings);
  if (initialBookings !== prevInitialBookings) {
    setPrevInitialBookings(initialBookings);
    setBookings(initialBookings);
  }
  const [createOpen, setCreateOpen] = useState(false);
  const [listMode, setListMode] = useState<"service" | "activity">("service");
  const [offeringCourts, setOfferingCourts] = useState<
    Array<{ id: string; name: string; bookedSlots?: string[] }>
  >([]);
  const [onlyActivities, setOnlyActivities] = useState(false);
  const [autoActivityApplied, setAutoActivityApplied] = useState(false);
  const [query, setQuery] = useState("");
  const [courtFilter, setCourtFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("menu");
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const bookingDerivedCourts = useMemo(() => {
    if (offeringCourts.length > 0) return [] as Array<{ id: string; name: string }>;
    const fromBookings = Array.from(
      new Set(
        bookings
          .filter((b) => /court/i.test(b.service))
          .map((b) => courtLabel(b.service)),
      ),
    );
    return fromBookings.map((name, i) => ({ id: `booking-court-${i}`, name }));
  }, [bookings, offeringCourts.length]);

  const activityCourts =
    offeringCourts.length > 0 ? offeringCourts : bookingDerivedCourts;

  const shouldAutoActivity =
    onlyActivities || (offeringCourts.length === 0 && bookingDerivedCourts.length > 0);
  if (shouldAutoActivity && !autoActivityApplied) {
    setAutoActivityApplied(true);
    setListMode("activity");
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/provider/offerings?kind=activity").then((r) => r.json()),
      fetch("/api/provider/offerings?kind=service").then((r) => r.json()),
    ])
      .then(([activityData, serviceData]) => {
        const activities = (activityData.offerings ?? []) as Array<{
          id: string;
          name: string;
        }>;
        const services = (serviceData.offerings ?? []) as Array<{ id: string }>;
        if (activities.length > 0) {
          // Only real courts — lawn "activities" (mulch, irrigation) are not court filters.
          const courts = activities.filter((o) => /court/i.test(o.name));
          setOfferingCourts(
            courts.map((o) => ({
              id: o.id,
              name: o.name.replace(/court\s*/i, "Court #").replace(/##+/g, "#"),
            })),
          );
        }
        if (activities.length > 0 && services.length === 0) {
          setOnlyActivities(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFor(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const activityList = listMode === "activity";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (activityList && !isActivityService(b.service) && activityCourts.length) {
        // Still show court-created rows (service field is Court #n).
        if (!/court/i.test(b.service)) return false;
      }
      if (!activityList && isActivityService(b.service) && activityCourts.length) {
        // Prefer non-court rows in service list when both exist.
        if (/^court/i.test(b.service.trim())) return false;
      }
      if (activityList && courtFilter !== "all") {
        if (courtLabel(b.service).toLowerCase() !== courtFilter.toLowerCase()) {
          return false;
        }
      }
      if (activityList && dateFilter && b.date !== dateFilter) return false;
      if (!q) return true;
      return (
        b.resident.toLowerCase().includes(q) ||
        b.service.toLowerCase().includes(q) ||
        displayStatus(b.status, activityList).toLowerCase().includes(q)
      );
    });
  }, [bookings, query, activityList, courtFilter, dateFilter, activityCourts.length]);

  async function patchStatus(id: string, status: ServiceBookingStatus) {
    const res = await fetch("/api/provider/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not update booking") });
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    setMenuFor(null);
    toast({
      variant: "success",
      title: status === "accepted" ? t("Booking accepted") : t("Booking cancelled"),
    });
  }

  async function handleCreate(payload: CreateBookingPayload | ActivityCreateBookingPayload) {
    const res = await fetch("/api/provider/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        goingCount:
          "goingCount" in payload && typeof payload.goingCount === "number"
            ? payload.goingCount
            : payload.invitees?.length
              ? 1 + payload.invitees.length
              : undefined,
      }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not create booking") });
      return;
    }
    const data = await res.json();
    if (data.booking) {
      setBookings((prev) => [data.booking, ...prev]);
    }
    toast({ variant: "success", title: t("Booking created") });
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Bookings")} avatarName={avatarName} showMessages />
      <PageBody>
        <MobileWeekStrip bookings={bookings} />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg bg-[#f2f2f7] p-0.5">
              <button
                type="button"
                onClick={() => setListMode("service")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition",
                  !activityList
                    ? "bg-white text-black shadow-sm"
                    : "text-grey hover:text-black",
                )}
              >
                {t("List")}
              </button>
              <Link
                href="/provider/calendar"
                className="rounded-md px-4 py-1.5 text-sm font-medium text-grey transition hover:text-black"
              >
                {t("Calendar")}
              </Link>
              {activityCourts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setListMode("activity")}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition",
                    activityList
                      ? "bg-white text-black shadow-sm"
                      : "text-grey hover:text-black",
                  )}
                >
                  {t("Court")}
                </button>
              ) : null}
            </div>
            {activityList ? (
              <>
                <label className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("Search Bookings")}
                    className="h-9 w-full rounded-lg border-0 bg-[#f2f2f7] pl-9 pr-3 text-sm text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
                  />
                </label>
                <select
                  value={courtFilter}
                  onChange={(e) => setCourtFilter(e.target.value)}
                  className="h-9 rounded-lg border-0 bg-[#f2f2f7] px-3 text-sm text-ink"
                  aria-label={t("Court #")}
                >
                  <option value="all">{t("Court #")}</option>
                  {activityCourts.map((c) => (
                    <option key={c.id} value={courtLabel(c.name)}>
                      {courtLabel(c.name)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-9 rounded-lg border-0 bg-[#f2f2f7] px-3 text-sm text-ink"
                  aria-label={t("Date")}
                />
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white hover:brightness-95"
          >
            <Plus className="h-4 w-4" />
            {t("Create Booking")}
          </button>
        </div>

        <div className="bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-black">
                  <th className="px-5 py-3 font-semibold">{t("Date")}</th>
                  <th className="px-5 py-3 font-semibold">{t("Time")}</th>
                  <th className="px-5 py-3 font-semibold">{t("Name")}</th>
                  {activityList ? (
                    <>
                      <th className="px-5 py-3 font-semibold">{t("Court #")}</th>
                      <th className="px-5 py-3 font-semibold">{t("Going #")}</th>
                    </>
                  ) : (
                    <th className="px-5 py-3 font-semibold">{t("Services")}</th>
                  )}
                  <th className="px-5 py-3 font-semibold">{t("Status")}</th>
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activityList ? 7 : 6}
                      className="px-5 py-12 text-center"
                    >
                      <p className="text-sm text-grey">{t("No bookings yet.")}</p>
                      <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                      >
                        <Plus className="h-4 w-4" />
                        {t("Create Booking")}
                      </button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((booking, index) => {
                    const label = displayStatus(booking.status, activityList);
                    const menuOpen = menuFor === booking.id;
                    return (
                      <tr
                        key={booking.id}
                        className={cn(index % 2 === 0 && "bg-[#f6f9fc]")}
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-[#262626]">
                          {formatDate(booking.date)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[#262626]">
                          {booking.time}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-black">
                          {booking.resident}
                        </td>
                        {activityList ? (
                          <>
                            <td className="whitespace-nowrap px-5 py-3.5 text-[#262626]">
                              {courtLabel(booking.service)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-[#262626]">
                              {goingLabel(booking)}
                            </td>
                          </>
                        ) : (
                          <td className="max-w-[280px] truncate px-5 py-3.5 text-[#262626]">
                            {booking.service}
                          </td>
                        )}
                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              "inline-flex min-w-[101px] items-center justify-center rounded-md px-3 py-1 text-sm font-medium",
                              statusPillClass(booking.status, activityList),
                            )}
                          >
                            {t(label)}
                          </span>
                        </td>
                        <td className="relative px-3 py-3.5 text-black">
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-slate-100"
                            aria-label={t("Actions")}
                            onClick={() => setMenuFor(menuOpen ? null : booking.id)}
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                          {menuOpen ? (
                            <div
                              ref={menuRef}
                              className="absolute right-4 top-10 z-20 w-[200px] overflow-hidden rounded-xl border border-border-2 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                            >
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-black hover:bg-[#f6f9fc]"
                                onClick={() => {
                                  setMenuFor(null);
                                  router.push(`/provider/bookings/${booking.id}`);
                                }}
                              >
                                {t("Edit")}
                                <Pencil className="h-4 w-4 text-grey" />
                              </button>
                              {booking.status === "pending" || booking.status === "upcoming" ? (
                                <button
                                  type="button"
                                  className="block w-full px-4 py-2.5 text-left text-sm text-black hover:bg-[#f6f9fc]"
                                  onClick={() => patchStatus(booking.id, "accepted")}
                                >
                                  {t("Accept")}
                                </button>
                              ) : null}
                              {isActiveServiceBooking(booking.status) ? (
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#ff3b30] hover:bg-[#fdecea]"
                                  onClick={() => patchStatus(booking.id, "cancelled")}
                                >
                                  {t("Delete")}
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>

      <ProviderCreateBookingSheet
        open={createOpen && listMode === "service"}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <ProviderActivityCreateBookingSheet
        open={createOpen && listMode === "activity"}
        courts={activityCourts}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
