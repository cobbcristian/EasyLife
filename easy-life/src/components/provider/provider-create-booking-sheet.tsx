"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { InviteMemberPicker, type InviteMember } from "@/components/ui/invite-member-picker";
import { useI18n } from "@/lib/i18n";
import { CLEANING_SERVICE_CATALOG } from "@/lib/provider-offerings";
import { cn } from "@/lib/utils";

export interface CreateBookingPayload {
  resident: string;
  description: string;
  services: string[];
  address: string;
  date: string;
  time: string;
  endTime?: string;
  invitee: string | null;
  invitees?: Array<{ email: string; name: string }>;
}

const fieldClass =
  "h-[57px] w-full rounded-lg border border-border-2 bg-white px-7 text-[15px] text-[var(--mvp-blue)] placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

/** Figma Booking Entry Sheet (4616:14778) — Create Booking. */
export function ProviderCreateBookingSheet({
  open,
  onClose,
  onCreate,
  defaultResident,
  defaultDescription,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateBookingPayload) => void | Promise<void>;
  defaultResident?: string;
  defaultDescription?: string;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(defaultResident || "");
  const [description, setDescription] = useState(defaultDescription || "");
  const [services, setServices] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [selectedInvitees, setSelectedInvitees] = useState<InviteMember[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(defaultResident || "");
    setDescription(defaultDescription || "");
  }, [open, defaultResident, defaultDescription]);

  const offerings = useMemo(
    () => CLEANING_SERVICE_CATALOG.filter((o) =>
      ["Full House Cleaning", "Carpet Cleaning"].includes(o.name),
    ),
    [],
  );

  if (!open) return null;

  function reset() {
    setName(defaultResident || "");
    setDescription(defaultDescription || "");
    setServices([]);
    setAddress("");
    setDate(new Date().toISOString().slice(0, 10));
    setTime("10:00");
    setEndTime("12:00");
    setSelectedInvitees([]);
  }

  function toggleService(serviceName: string) {
    setServices((prev) =>
      prev.includes(serviceName)
        ? prev.filter((s) => s !== serviceName)
        : [...prev, serviceName],
    );
  }

  async function handleCreate() {
    if (!name.trim() || services.length === 0 || submitting) return;
    if (endTime <= time) return;
    setSubmitting(true);
    try {
      await onCreate({
        resident: name.trim(),
        description: description.trim(),
        services,
        address: address.trim() || "Contact for address",
        date,
        time: formatTimeLabel(time),
        endTime: formatTimeLabel(endTime),
        invitee: selectedInvitees[0]?.name ?? null,
        invitees: selectedInvitees.map((m) => ({ email: m.email, name: m.name })),
      });
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete() {
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-[family-name:var(--font-poppins)]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-booking-title"
        className="relative flex max-h-[90vh] w-full max-w-[850px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-5">
          <h2 id="create-booking-title" className="flex-1 text-center text-lg font-semibold text-black">
            {t("Create Booking")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 rounded-md p-1 text-grey hover:bg-slate-100"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-8 py-6 sm:px-14">
          <input
            className={fieldClass}
            placeholder={t("Booking Name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <textarea
            className="min-h-[173px] w-full resize-none rounded-lg border border-border-2 bg-white px-7 py-5 text-[15px] text-[var(--mvp-blue)] placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            placeholder={t("Description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-black">{t("Service Type")}</p>
            <div className="rounded-xl bg-[#f2f2f7] px-4 py-3 shadow-sm">
              {offerings.map((offering) => {
                const selected = services.includes(offering.name);
                return (
                  <button
                    key={offering.id}
                    type="button"
                    onClick={() => toggleService(offering.name)}
                    className="flex w-full items-center justify-between py-2.5 text-left text-[15px] text-black"
                  >
                    {offering.name}
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border text-[11px]",
                        selected
                          ? "border-[var(--mvp-blue)] bg-[var(--mvp-blue)] text-white"
                          : "border-[#c7c7cc] bg-white",
                      )}
                    >
                      {selected ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <input
            className={fieldClass}
            placeholder={t("Address")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-3 text-sm text-black">
              <span className="w-12 shrink-0 font-medium">{t("Date")}</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 w-[170px] rounded-md border border-[var(--mvp-blue)] px-3 text-sm text-[var(--mvp-blue)]"
              />
            </label>
            <label className="flex items-center gap-3 text-sm text-black">
              <span className="w-12 shrink-0 font-medium">{t("Start")}</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-8 w-[140px] rounded-md border border-[var(--mvp-blue)] px-3 text-sm text-[var(--mvp-blue)]"
              />
            </label>
            <label className="flex items-center gap-3 text-sm text-black">
              <span className="w-12 shrink-0 font-medium">{t("End")}</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-8 w-[140px] rounded-md border border-[var(--mvp-blue)] px-3 text-sm text-[var(--mvp-blue)]"
              />
            </label>
          </div>
          {endTime <= time ? (
            <p className="text-sm font-medium text-[#ff3b30]">
              {t("End must be after start.")}
            </p>
          ) : null}

          <InviteMemberPicker
            label={t("Service Appointment Invite")}
            placeholder={t("Invite Members")}
            selected={selectedInvitees}
            onChange={setSelectedInvitees}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={handleDelete}
            className="h-[50px] min-w-[120px] px-6 text-base font-medium text-grey hover:text-ink"
          >
            {t("Delete")}
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!name.trim() || services.length === 0 || endTime <= time || submitting}
            className="h-[50px] min-w-[201px] rounded-lg bg-[var(--mvp-blue)] px-8 text-base font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("Create")}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTimeLabel(value: string): string {
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = mRaw ?? "00";
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${suffix}`;
}
