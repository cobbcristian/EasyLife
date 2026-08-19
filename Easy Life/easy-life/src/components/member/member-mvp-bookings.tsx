"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { imageForAmenity, imageForBookingRow } from "@/lib/brand-assets";
import { buildIcsEvent, downloadIcs } from "@/lib/calendar-ics";
import { useI18n } from "@/lib/i18n";
import {
  timeRangesOverlap,
  translateCapacityLabel,
  unitNoun,
} from "@/lib/scheduling";
import { formatCurrency, formatDate, isUpcomingItem } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { InviteMemberPicker, type InviteMember } from "@/components/ui/invite-member-picker";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import type { AmenityDTO, BookingDTO } from "@/lib/member-dtos";
import {
  COURT_ADDON_OPTIONS,
  lightsDefaultOn,
  type CourtAddonId,
} from "@/lib/weather";

function unitLabel(
  t: (key: string) => string,
  kind: string,
  unitNumber: number | null | undefined,
): string {
  if (unitNumber == null) return "";
  return ` · ${t(unitNoun(kind))} ${unitNumber}`;
}

type Props = {
  amenities: AmenityDTO[];
  initialBookings: BookingDTO[];
  initialAmenityId?: string;
};

/** Figma Activities / Create Booking sheet — member amenity bookings. */
export function MemberMvpBookings({
  amenities,
  initialBookings,
  initialAmenityId,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const profile = useSessionProfile();
  const [sheetOpen, setSheetOpen] = useState(Boolean(initialAmenityId));
  const [bookStep, setBookStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [amenityId, setAmenityId] = useState(
    initialAmenityId && amenities.some((a) => a.id === initialAmenityId)
      ? initialAmenityId
      : amenities[0]?.id ?? "",
  );
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [selectedInvitees, setSelectedInvitees] = useState<InviteMember[]>([]);
  const [inviteCapacity, setInviteCapacity] = useState("");
  const [slotOverlap, setSlotOverlap] = useState(0);
  const [fullyBooked, setFullyBooked] = useState(false);
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [unitOptions, setUnitOptions] = useState<
    Array<{ number: number; free: boolean }>
  >([]);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [windows, setWindows] = useState<
    Array<{ start: string; end: string; free: boolean; closedReason?: string | null }>
  >([]);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [closedWindows, setClosedWindows] = useState<
    Array<{ start: string; end: string; reason?: string }>
  >([]);
  const [weatherAlert, setWeatherAlert] = useState<string | null>(null);
  const [addons, setAddons] = useState<CourtAddonId[]>([]);

  const amenity = amenities.find((a) => a.id === amenityId) ?? amenities[0];
  const needsUnitPick = Boolean(amenity && amenity.unitCount > 1);
  const unitLabelNoun = amenity ? unitNoun(amenity.kind) : "Unit";
  const isCourtAmenity = amenity?.kind === "court";

  useEffect(() => {
    if (!isCourtAmenity) {
      setAddons([]);
      return;
    }
    setAddons((prev) => {
      const withoutLights = prev.filter((id) => id !== "lights");
      return lightsDefaultOn(start)
        ? [...withoutLights, "lights"]
        : withoutLights;
    });
  }, [isCourtAmenity, start]);

  const memberConflict = useMemo(
    () =>
      initialBookings.some(
        (b) =>
          b.date === date &&
          b.status !== "cancelled" &&
          timeRangesOverlap(start, end, b.startTime, b.endTime),
      ),
    [initialBookings, date, start, end],
  );

  const canFetchWindows = sheetOpen && Boolean(amenityId) && Boolean(date);
  const canCheckSlot = canFetchWindows && end > start;
  const windowsKey = canFetchWindows ? `${amenityId}|${date}` : "";
  const slotKey = canCheckSlot ? `${amenityId}|${date}|${start}|${end}` : "";
  const [windowsSourceKey, setWindowsSourceKey] = useState(windowsKey);
  const [slotSourceKey, setSlotSourceKey] = useState(slotKey);

  if (windowsKey !== windowsSourceKey) {
    setWindowsSourceKey(windowsKey);
    setWindows([]);
    setWeatherAlert(null);
  }
  if (slotKey !== slotSourceKey) {
    setSlotSourceKey(slotKey);
    setSelectedUnit(null);
    setUnitOptions([]);
    setClosedReason(null);
    if (!canCheckSlot) {
      setSlotOverlap(0);
      setFullyBooked(false);
      setCheckingSlot(false);
    } else {
      setCheckingSlot(true);
    }
  }

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!canFetchWindows) return;
    let cancelled = false;
    fetch(`/api/amenities/${amenityId}/availability?date=${encodeURIComponent(date)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setWindows(Array.isArray(d.windows) ? d.windows : []);
        setClosedWindows(Array.isArray(d.closedWindows) ? d.closedWindows : []);
        setWeatherAlert(
          typeof d.weatherAlert === "string" && d.weatherAlert.trim()
            ? d.weatherAlert.trim()
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setWindows([]);
          setClosedWindows([]);
          setWeatherAlert(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canFetchWindows, amenityId, date]);

  useEffect(() => {
    if (!canCheckSlot) return;
    let cancelled = false;
    const q = new URLSearchParams({ date, startTime: start, endTime: end });
    fetch(`/api/amenities/${amenityId}/availability?${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSlotOverlap(typeof d.unitsUsed === "number" ? d.unitsUsed : 0);
        setFullyBooked(!!d.fullyBooked);
        setClosedReason(
          typeof d.closedReason === "string" && d.closedReason.trim()
            ? d.closedReason.trim()
            : null,
        );
        setWeatherAlert(
          typeof d.weatherAlert === "string" && d.weatherAlert.trim()
            ? d.weatherAlert.trim()
            : typeof d.closedReason === "string" &&
                /rain|wet/i.test(d.closedReason)
              ? d.closedReason.trim()
              : null,
        );
        if (Array.isArray(d.closedWindows)) setClosedWindows(d.closedWindows);
        if (Array.isArray(d.windows)) setWindows(d.windows);
        const units: Array<{ number: number; free: boolean }> = Array.isArray(d.units)
          ? d.units
          : Array.isArray(d.freeUnits)
            ? (d.freeUnits as number[]).map((n) => ({ number: n, free: true }))
            : [];
        setUnitOptions(units);
        const firstFree = units.find((u) => u.free)?.number ?? null;
        setSelectedUnit((prev) => {
          if (prev != null && units.some((u) => u.number === prev && u.free)) {
            return prev;
          }
          return firstFree;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSlotOverlap(0);
          setFullyBooked(false);
          setClosedReason(null);
          setUnitOptions([]);
          setSelectedUnit(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingSlot(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canCheckSlot, amenityId, date, start, end]);

  async function cancel(id: string) {
    const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not cancel") });
      return;
    }
    toast({ variant: "info", title: t("Booking cancelled") });
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (bookStep < 5) {
      if (bookStep === 1 && !amenityId) return;
      if (bookStep === 2 && !start) return;
      if (bookStep === 3 && end <= start) {
        toast({
          variant: "warning",
          title: t("Invalid time"),
          description: t("End must be after start."),
        });
        return;
      }
      if (bookStep === 4 && needsUnitPick && selectedUnit == null) {
        toast({
          variant: "warning",
          title: t(`Select a ${unitLabelNoun.toLowerCase()}`),
        });
        return;
      }
      setBookStep((s) => Math.min(5, s + 1));
      return;
    }
    if (!amenity) return;
    if (end <= start) {
      toast({
        variant: "warning",
        title: t("Invalid time"),
        description: t("End must be after start."),
      });
      return;
    }
    if (memberConflict) {
      toast({
        variant: "warning",
        title: t("Schedule conflict"),
        description: t("You already have a booking during this time."),
      });
      return;
    }
    if (fullyBooked) {
      toast({ variant: "warning", title: t("Fully booked") });
      return;
    }
    if (needsUnitPick && selectedUnit == null) {
      toast({
        variant: "warning",
        title: t(`Select a ${unitLabelNoun.toLowerCase()}`),
        description: t("Choose an available option for this time."),
      });
      return;
    }
    setBusy(true);
    if (!amenity.playable) {
      setBusy(false);
      toast({
        variant: "warning",
        title: t("Not playable"),
        description: amenity.unplayableReason || t("This facility is temporarily closed."),
      });
      return;
    }
    const invitePayload = selectedInvitees.map((m) => ({
      email: m.email,
      name: m.name,
    }));
    const capParsed = inviteCapacity.trim()
      ? Number.parseInt(inviteCapacity, 10)
      : null;
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amenityId: amenity.id,
        amenity: amenity.name,
        date,
        startTime: start,
        endTime: end,
        unitNumber: needsUnitPick ? selectedUnit : null,
        inviteCapacity:
          capParsed != null && Number.isFinite(capParsed) && capParsed > 0
            ? capParsed
            : null,
        invites: invitePayload.length ? invitePayload : undefined,
        addons: isCourtAmenity ? addons : undefined,
      }),
    });
    if (!res.ok) {
      setBusy(false);
      const d = await res.json();
      toast({
        variant: "warning",
        title: t("Could not book"),
        description: d.error ?? t("Try again."),
      });
      return;
    }
    const created = await res.json();
    const bookingId = created?.booking?.id as string | undefined;
    const chargeId = created?.chargeId as string | undefined;
    const feeAmount = Number(created?.feeAmount ?? 0);
    const paymentRequired =
      Boolean(created?.paymentRequired) || Boolean(chargeId && feeAmount > 0);

    if (paymentRequired && chargeId) {
      const pay = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargeId,
          amount: feeAmount,
          description: `${amenity.name} booking — ${formatDate(date)}`,
          returnPath: bookingId
            ? `/member/reservations/${bookingId}?added=1`
            : "/member/bookings?paid=1",
        }),
      });
      const payData = await pay.json();
      if (pay.ok && payData.url) {
        window.location.href = payData.url;
        return;
      }
      if (pay.ok && payData.paid) {
        setBusy(false);
        setSheetOpen(false);
        if (bookingId) {
          router.push(`/member/reservations/${bookingId}?added=1`);
          router.refresh();
          return;
        }
        toast({
          variant: "success",
          title: t("Booking confirmed"),
          description: `${amenity.name} — ${formatCurrency(feeAmount)} paid.`,
        });
        router.refresh();
        return;
      }
      toast({
        variant: "info",
        title: t("Booking reserved"),
        description: t("Complete payment from Payments to confirm this booking."),
      });
      setBusy(false);
      setSheetOpen(false);
      if (bookingId) {
        router.push(`/member/reservations/${bookingId}?added=1`);
        router.refresh();
      }
      return;
    }

    setSelectedInvitees([]);
    setInviteCapacity("");
    setBusy(false);
    setSheetOpen(false);
    if (bookingId) {
      router.push(`/member/reservations/${bookingId}?added=1`);
      router.refresh();
      return;
    }
    router.refresh();
  }

  const clubAmenities = amenities.filter((a) => a.ownership !== "external");
  const externalAmenities = amenities.filter((a) => a.ownership === "external");
  const active = initialBookings.filter(
    (b) =>
      b.status !== "cancelled" &&
      isUpcomingItem(b.date, `${b.startTime}–${b.endTime}`),
  );
  const cancelled = initialBookings.filter((b) => b.status === "cancelled");

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-3xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
              {t("Member")}
            </p>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
              {t("Activities")}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setBookStep(1);
              setSheetOpen(true);
            }}
            className="inline-flex h-10 items-center rounded-full bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
          >
            {t("Book")}
          </button>
        </header>

        <div className="space-y-6 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <section>
            <h2 className="text-[15px] font-semibold text-ink">{t("Upcoming")}</h2>
            {active.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setBookStep(1);
                  setSheetOpen(true);
                }}
                className="mt-3 block w-full rounded-xl bg-[#F7F8FA] p-5 text-left"
              >
                <p className="text-[15px] font-semibold text-ink">{t("No bookings yet.")}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--mvp-blue)]">
                  {t("Book a court or amenity")} →
                </p>
              </button>
            ) : (
              <ul className="mt-3 divide-y divide-[#eceff3]">
                {active.map((b) => {
                  const a = amenities.find(
                    (x) => x.id === b.amenityId || x.name === b.amenity,
                  );
                  const title = a?.name ?? b.amenity;
                  return (
                    <li key={b.id} className="flex gap-3 py-3.5 first:pt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageForBookingRow(title)}
                        alt=""
                        className="h-[52px] w-[52px] shrink-0 rounded-[10px] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[15px] font-semibold leading-snug text-ink">
                            {t(title)}
                            {unitLabel(t, a?.kind ?? "facility", b.unitNumber)}
                          </p>
                          <span
                            className={`shrink-0 text-[12px] font-semibold ${
                              b.status === "confirmed"
                                ? "text-[var(--mvp-status-going)]"
                                : "text-[var(--mvp-status-pending)]"
                            }`}
                          >
                            {b.status === "confirmed" ? t("Reserved") : t("Pending")}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-grey">
                          {formatDate(b.date)} · {b.startTime} – {b.endTime}
                          {a && a.fee > 0 ? ` · ${formatCurrency(a.fee)}` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-3">
                          <Link
                            href={`/member/reservations/${b.id}`}
                            className="text-[12px] font-medium text-[var(--mvp-blue)]"
                          >
                            {t("Manage")}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              const ics = buildIcsEvent({
                                title: b.amenity,
                                date: b.date,
                                startTime: b.startTime,
                                endTime: b.endTime,
                              });
                              void downloadIcs(`${b.amenity}.ics`, ics).then(
                                (result) => {
                                  toast({
                                    variant: result.ok ? "success" : "warning",
                                    title: result.ok
                                      ? t("Added to calendar")
                                      : t("Could not add to calendar"),
                                    description:
                                      result.method === "native" ||
                                      result.method === "share"
                                        ? t("Choose Calendar to save this booking.")
                                        : undefined,
                                  });
                                },
                              );
                            }}
                            className="text-[12px] font-medium text-[var(--mvp-blue)]"
                          >
                            {t("Add to calendar")}
                          </button>
                          <button
                            type="button"
                            onClick={() => cancel(b.id)}
                            className="text-[12px] font-medium text-[#c45c5c]"
                          >
                            {t("Cancel")}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {cancelled.length > 0 ? (
            <section>
              <h2 className="text-[15px] font-semibold text-ink">{t("Cancelled")}</h2>
              <ul className="mt-3 divide-y divide-[#eceff3] opacity-70">
                {cancelled.map((b) => {
                  const a = amenities.find(
                    (x) => x.id === b.amenityId || x.name === b.amenity,
                  );
                  const title = a?.name ?? b.amenity;
                  return (
                  <li key={b.id} className="flex gap-3 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageForBookingRow(title)}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-[10px] object-cover grayscale"
                    />
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {t(title)}
                        {unitLabel(t, a?.kind ?? "facility", b.unitNumber)}
                      </p>
                      <p className="text-[12px] text-grey">
                        {formatDate(b.date)} · {b.startTime}
                      </p>
                    </div>
                  </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-[15px] font-semibold text-ink">{t("Club facilities")}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {clubAmenities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setAmenityId(a.id);
                    setBookStep(1);
                    setSheetOpen(true);
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4 text-left transition hover:border-[var(--mvp-blue)]/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageForAmenity(a.kind, a.name)}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{t(a.name)}</p>
                    <p className="mt-0.5 text-[11px] text-grey">
                      {!a.playable
                        ? t("Not playable")
                        : `${formatCurrency(a.fee)} · ${translateCapacityLabel(t, a.kind, a.unitCount, a.holes, a.surface)}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {externalAmenities.length > 0 ? (
            <section>
              <h2 className="text-[15px] font-semibold text-ink">
                {t("Partner activities")}
              </h2>
              <p className="mt-1 text-[12px] text-grey">
                {t("Rentals and outings not owned by the club — jet skis, boats, and more.")}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {externalAmenities.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setAmenityId(a.id);
                      setBookStep(1);
                    setSheetOpen(true);
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4 text-left transition hover:border-[var(--mvp-blue)]/40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageForAmenity(a.kind, a.name)}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{t(a.name)}</p>
                      <p className="mt-0.5 text-[11px] text-grey">
                        {a.partnerName ? `${a.partnerName} · ` : ""}
                        {formatCurrency(a.fee)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6">
          <button
            type="button"
            aria-label={t("Close")}
            className="absolute inset-0"
            onClick={() => setSheetOpen(false)}
          />
          <form
            onSubmit={handleCreate}
            className="relative z-10 flex max-h-[min(92dvh,92vh)] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:rounded-3xl"
          >
            <div className="flex shrink-0 justify-center pt-3 md:hidden">
              <span className="h-1.5 w-12 rounded-full bg-[#d8dde5]" />
            </div>
            <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-grey">
                  {t("Step")} {bookStep} / 5
                </p>
                <h2 className="text-lg font-semibold text-ink">
                  {bookStep === 1
                    ? t("Reserve a court")
                    : bookStep === 2
                      ? t("Start time")
                      : bookStep === 3
                        ? t("End time")
                        : bookStep === 4
                          ? t("Invite members")
                          : t("Confirm reservation")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  setBookStep(1);
                }}
                className="text-sm font-medium text-grey"
              >
                {t("Close")}
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-5 pb-10 pt-2">
              {bookStep === 1 ? (
                <>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-grey">
                  {t("Facility")}
                </span>
                <select
                  value={amenityId}
                  onChange={(e) => setAmenityId(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm font-medium text-ink outline-none focus:border-[var(--mvp-blue)]"
                >
                  <optgroup label={t("Club facilities")}>
                    {clubAmenities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {t(a.name)}
                        {!a.playable ? ` (${t("Not playable")})` : ""}
                      </option>
                    ))}
                  </optgroup>
                  {externalAmenities.length > 0 ? (
                    <optgroup label={t("Partner activities")}>
                      {externalAmenities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {t(a.name)}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>

              {amenity ? (
                <div className="flex gap-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageForAmenity(amenity.kind, amenity.name)}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-ink">{t(amenity.name)}</p>
                    <p className="mt-0.5 text-[12px] text-grey">
                      {amenity.schedule ? `${amenity.schedule} · ` : ""}
                      {formatCurrency(amenity.fee)}
                    </p>
                  </div>
                </div>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-grey">
                  {t("Date")}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]"
                />
              </label>
                </>
              ) : null}

              {bookStep === 2 ? (
                <>
              {windows.length > 0 ? (
                <div>
                  <p className="mb-2 text-[12px] font-medium text-grey">
                    {t("Available windows")}
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {windows.map((w) => {
                      const selected = start === w.start;
                      const closed = Boolean(w.closedReason);
                      return (
                        <button
                          key={`${w.start}-${w.end}`}
                          type="button"
                          disabled={!w.free}
                          title={w.closedReason ?? undefined}
                          onClick={() => {
                            setStart(w.start);
                            if (end <= w.start) setEnd(w.end);
                          }}
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                            selected
                              ? "bg-[var(--mvp-blue)] text-white"
                              : w.free
                                ? "bg-[#e8f4fc] text-[var(--mvp-blue)]"
                                : closed
                                  ? "cursor-not-allowed bg-[#fff4e8] text-[#c4914a] line-through"
                                  : "cursor-not-allowed bg-[#f2f2f7] text-[#c4c4c4] line-through"
                          }`}
                        >
                          {w.start}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-grey">
                  {t("Start")}
                </span>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-3 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]"
                />
              </label>
              {weatherAlert ? (
                <div className="rounded-2xl border border-[#f0d0d0] bg-[#fff4f0] px-3.5 py-3 text-[12px] font-medium text-[#c45c5c]">
                  {t(weatherAlert)}
                </div>
              ) : null}
                </>
              ) : null}

              {bookStep === 3 ? (
                <>
              <p className="text-sm text-grey">
                {t("Starting at")} <span className="font-semibold text-ink">{start}</span>
              </p>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-grey">
                  {t("End")}
                </span>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-3 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]"
                />
              </label>
              {windows
                .filter((w) => w.start === start && w.free)
                .map((w) => (
                  <button
                    key={`end-${w.end}`}
                    type="button"
                    onClick={() => setEnd(w.end)}
                    className="rounded-full bg-[#e8f4fc] px-3 py-1.5 text-[12px] font-semibold text-[var(--mvp-blue)]"
                  >
                    {t("Use window end")} {w.end}
                  </button>
                ))}
              {end > start ? (
                <p className="text-[12px] text-grey">
                  {t("Duration")}: {start}–{end}
                </p>
              ) : null}
                </>
              ) : null}

              {bookStep === 4 ? (
                <>
              {needsUnitPick ? (
                <div>
                  <p className="mb-2 text-[12px] font-medium text-grey">
                    {t(unitLabelNoun)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(unitOptions.length > 0
                      ? unitOptions
                      : Array.from({ length: amenity?.unitCount ?? 0 }, (_, i) => ({
                          number: i + 1,
                          free: !checkingSlot && !fullyBooked,
                        }))
                    ).map((u) => {
                      const selected = selectedUnit === u.number;
                      return (
                        <button
                          key={u.number}
                          type="button"
                          disabled={!u.free || checkingSlot || fullyBooked}
                          onClick={() => setSelectedUnit(u.number)}
                          className={`rounded-full px-3.5 py-2 text-[12px] font-semibold transition ${
                            selected
                              ? "bg-[var(--mvp-blue)] text-white"
                              : u.free
                                ? "bg-[#e8f4fc] text-[var(--mvp-blue)]"
                                : "cursor-not-allowed bg-[#f2f2f7] text-[#c4c4c4] line-through"
                          }`}
                        >
                          {t(unitLabelNoun)} {u.number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {isCourtAmenity ? (
                <fieldset>
                  <legend className="mb-2 text-[12px] font-medium text-grey">
                    {t("Add-ons")}
                  </legend>
                  <div className="space-y-2 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-3.5 py-3">
                    {COURT_ADDON_OPTIONS.map((opt) => {
                      const checked = addons.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className="flex cursor-pointer items-center gap-3 text-sm text-ink"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setAddons((prev) =>
                                prev.includes(opt.id)
                                  ? prev.filter((id) => id !== opt.id)
                                  : [...prev, opt.id],
                              );
                            }}
                            className="h-4 w-4 rounded border-[#c5ccd6] text-[var(--mvp-blue)] focus:ring-[var(--mvp-blue)]"
                          />
                          <span>
                            {t(opt.label)}
                            {opt.id === "lights" && lightsDefaultOn(start) ? (
                              <span className="ml-1.5 text-[11px] font-medium text-grey">
                                ({t("auto for evening")})
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              <InviteMemberPicker
                label={t("Invite members")}
                placeholder={t("Invite Members")}
                selected={selectedInvitees}
                onChange={setSelectedInvitees}
                excludeEmail={profile.email}
              />
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-grey">
                  {t("Party spots (optional)")}
                </span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={inviteCapacity}
                  onChange={(e) => setInviteCapacity(e.target.value)}
                  placeholder={t("e.g. 8 — first to accept get in")}
                  className="h-12 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]"
                />
              </label>
                </>
              ) : null}

              {bookStep === 5 && amenity ? (
                <div className="overflow-hidden rounded-2xl border border-[#e8ebf0] bg-white shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageForAmenity(amenity.kind, amenity.name)}
                    alt=""
                    className="h-36 w-full object-cover"
                  />
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#f99f25]">
                        {t("Confirmation")}
                      </p>
                      <p className="mt-1 text-[17px] font-semibold text-ink">
                        {t(amenity.name)}
                        {selectedUnit != null
                          ? ` · ${t(unitLabelNoun)} ${selectedUnit}`
                          : ""}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#fafbfc] px-3 py-2.5 text-sm text-ink">
                      <p className="font-medium">{formatDate(date)}</p>
                      <p className="mt-0.5 text-grey">
                        {start}–{end}
                      </p>
                    </div>
                    {isCourtAmenity && addons.length > 0 ? (
                      <p className="text-[12px] text-grey">
                        {t("Add-ons")}:{" "}
                        {addons
                          .map(
                            (id) =>
                              COURT_ADDON_OPTIONS.find((o) => o.id === id)?.label ??
                              id,
                          )
                          .join(", ")}
                      </p>
                    ) : null}
                    {selectedInvitees.length > 0 ? (
                      <div>
                        <p className="text-[12px] font-medium text-grey">
                          {t("Invited Members")} ({selectedInvitees.length})
                          {inviteCapacity ? ` · ${t("cap")} ${inviteCapacity}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedInvitees.map((m) => (
                            <span
                              key={m.email}
                              className="rounded-full bg-[#e8f4fc] px-2.5 py-1 text-[11px] font-semibold text-[var(--mvp-blue)]"
                            >
                              {m.name.split(" ")[0] ?? m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-grey">{t("No invites yet")}</p>
                    )}
                    <div className="flex items-center justify-between border-t border-[#eceff3] pt-3">
                      <span className="text-sm text-grey">{t("Total")}</span>
                      <span className="text-[15px] font-semibold text-ink">
                        {amenity.fee > 0 ? formatCurrency(amenity.fee) : t("Free")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {amenity && !amenity.playable ? (
                <p className="rounded-xl bg-[#fff4f0] px-3 py-2 text-[12px] font-medium text-[#c45c5c]">
                  {amenity.unplayableReason || t("This facility is not playable right now.")}
                </p>
              ) : null}

              {bookStep >= 3 && (fullyBooked || memberConflict || closedReason) ? (
                <p className="rounded-xl bg-[#fff4f0] px-3 py-2 text-[12px] font-medium text-[#c45c5c]">
                  {closedReason
                    ? closedReason
                    : fullyBooked
                      ? t("Fully booked")
                      : t("You already have a booking during this time.")}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-3 border-t border-[#eceff3] bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  if (bookStep <= 1) {
                    setSheetOpen(false);
                    setBookStep(1);
                  } else {
                    setBookStep((s) => s - 1);
                  }
                }}
                className="h-12 flex-1 rounded-2xl text-sm font-semibold text-grey"
              >
                {bookStep <= 1 ? t("Cancel") : t("Back")}
              </button>
              <button
                type="submit"
                disabled={
                  busy ||
                  !amenity ||
                  !amenity.playable ||
                  (bookStep >= 3 &&
                    (fullyBooked || memberConflict || checkingSlot || end <= start)) ||
                  (bookStep === 4 && needsUnitPick && selectedUnit == null) ||
                  (bookStep === 5 &&
                    (fullyBooked ||
                      memberConflict ||
                      checkingSlot ||
                      end <= start ||
                      (needsUnitPick && selectedUnit == null)))
                }
                className="h-12 flex-[1.4] rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? t("Booking...")
                  : bookStep < 5
                    ? t("Next")
                    : t("Confirm")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
