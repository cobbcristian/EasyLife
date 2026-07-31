"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, Star, X } from "lucide-react";
import { brandAssets } from "@/lib/brand-assets";
import { useI18n } from "@/lib/i18n";
import type { ServiceBookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type MemberServiceBookingVariant =
  | "confirmation"
  | "booked"
  | "booked-with-banner"
  | "cancelled";

export interface MemberServiceBookingDetailData {
  id: string;
  providerName: string;
  providerEmail?: string | null;
  dateLabel: string;
  timeLabel: string;
  addressLine1: string;
  addressLine2: string;
  status: ServiceBookingStatus;
  notes: string;
  heroImage?: string;
  offerings?: { id: string; name: string; description: string; image: string }[];
}

function variantForStatus(
  status: ServiceBookingStatus,
  force?: MemberServiceBookingVariant,
): MemberServiceBookingVariant {
  if (force) return force;
  switch (status) {
    case "pending":
    case "upcoming":
      return "confirmation";
    case "accepted":
    case "completed":
      return "booked";
    case "cancelled":
      return "cancelled";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Figma Post Pay Service Completion Details (5312:4258, 4703:11787, 4703:11849). */
export function MemberMvpServiceBookingDetail({
  booking,
  variant: variantProp,
  onRespond,
  onReview,
  onRequestRefund,
}: {
  booking: MemberServiceBookingDetailData;
  variant?: MemberServiceBookingVariant;
  onRespond?: () => void;
  onReview?: () => void;
  onRequestRefund?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const variant = variantForStatus(booking.status, variantProp);
  const offerings = booking.offerings?.length
    ? booking.offerings.map((o) => ({
        ...o,
        image: o.image || brandAssets.serviceDetailsHero,
        description: o.description || t("Included in this booking"),
      }))
    : [
        {
          id: `${booking.id}-svc`,
          name: booking.notes || booking.providerName,
          description: t("Included in this booking"),
          image: brandAssets.serviceDetailsHero,
        },
      ];

  const messageHref = booking.providerEmail
    ? `/member/messages?to=${encodeURIComponent(booking.providerEmail)}&name=${encodeURIComponent(booking.providerName)}`
    : "/member/messages";

  const reviewEnabled = booking.status === "completed" || booking.status === "accepted";
  const showActions = variant !== "confirmation";

  return (
    <div className="relative mx-auto min-h-screen max-w-lg bg-white pb-28 font-[family-name:var(--font-poppins)]">
      {variant === "booked-with-banner" ? (
        <div className="flex items-center gap-3 bg-[var(--mvp-blue)] px-4 py-3 text-[13px] font-medium leading-snug text-white">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/80 text-sm">
            <Check className="h-4 w-4" />
          </span>
          {t("This service invitation has been added to your calendar.")}
        </div>
      ) : null}

      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={booking.heroImage ?? brandAssets.serviceDetailsHero}
          alt=""
          className="h-[280px] w-full object-cover"
        />
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
          aria-label={t("Close")}
        >
          <X className="h-5 w-5 text-[var(--mvp-blue)]" strokeWidth={2.25} />
        </button>
      </div>

      <div className="px-4 pt-5">
        {variant === "confirmation" ? (
          <p className="text-[17px] font-medium text-[#f99f25]">
            {t("Scheduled Service Confirmation:")}
          </p>
        ) : variant === "cancelled" ? (
          <p className="text-[17px] font-semibold text-[#ff3b30]">{t("Cancelled:")}</p>
        ) : (
          <p className="text-[17px] font-semibold text-[var(--mvp-blue)]">{t("Booked:")}</p>
        )}
        <h1 className="mt-1 text-[28px] font-bold leading-tight text-black">
          {booking.providerName}
        </h1>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="border-r border-border-2 pr-3">
            <p className="text-sm font-bold text-black">{t("When")}</p>
            <p className="mt-1 text-[15px] text-black">{booking.dateLabel}</p>
            <p className="text-[15px] text-black">{booking.timeLabel}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-black">{t("Service")}</p>
            <p className="mt-1 text-[15px] text-black">{booking.addressLine1}</p>
            {booking.addressLine2 ? (
              <p className="text-[15px] text-black">{booking.addressLine2}</p>
            ) : null}
          </div>
        </div>

        <hr className="my-5 border-border-2" />

        <h2 className="text-[17px] font-bold text-black">{t("Services")}</h2>
        <ul className="mt-3 space-y-4">
          {offerings.map((item) => (
            <li key={item.id} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-black">{item.name}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-grey">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>

        {variant === "confirmation" ? (
          <hr className="my-5 border-border-2" />
        ) : (
          <>
            <hr className="my-5 border-border-2" />
            <h2 className="text-[17px] font-bold text-black">{t("Servicer Notes")}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-black">{booking.notes}</p>
            <hr className="mt-5 border-border-2" />
            {onRequestRefund ? (
              <button
                type="button"
                onClick={onRequestRefund}
                className="mt-4 text-left text-[15px] font-medium text-black underline-offset-2 hover:underline"
              >
                {t("Issue? Request Refund")}
              </button>
            ) : null}
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg bg-white px-4 pb-6 pt-3">
        {variant === "confirmation" ? (
          <button
            type="button"
            onClick={onRespond}
            className="flex h-[50px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white"
          >
            {t("Respond")}
          </button>
        ) : showActions ? (
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={messageHref}
              className="flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl bg-[#f2f2f7] text-[var(--mvp-blue)]"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm font-semibold">{t("Message")}</span>
            </Link>
            <button
              type="button"
              disabled={!reviewEnabled || variant === "cancelled"}
              onClick={onReview}
              className={cn(
                "flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl bg-[#f2f2f7]",
                reviewEnabled && variant !== "cancelled"
                  ? "text-[var(--mvp-blue)]"
                  : "text-grey",
              )}
            >
              <Star className="h-5 w-5" />
              <span className="text-sm font-semibold">{t("Review")}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
