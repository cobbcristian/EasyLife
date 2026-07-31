"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  MemberMvpServiceBookingDetail,
  type MemberServiceBookingVariant,
} from "@/components/member/member-mvp-service-booking-detail";
import { RefundRequestSheet } from "@/components/member/refund-request-sheet";
import { getCommunityBookingById, providerEmailForBooking } from "@/lib/communities-data";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function formatLongDate(iso: string) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function MemberServiceBookingInner() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [respondOpen, setRespondOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [respondAction, setRespondAction] = useState<"accept" | "deny" | "edit" | null>(null);
  const [respondNote, setRespondNote] = useState("");
  const [variantOverride, setVariantOverride] = useState<MemberServiceBookingVariant | null>(
    searchParams.get("confirmed") === "1" ? "booked-with-banner" : null,
  );

  const booking = useMemo(() => getCommunityBookingById(id), [id]);

  if (!booking) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 font-[family-name:var(--font-poppins)]">
        <p className="text-sm text-grey">{t("Booking not found.")}</p>
        <button
          type="button"
          onClick={() => router.push("/member")}
          className="text-sm font-semibold text-[var(--mvp-blue)]"
        >
          {t("Back to home")}
        </button>
      </div>
    );
  }

  const dateLabel = formatLongDate(booking.date);
  const timeLabel = booking.endTime
    ? `${booking.time.replace(/\s/g, "")}–${booking.endTime.replace(/\s/g, "")}`
    : booking.time.replace(/\s/g, "");
  const canRefund =
    booking.status === "accepted" ||
    booking.status === "completed" ||
    booking.status === "upcoming";
  const amountLabel =
    booking.amount > 0 ? `$${booking.amount.toFixed(booking.amount % 1 ? 2 : 0)}` : undefined;
  const amountCents = Math.round((booking.amount || 0) * 100);

  const providerEmail = providerEmailForBooking(booking);

  return (
    <>
      <MemberMvpServiceBookingDetail
        booking={{
          id: booking.id,
          providerName: booking.provider,
          providerEmail,
          dateLabel,
          timeLabel,
          addressLine1: booking.service,
          addressLine2: "",
          status: booking.status,
          notes: booking.service,
          offerings: booking.service
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
            .map((name, index) => ({
              id: `${booking.id}-svc-${index}`,
              name,
              description: "",
              image: "",
            })),
        }}
        variant={variantOverride ?? undefined}
        onRespond={() => setRespondOpen(true)}
        onReview={() => setReviewOpen(true)}
        onRequestRefund={canRefund ? () => setRefundOpen(true) : undefined}
      />

      <RefundRequestSheet
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        bookingId={booking.id}
        bookingType="service"
        title={booking.service || booking.provider}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        locationLine1={booking.service}
        locationLine2=""
        rateLabel={amountLabel ?? "$0"}
        amountCents={amountCents || 0}
        providerEmail={providerEmail}
      />

      {reviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
          >
            <h2 id="review-title" className="text-lg font-semibold text-black">
              {t("Leave a Review")}
            </h2>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={cn(
                    "text-2xl",
                    n <= rating ? "text-[#f99f25]" : "text-[#e5e5ea]",
                  )}
                  aria-label={`${n} stars`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              placeholder={t("Share your experience…")}
              className="mt-4 w-full rounded-lg border border-border-2 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="h-[50px] flex-1 rounded-lg border border-border-2 text-sm font-medium text-ink"
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    const res = await fetch("/api/reviews", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        providerEmail: booking.provider.includes("@")
                          ? booking.provider
                          : undefined,
                        rating,
                        comment: reviewText,
                      }),
                    });
                    setReviewOpen(false);
                    setReviewText("");
                    if (res.ok) {
                      setVariantOverride("booked");
                    }
                  })();
                }}
                className="h-[50px] flex-1 rounded-lg bg-[var(--mvp-blue)] text-sm font-semibold text-white"
              >
                {t("Submit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {respondOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="respond-title"
            className="w-full max-w-lg rounded-t-[24px] bg-white px-5 pb-8 pt-3 shadow-xl sm:rounded-2xl"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#d1d1d6]" />
            <h2 id="respond-title" className="text-center text-base font-semibold text-black">
              {t("Service Response")}
            </h2>

            <p className="mt-6 text-sm font-bold text-black">{t("Action")}</p>
            <div className="mt-3 space-y-3">
              {(
                [
                  { key: "accept" as const, label: t("Accept"), className: "border-[var(--mvp-blue)] text-[var(--mvp-blue)]" },
                  { key: "deny" as const, label: t("Deny"), className: "border-[#ff3b30] text-[#ff3b30]" },
                  {
                    key: "edit" as const,
                    label: t("Request Service Edit"),
                    className: "border-[#f99f25] text-grey",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRespondAction(opt.key)}
                  className={cn(
                    "flex h-[50px] w-full items-center justify-center rounded-lg border-2 text-base font-semibold",
                    opt.className,
                    respondAction === opt.key && "bg-[#f8fafc]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <p className="mt-6 text-sm font-bold text-black">{t("Leave a note")}</p>
            <textarea
              value={respondNote}
              onChange={(e) => setRespondNote(e.target.value)}
              placeholder={t("Additional notes...")}
              className="mt-3 min-h-[120px] w-full resize-none rounded-lg border border-border-2 px-4 py-3 text-sm placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!respondAction}
                onClick={() => {
                  void (async () => {
                    if (!respondAction) return;
                    if (respondAction === "accept" || respondAction === "deny") {
                      const res = await fetch(`/api/member/service-bookings/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: respondAction }),
                      });
                      if (!res.ok) {
                        return;
                      }
                    }
                    setRespondOpen(false);
                    if (respondAction === "accept") {
                      setVariantOverride("booked-with-banner");
                      router.replace(`/member/service-bookings/${id}?confirmed=1`);
                    } else if (respondAction === "deny") {
                      setVariantOverride("cancelled");
                    }
                    setRespondAction(null);
                    setRespondNote("");
                  })();
                }}
                className={cn(
                  "h-[50px] min-w-[122px] rounded-lg text-base font-semibold text-white",
                  respondAction ? "bg-[var(--mvp-blue)]" : "bg-[#e5e5ea]",
                )}
              >
                {t("Send")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Member Post Pay / service booking detail (Figma 5312:4258 family). */
export default function MemberServiceBookingPage() {
  return (
    <Suspense fallback={null}>
      <MemberServiceBookingInner />
    </Suspense>
  );
}
