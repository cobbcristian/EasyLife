"use client";

import { useState } from "react";
import { brandAssets } from "@/lib/brand-assets";
import { useI18n } from "@/lib/i18n";
import { cn, formatCurrency } from "@/lib/utils";

export type RefundRequestSheetProps = {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  locationLine1: string;
  locationLine2: string;
  rateLabel?: string;
  amountCents?: number;
  paymentLabel?: string;
  providerEmail?: string | null;
  thumbnail?: string;
  bookingType?: "activity" | "service";
  onSubmitted?: () => void;
};

/** Figma Refund Request (3960:1633 / 4098:4963). */
export function RefundRequestSheet({
  open,
  onClose,
  bookingId,
  title,
  dateLabel,
  timeLabel,
  locationLine1,
  locationLine2,
  rateLabel = "$10/hr",
  amountCents = 2000,
  paymentLabel = "VISA ··· 7281",
  providerEmail,
  thumbnail,
  bookingType = "activity",
  onSubmitted,
}: RefundRequestSheetProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const canSubmit = reason.trim().length > 3;

  if (!open) return null;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          bookingType,
          title,
          amountCents,
          reason,
          providerEmail,
          paymentLabel,
          dateLabel,
          timeLabel,
          locationLine1,
          locationLine2,
          rateLabel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit refund request");
        setLoading(false);
        return;
      }
      setDone(true);
      onSubmitted?.();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 font-[family-name:var(--font-poppins)] sm:items-center">
      <button type="button" className="absolute inset-0" aria-label={t("Close")} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-request-title"
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-white px-4 pb-8 pt-3 shadow-xl sm:rounded-2xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#d1d1d6]" />
        <h2
          id="refund-request-title"
          className="text-center text-base font-semibold text-[#262626]"
        >
          {t("Refund Request")}
        </h2>

        {done ? (
          <div className="mt-8 space-y-4 px-1">
            <p className="text-[25px] font-medium leading-tight text-black">{title}</p>
            <p className="text-sm text-grey">
              {t("Refund request submitted")}
            </p>
            <p className="text-[13px] leading-relaxed text-grey">
              {t(
                "Your request was sent to the provider. You’ll be notified when it’s reviewed.",
              )}
            </p>
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="h-[50px] min-w-[122px] rounded-lg bg-[var(--mvp-blue)] px-6 text-base font-semibold text-white"
              >
                {t("Done")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-6 text-[25px] font-medium leading-tight text-black">{title}</p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="border-r border-border-2 pr-3">
                <p className="text-sm font-medium text-black">{t("When")}</p>
                <p className="mt-1 text-[15px] text-[#262626]">{dateLabel}</p>
                <p className="text-[15px] text-[#262626]">{timeLabel}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-black">{t("Where")}</p>
                <p className="mt-1 text-[15px] text-[#262626]">{locationLine1}</p>
                <p className="text-[15px] text-[#262626]">{locationLine2}</p>
              </div>
            </div>

            <hr className="my-5 border-border-2" />

            <p className="text-base font-medium text-black">
              {bookingType === "service" ? t("Service") : t("Activity")}
            </p>
            <div className="mt-3 flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnail ?? brandAssets.serviceDetailsHero}
                alt=""
                className="h-[70px] w-[70px] shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-black">{title}</p>
                  <p className="shrink-0 text-sm font-medium text-black">{rateLabel}</p>
                </div>
                <p className="mt-1 text-sm font-medium text-[var(--mvp-blue)]">{timeLabel}</p>
              </div>
            </div>

            <p className="mt-6 text-base font-medium text-black">{t("Payment")}</p>
            <div className="mt-2 flex items-center justify-between text-[15px] text-[#262626]">
              <span>{paymentLabel}</span>
              <span className="font-medium text-black">
                {formatCurrency(amountCents / 100)}
              </span>
            </div>

            <hr className="my-5 border-border-2" />

            {error ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder={t("Reason for refund request...")}
              className="min-h-[118px] w-full resize-none rounded-[10px] border border-[#979797] px-3.5 py-3 text-[11px] text-black placeholder:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={!canSubmit || loading}
                onClick={handleSubmit}
                className={cn(
                  "h-[50px] min-w-[122px] rounded-lg text-base font-semibold text-white",
                  canSubmit ? "bg-[var(--mvp-blue)]" : "bg-[#eee] text-[#c4c4c4]",
                )}
              >
                {loading ? t("Submitting…") : t("Review")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
