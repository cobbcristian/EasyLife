"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  InviteMemberPicker,
  type InviteMember,
} from "@/components/ui/invite-member-picker";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

const fieldClass =
  "h-[57px] w-full rounded-lg border border-[#bfbfbf] bg-white px-5 text-[14px] text-ink placeholder:text-[#858586] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

/** Figma add an event sheet (3877:1726 / 3877:1826). */
export function AddEventSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("22:00");
  const [capacity, setCapacity] = useState("");
  const [requirePayment, setRequirePayment] = useState(false);
  const [fee, setFee] = useState("");
  const [repeatWeeks, setRepeatWeeks] = useState("0");
  const [selectedInvitees, setSelectedInvitees] = useState<InviteMember[]>([]);
  const [loading, setLoading] = useState(false);

  const valid = name.trim().length > 0 && date.length > 0;

  const feeCents = useMemo(() => {
    const n = Number.parseFloat(fee);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  }, [fee]);

  if (!open) return null;

  async function handleCreate() {
    if (!valid) return;
    setLoading(true);
    try {
      const timeLabel = `${formatClock(start)}-${formatClock(end)}`;
      const invitePayload = selectedInvitees.map((m) => ({
        email: m.email,
        name: m.name,
      }));
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: name.trim(),
          description: description.trim(),
          date,
          time: timeLabel,
          endTime: end,
          location: address.trim(),
          category: "social",
          capacity: capacity ? Number.parseInt(capacity, 10) || null : null,
          requirePayment,
          feeCents: requirePayment ? feeCents : 0,
          repeatWeeks: Number.parseInt(repeatWeeks, 10) || 0,
          invites: invitePayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: t("Could not create event"),
          description: data.error,
        });
        setLoading(false);
        return;
      }
      const sessions = Array.isArray(data.events) ? data.events.length : 1;
      const redirectTo =
        typeof data.redirectTo === "string"
          ? data.redirectTo
          : data.event?.id
            ? `/member/events/${data.event.id}?added=1`
            : null;
      if (redirectTo) {
        onClose();
        router.push(redirectTo);
        router.refresh();
        return;
      }
      toast({
        variant: "success",
        title: sessions > 1 ? t("Recurring event created") : t("Event created"),
        description:
          invitePayload.length > 0
            ? t("{{sessions}} week(s) · {{count}} invited — they can say Going or Not going")
                .replace("{{sessions}}", String(sessions))
                .replace("{{count}}", String(invitePayload.length))
            : sessions > 1
              ? t("{{sessions}} weekly sessions added to the calendar").replace(
                  "{{sessions}}",
                  String(sessions),
                )
              : undefined,
      });
      setSelectedInvitees([]);
      setRepeatWeeks("0");
      onClose();
      router.refresh();
    } catch {
      toast({ variant: "warning", title: t("Something went wrong") });
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 font-[family-name:var(--font-poppins)] sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        aria-label={t("Close")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-event-title"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-white px-4 pb-6 pt-3 shadow-xl sm:rounded-2xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#d1d1d6]" />
        <h2
          id="add-event-title"
          className="text-center text-base font-semibold text-[#262626]"
        >
          {t("Add Event")}
        </h2>

        <div className="mt-6 space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Event name")}
            className={fieldClass}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("Description")}
            rows={5}
            className="min-h-[173px] w-full resize-none rounded-lg border border-[#bfbfbf] px-5 py-4 text-[14px] text-ink placeholder:text-[#858586] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("Address")}
            className={fieldClass}
          />

          <div className="flex items-center gap-3">
            <span className="w-16 text-[15px] text-black">{t("Date")}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 rounded-[5px] border border-[#999] px-2 text-[15px] text-[var(--mvp-blue)]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-16 text-[15px] text-black">{t("Start")}</span>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-8 rounded-[5px] border border-[#999] px-2 text-[15px] text-[var(--mvp-blue)]"
            />
            <span className="text-[15px] text-black">{t("End")}</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-8 rounded-[5px] border border-[#999] px-2 text-[15px] text-[var(--mvp-blue)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 text-[15px] text-black">{t("Capacity")}</span>
            <input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="—"
              className="h-8 w-[83px] rounded-[5px] border border-[#999] px-2 text-center text-[15px] text-[var(--mvp-blue)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[15px] text-black">{t("Repeat")}</span>
            <select
              value={repeatWeeks}
              onChange={(e) => setRepeatWeeks(e.target.value)}
              className="h-8 flex-1 rounded-[5px] border border-[#999] px-2 text-[15px] text-[var(--mvp-blue)]"
            >
              <option value="0">{t("One time")}</option>
              <option value="3">{t("Weekly · 4 weeks")}</option>
              <option value="7">{t("Weekly · 8 weeks")}</option>
              <option value="11">{t("Weekly · 12 weeks")}</option>
            </select>
          </div>
          <p className="text-[12px] text-grey">
            {t(
              "Invitees get notified each week and can tap Going or Not going.",
            )}
          </p>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-[15px] text-black">
              {t("Require a payment?")}
            </span>
            <button
              type="button"
              onClick={() => setRequirePayment((v) => !v)}
              className={cn(
                "h-8 min-w-[117px] rounded-[5px] border border-[#999] px-2 text-[15px]",
                requirePayment ? "text-[var(--mvp-blue)]" : "text-grey",
              )}
            >
              {requirePayment ? t("Yes") : "—"}
            </button>
          </div>
          {requirePayment ? (
            <div className="flex items-center gap-3">
              <span className="w-20 text-[15px] text-black">{t("Fee")}</span>
              <input
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="$0"
                className="h-8 w-[117px] rounded-[5px] border border-[#999] px-2 text-[15px] text-[var(--mvp-blue)]"
              />
            </div>
          ) : null}

          <InviteMemberPicker
            label={t("Invite Members")}
            placeholder={t("Invite Members")}
            selected={selectedInvitees}
            onChange={setSelectedInvitees}
          />
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-[50px] min-w-[89px] text-base font-semibold text-[#c4c4c4]"
          >
            {t("Delete")}
          </button>
          <button
            type="button"
            disabled={!valid || loading}
            onClick={handleCreate}
            className={cn(
              "h-[50px] min-w-[122px] rounded-lg text-base font-semibold text-white",
              valid ? "bg-[var(--mvp-blue)]" : "bg-[#dadada]",
            )}
          >
            {loading ? t("Saving...") : t("Create")}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatClock(value: string) {
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = mRaw ?? "00";
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${suffix}`;
}
