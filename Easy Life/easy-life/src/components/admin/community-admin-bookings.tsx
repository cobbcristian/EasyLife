"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, MoreHorizontal, Search, X } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import type { ServiceBooking, ServiceBookingStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

function displayStatus(
  status: ServiceBookingStatus,
): "Pending" | "Accepted" | "Cancelled" | "Completed" {
  switch (status) {
    case "pending":
    case "upcoming":
      return "Pending";
    case "accepted":
      return "Accepted";
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

function statusPillClass(status: ServiceBookingStatus): string {
  const label = displayStatus(status);
  switch (label) {
    case "Pending":
      return "bg-[#f99f25] text-white";
    case "Accepted":
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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Figma Community Admin View All Bookings (5467:13182). */
export function CommunityAdminBookings({
  communityName,
  communityId,
  bookings: initialBookings,
  avatarName,
}: {
  communityName: string;
  communityId: string;
  bookings: ServiceBooking[];
  avatarName?: string;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState(initialBookings);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [query, setQuery] = useState("");
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRows(initialBookings);
  }, [initialBookings]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFor(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((b) => {
      if (dayFilter && b.date !== dayFilter) return false;
      if (!q) return true;
      return (
        b.resident.toLowerCase().includes(q) ||
        b.provider.toLowerCase().includes(q) ||
        b.service.toLowerCase().includes(q) ||
        displayStatus(b.status).toLowerCase().includes(q)
      );
    });
  }, [rows, query, dayFilter]);

  const byDate = useMemo(() => {
    const map = new Map<string, ServiceBooking[]>();
    for (const b of rows) {
      const list = map.get(b.date) ?? [];
      list.push(b);
      map.set(b.date, list);
    }
    return map;
  }, [rows]);

  const calendarDays = useMemo(() => {
    const first = startOfMonth(month);
    const startPad = first.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  async function setStatus(id: string, status: ServiceBookingStatus) {
    setBusyId(id);
    setMenuFor(null);
    const res = await fetch("/api/admin/service-bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not update booking") });
      return;
    }
    setRows((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    toast({
      variant: "success",
      title: t("Booking updated"),
      description: t(displayStatus(status)),
    });
  }

  function openDay(key: string) {
    setDayFilter(key);
    setView("list");
    setQuery("");
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader
        title={t("Bookings")}
        backHref={`/communities/${communityId}`}
        right="avatar"
        avatarName={avatarName}
      />
      <PageBody>
        <p className="mb-4 text-sm text-grey">{communityName}</p>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-[#f2f2f7] p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition",
                view === "list"
                  ? "bg-white text-black shadow-sm"
                  : "text-grey hover:text-black",
              )}
            >
              {t("List")}
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition",
                view === "calendar"
                  ? "bg-white text-black shadow-sm"
                  : "text-grey hover:text-black",
              )}
            >
              {t("Calendar")}
            </button>
          </div>
          <label className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search Bookings")}
              className="h-10 w-full rounded-lg border-0 bg-[#f2f2f7] pl-10 pr-3 text-sm text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />
          </label>
          {dayFilter ? (
            <button
              type="button"
              onClick={() => setDayFilter(null)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)]/10 px-3 text-sm font-semibold text-[var(--mvp-blue)]"
            >
              {formatDate(dayFilter)}
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {view === "calendar" ? (
          <div className="rounded-xl border border-border-2 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                className="text-sm font-semibold text-[var(--mvp-blue)]"
                onClick={() => setMonth((m) => addMonths(m, -1))}
              >
                {t("Prev")}
              </button>
              <p className="text-[15px] font-semibold text-ink">{monthLabel}</p>
              <button
                type="button"
                className="text-sm font-semibold text-[var(--mvp-blue)]"
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                {t("Next")}
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-grey">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="min-h-[88px]" />;
                const key = toDateKey(day);
                const dayBookings = byDate.get(key) ?? [];
                const isToday = toDateKey(new Date()) === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openDay(key)}
                    className={cn(
                      "min-h-[88px] rounded-lg border border-border-2 p-1.5 text-left transition hover:border-[var(--mvp-blue)]/50 hover:bg-[#f6f9fc]",
                      isToday && "border-[var(--mvp-blue)]",
                      dayFilter === key && "bg-[#e8f4fc]",
                    )}
                  >
                    <p
                      className={cn(
                        "mb-1 text-xs font-semibold",
                        isToday ? "text-[var(--mvp-blue)]" : "text-ink",
                      )}
                    >
                      {day.getDate()}
                    </p>
                    <div className="space-y-1">
                      {dayBookings.slice(0, 2).map((b) => (
                        <p
                          key={b.id}
                          className="truncate rounded bg-[var(--mvp-blue)]/10 px-1 py-0.5 text-[10px] font-medium text-[var(--mvp-blue)]"
                          title={`${b.time} · ${b.resident}`}
                        >
                          {b.time} {b.resident}
                        </p>
                      ))}
                      {dayBookings.length > 2 ? (
                        <p className="text-[10px] text-grey">+{dayBookings.length - 2}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="text-black">
                    <th className="px-5 py-3 font-semibold">{t("Date")}</th>
                    <th className="px-5 py-3 font-semibold">{t("Time")}</th>
                    <th className="px-5 py-3 font-semibold">{t("Resident")}</th>
                    <th className="px-5 py-3 font-semibold">{t("Activity or Service")}</th>
                    <th className="px-5 py-3 font-semibold">{t("Status")}</th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center">
                        <p className="text-sm text-grey">
                          {dayFilter
                            ? t("No bookings on this day.")
                            : t("No bookings yet.")}
                        </p>
                        {dayFilter ? (
                          <button
                            type="button"
                            onClick={() => setDayFilter(null)}
                            className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
                          >
                            {t("Clear day filter")} →
                          </button>
                        ) : (
                          <>
                            <p className="mt-2 text-sm text-grey">
                              {t("Bookings from members and providers appear here.")}
                            </p>
                            <a
                              href="/member/bookings"
                              className="mt-3 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                            >
                              {t("Open member bookings")}
                            </a>
                          </>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((booking, index) => {
                      const label = displayStatus(booking.status);
                      const open = menuFor === booking.id;
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
                          <td className="max-w-[280px] truncate px-5 py-3.5 text-[#262626]">
                            {booking.provider || booking.service}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={cn(
                                "inline-flex min-w-[101px] items-center justify-center rounded-md px-3 py-1 text-sm font-medium",
                                statusPillClass(booking.status),
                              )}
                            >
                              {t(label)}
                            </span>
                          </td>
                          <td className="relative px-3 py-3.5 text-black">
                            <button
                              type="button"
                              className="rounded p-1 hover:bg-slate-100 disabled:opacity-40"
                              aria-label={t("Actions")}
                              disabled={busyId === booking.id}
                              onClick={() =>
                                setMenuFor((id) => (id === booking.id ? null : booking.id))
                              }
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                            {open ? (
                              <div
                                ref={menuRef}
                                className="absolute right-3 top-10 z-20 w-44 overflow-hidden rounded-xl border border-border-2 bg-white py-1 shadow-lg"
                              >
                                {booking.status !== "accepted" ? (
                                  <button
                                    type="button"
                                    onClick={() => void setStatus(booking.id, "accepted")}
                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#f6f9fc]"
                                  >
                                    <Check className="h-4 w-4 text-[var(--mvp-status-going)]" />
                                    {t("Accept")}
                                  </button>
                                ) : null}
                                {booking.status !== "completed" ? (
                                  <button
                                    type="button"
                                    onClick={() => void setStatus(booking.id, "completed")}
                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#f6f9fc]"
                                  >
                                    {t("Mark completed")}
                                  </button>
                                ) : null}
                                {booking.status !== "cancelled" ? (
                                  <button
                                    type="button"
                                    onClick={() => void setStatus(booking.id, "cancelled")}
                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#ff3b30] hover:bg-[#fdecea]"
                                  >
                                    {t("Cancel")}
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
        )}
      </PageBody>
    </div>
  );
}
