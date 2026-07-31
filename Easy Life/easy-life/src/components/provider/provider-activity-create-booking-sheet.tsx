"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { InviteMemberPicker, type InviteMember } from "@/components/ui/invite-member-picker";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SLOT_TIMES = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
] as const;

export type ActivityCreateBookingPayload = {
  resident: string;
  description: string;
  services: string[];
  address: string;
  date: string;
  time: string;
  endTime?: string;
  invitee: string | null;
  invitees?: Array<{ email: string; name: string }>;
  goingCount?: number;
};

type CourtRow = {
  id: string;
  name: string;
  /** Slots already taken for the selected day. */
  bookedSlots?: string[];
};

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

function weekdayLong(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** Figma Activity Booking — Create Booking (5687:6964). */
export function ProviderActivityCreateBookingSheet({
  open,
  onClose,
  onCreate,
  courts,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: ActivityCreateBookingPayload) => void;
  courts: CourtRow[];
}) {
  const { t } = useI18n();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [picked, setPicked] = useState<{ courtId: string; slot: string } | null>(
    null,
  );
  const [resident, setResident] = useState("");
  const [selectedInvitees, setSelectedInvitees] = useState<InviteMember[]>([]);
  const [partySpots, setPartySpots] = useState("");

  const courtList = courts.length
    ? courts
    : Array.from({ length: 4 }, (_, i) => ({
        id: `court-${i + 1}`,
        name: `Court #${i + 1}`,
        bookedSlots: i === 0 ? ["10:00 AM"] : [],
      }));

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

  const monthLabel = month.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  if (!open) return null;

  function handleCreate() {
    if (!picked || !resident.trim()) return;
    const court = courtList.find((c) => c.id === picked.courtId);
    const dateKey = toDateKey(selectedDay);
    const slotIdx = SLOT_TIMES.indexOf(picked.slot as (typeof SLOT_TIMES)[number]);
    const endTime =
      slotIdx >= 0 && slotIdx < SLOT_TIMES.length - 1
        ? SLOT_TIMES[slotIdx + 1]
        : undefined;
    const invitees = selectedInvitees.map((m) => ({
      email: m.email,
      name: m.name,
    }));
    const cap = partySpots.trim() ? Number.parseInt(partySpots, 10) : NaN;
    const goingCount =
      Number.isFinite(cap) && cap > 0
        ? Math.min(cap, 1 + invitees.length)
        : 1 + invitees.length;
    onCreate({
      resident: resident.trim(),
      description: `${court?.name ?? "Court"} · ${picked.slot}`,
      services: [court?.name ?? "Court"],
      address: "",
      date: dateKey,
      time: picked.slot,
      endTime,
      invitee: invitees[0]?.name ?? null,
      invitees: invitees.length ? invitees : undefined,
      goingCount,
    });
    setPicked(null);
    setResident("");
    setSelectedInvitees([]);
    setPartySpots("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-[family-name:var(--font-poppins)]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-create-booking-title"
        className="relative flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border-2 px-6 py-4">
          <h2
            id="activity-create-booking-title"
            className="flex-1 text-center text-lg font-semibold text-black"
          >
            {t("Create Booking")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-4 rounded-md p-1 text-grey hover:bg-slate-100"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 sm:px-10">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="rounded p-1 text-[var(--mvp-blue)] hover:bg-[#f2f2f7]"
                onClick={() => setMonth((m) => addMonths(m, -1))}
                aria-label={t("Prev")}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <p className="text-[15px] font-semibold text-ink">{monthLabel}</p>
              <button
                type="button"
                className="rounded p-1 text-[var(--mvp-blue)] hover:bg-[#f2f2f7]"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                aria-label={t("Next")}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-grey">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} className="h-10" />;
                const key = toDateKey(day);
                const selected = toDateKey(selectedDay) === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDay(day);
                      setPicked(null);
                    }}
                    className={cn(
                      "flex h-10 items-center justify-center text-sm font-medium text-ink",
                      selected &&
                        "border-b-2 border-[var(--mvp-blue)] text-[var(--mvp-blue)]",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-sm font-medium text-ink">
              {weekdayLong(selectedDay)}
            </p>
          </div>

          <div className="space-y-5">
            {courtList.map((court) => {
              const booked = new Set(court.bookedSlots ?? []);
              return (
                <div key={court.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-black">{court.name}</p>
                    <span className="text-sm text-grey">{t("Free")}</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {SLOT_TIMES.map((slot) => {
                      const isBooked = booked.has(slot);
                      const isSelected =
                        picked?.courtId === court.id && picked.slot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setPicked({ courtId: court.id, slot })}
                          className={cn(
                            "shrink-0 rounded-lg border px-3 py-2 text-[13px] font-medium transition",
                            isBooked &&
                              "cursor-not-allowed border-transparent bg-[#e5e5ea] text-[#8e8e93]",
                            !isBooked &&
                              !isSelected &&
                              "border-[var(--mvp-blue)] bg-white text-[var(--mvp-blue)] hover:bg-[var(--mvp-blue)]/5",
                            isSelected &&
                              "border-[var(--mvp-blue)] bg-[var(--mvp-blue)] text-white",
                          )}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <input
            className="h-[52px] w-full rounded-lg border border-border-2 px-4 text-[15px] placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            placeholder={t("Booking Name")}
            value={resident}
            onChange={(e) => setResident(e.target.value)}
          />
          <InviteMemberPicker
            label={t("Invite members")}
            placeholder={t("Search members…")}
            selected={selectedInvitees}
            onChange={setSelectedInvitees}
          />
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-grey">
              {t("Party spots (optional)")}
            </label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={partySpots}
              onChange={(e) => setPartySpots(e.target.value)}
              placeholder={t("e.g. 8 — first to accept get in")}
              className="h-[52px] w-full rounded-lg border border-border-2 px-4 text-[15px] placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />
            <p className="mt-1 text-[11px] text-grey">
              {t("Going # counts the host plus accepted invitees for this court booking.")}
            </p>
          </div>
        </div>

        <div className="border-t border-border-2 px-6 py-4">
          <button
            type="button"
            disabled={!picked || !resident.trim()}
            onClick={handleCreate}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white disabled:bg-[#e5e5ea] disabled:text-[#aeaeb2]"
          >
            {t("Create Booking")}
          </button>
        </div>
      </div>
    </div>
  );
}
