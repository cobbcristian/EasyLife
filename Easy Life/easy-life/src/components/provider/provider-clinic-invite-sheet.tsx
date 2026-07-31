"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  InviteMemberPicker,
  type InviteMember,
} from "@/components/ui/invite-member-picker";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-[50px] w-full rounded-lg border border-border-2 bg-white px-4 text-[15px] text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

const SPORTS = [
  { id: "tennis", label: "Tennis" },
  { id: "golf", label: "Golf" },
  { id: "bocce", label: "Bocce" },
  { id: "pickleball", label: "Pickleball" },
] as const;

/** Pro clinic invite: payment, RSVP, cap, recurrence, non-member 2×. */
export function ProviderClinicInviteSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [title, setTitle] = useState("Morning Clinic");
  const [description, setDescription] = useState("");
  const [sport, setSport] = useState<(typeof SPORTS)[number]["id"]>("tennis");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:30");
  const [capacity, setCapacity] = useState("8");
  const [requirePayment, setRequirePayment] = useState(true);
  const [fee, setFee] = useState("45");
  const [repeatWeeks, setRepeatWeeks] = useState("0");
  const [invites, setInvites] = useState<InviteMember[]>([]);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleCreate() {
    if (!title.trim() || !date || !start || !end) return;
    setLoading(true);
    try {
      const memberFeeCents = Math.round(Number.parseFloat(fee || "0") * 100);
      const res = await fetch("/api/provider/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          sport,
          location: location.trim(),
          date,
          startTime: start,
          endTime: end,
          capacity: capacity ? Number.parseInt(capacity, 10) : null,
          requirePayment,
          memberFeeCents: requirePayment ? memberFeeCents : 0,
          repeatWeeks: Number.parseInt(repeatWeeks, 10) || 0,
          invites: invites.map((i) => ({ email: i.email, name: i.name })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: t("Could not send clinic invite"),
          description: data.error,
        });
        setLoading(false);
        return;
      }
      toast({
        variant: "success",
        title: t("Clinic invites sent"),
        description: t("{{count}} session(s) · {{invites}} invited")
          .replace("{{count}}", String(data.clinics?.length ?? 1))
          .replace("{{invites}}", String(invites.length)),
      });
      onCreated?.();
      onClose();
    } catch {
      toast({ variant: "warning", title: t("Something went wrong") });
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 font-[family-name:var(--font-poppins)] sm:items-center">
      <button type="button" className="absolute inset-0" aria-label={t("Close")} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clinic-invite-title"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="clinic-invite-title" className="text-lg font-semibold text-ink">
              {t("Invite to clinic")}
            </h2>
            <p className="mt-1 text-[12px] text-grey">
              {t(
                "Email invites with Going / Not going, optional payment, guest 2× rate, capacity, and weekly recurrence.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-grey hover:bg-[#f2f4f7]"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            className={fieldClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("Clinic name")}
          />
          <textarea
            className="min-h-[88px] w-full resize-none rounded-lg border border-border-2 px-4 py-3 text-[14px] placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("What players should know")}
          />

          <div className="flex flex-wrap gap-2">
            {SPORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSport(s.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1",
                  sport === s.id
                    ? "bg-[var(--mvp-blue)] text-white ring-[var(--mvp-blue)]"
                    : "bg-white text-ink ring-[#e4e8ee]",
                )}
              >
                {t(s.label)}
              </button>
            ))}
          </div>

          <input
            className={fieldClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("Location (court / range / bocce lawn)")}
          />

          <div className="grid grid-cols-3 gap-2">
            <label className="text-[12px] text-grey">
              {t("Date")}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border-2 px-2 text-sm"
              />
            </label>
            <label className="text-[12px] text-grey">
              {t("Start")}
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border-2 px-2 text-sm"
              />
            </label>
            <label className="text-[12px] text-grey">
              {t("End")}
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border-2 px-2 text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-grey">
              {t("Player cap")}
              <input
                value={capacity}
                onChange={(e) => setCapacity(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="8"
                className="mt-1 h-10 w-full rounded-lg border border-border-2 px-3 text-sm"
              />
            </label>
            <label className="text-[12px] text-grey">
              {t("Repeat weekly")}
              <select
                value={repeatWeeks}
                onChange={(e) => setRepeatWeeks(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-border-2 px-2 text-sm"
              >
                <option value="0">{t("One time")}</option>
                <option value="3">{t("4 weeks")}</option>
                <option value="5">{t("6 weeks")}</option>
                <option value="7">{t("8 weeks")}</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#e8ebf0] px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-ink">{t("Require payment")}</p>
              <p className="text-[11px] text-grey">
                {t("Non-members pay double the member fee.")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRequirePayment((v) => !v)}
              className={cn(
                "h-8 min-w-[72px] rounded-lg text-sm font-semibold",
                requirePayment
                  ? "bg-[var(--mvp-blue)] text-white"
                  : "bg-[#f2f4f7] text-grey",
              )}
            >
              {requirePayment ? t("Yes") : t("No")}
            </button>
          </div>

          {requirePayment ? (
            <label className="block text-[12px] text-grey">
              {t("Member fee ($)")}
              <input
                value={fee}
                onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, ""))}
                className="mt-1 h-10 w-full rounded-lg border border-border-2 px-3 text-sm"
              />
              <span className="mt-1 block text-[11px] text-grey">
                {t("Guest fee")}: $
                {(Number.parseFloat(fee || "0") * 2).toFixed(2)}
              </span>
            </label>
          ) : null}

          <InviteMemberPicker
            selected={invites}
            onChange={setInvites}
            allowExternalEmail
            label={t("Invite players")}
            placeholder={t("Search members or type a guest email")}
            maxSelected={capacity ? Number.parseInt(capacity, 10) : undefined}
          />
        </div>

        <button
          type="button"
          disabled={loading || !title.trim() || invites.length === 0}
          onClick={() => void handleCreate()}
          className="mt-5 h-[50px] w-full rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white disabled:opacity-40"
        >
          {loading ? t("Sending…") : t("Send invites")}
        </button>
      </div>
    </div>
  );
}
