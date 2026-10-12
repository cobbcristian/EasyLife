"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart } from "lucide-react";
import {
  ServiceAddressSheet,
  ServiceHoursSheet,
} from "@/components/member/member-service-filter-sheets";
import { BrandStar } from "@/components/ui/brand-star";
import { useToast } from "@/components/ui/toast";
import type { FigmaServiceDetail } from "@/lib/figma-service-detail";
import { useI18n } from "@/lib/i18n";

/** Figma MVP Service Details: Standard Size (node 4616:17631). */
export function MemberMvpServiceDetails({
  detail,
  messageHref,
  bookHref,
  bookLabel,
  favoriteHref,
}: {
  detail: FigmaServiceDetail;
  messageHref?: string;
  bookHref?: string;
  bookLabel?: string;
  favoriteHref?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [hoursOpen, setHoursOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const href = favoriteHref ?? bookHref ?? messageHref ?? "/member/favorites";

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = (d?.favorites ?? []) as Array<{ href?: string; label?: string }>;
        setFavorited(list.some((f) => f.href === href || f.label === detail.businessName));
      })
      .catch(() => {});
  }, [detail.businessName, href]);

  async function toggleFavorite() {
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      if (favorited) {
        const res = await fetch("/api/favorites");
        const data = res.ok ? await res.json() : { favorites: [] };
        const match = (data.favorites ?? []).find(
          (f: { href?: string; label?: string; id: string }) =>
            f.href === href || f.label === detail.businessName,
        );
        if (match?.id) {
          await fetch(`/api/favorites?id=${encodeURIComponent(match.id)}`, {
            method: "DELETE",
          });
        }
        setFavorited(false);
        toast({ variant: "success", title: t("Removed from favorites") });
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: detail.businessName, href }),
        });
        if (!res.ok) throw new Error("favorite");
        setFavorited(true);
        toast({ variant: "success", title: t("Saved to favorites") });
      }
    } catch {
      toast({ variant: "warning", title: t("Could not update favorites") });
    } finally {
      setFavoriteBusy(false);
    }
  }

  return (
    <div className="font-[family-name:var(--font-poppins)] pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <div className="relative mx-auto max-w-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={detail.heroImage}
          alt=""
          className="h-[325px] w-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm"
            aria-label={t("Back")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            disabled={favoriteBusy}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm disabled:opacity-60"
            aria-label={favorited ? t("Remove from favorites") : t("Save to favorites")}
            aria-pressed={favorited}
          >
            <Heart className={`h-5 w-5 ${favorited ? "fill-white" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-0 px-4">
        <div className="pt-6">
          <h1 className="text-[25px] font-medium leading-tight text-black">
            {detail.businessName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-black">
            <span className="text-base font-medium text-black">{detail.categoryLabel}</span>
            <span className="text-border-1">|</span>
            <span className="flex items-center gap-1">
              {detail.rating.toFixed(1)}
              <BrandStar className="h-3.5 w-3.5" />
            </span>
            <span className="text-border-1">|</span>
            <span className="font-medium text-[var(--mvp-blue)]">{t(detail.statusLabel)}</span>
          </div>
        </div>

        <hr className="my-4 border-border-2" />

        <section className="pb-6">
          <h2 className="mb-3 text-base font-semibold text-black">{t("About")}</h2>
          <p className="text-sm leading-relaxed text-[#262626]">{detail.about}</p>
        </section>

        <div className="grid grid-cols-2 gap-3 pb-6">
          <button
            type="button"
            onClick={() => setAddressOpen(true)}
            className="rounded-lg bg-[#eee] px-4 py-3 text-center transition hover:bg-[#e4e4e4]"
          >
            <p className="text-xs font-normal text-[var(--mvp-blue)]">{t("Address")}</p>
            <p className="mt-1 text-[11px] leading-snug text-black">{detail.address}</p>
          </button>
          <button
            type="button"
            onClick={() => setHoursOpen(true)}
            className="rounded-lg bg-[#eee] px-4 py-3 text-center transition hover:bg-[#e4e4e4]"
          >
            <p className="text-xs font-normal text-[var(--mvp-blue)]">{t("Hours")}</p>
            <p className="mt-1 text-[11px] text-black">{detail.hours}</p>
          </button>
        </div>

        <hr className="mb-6 border-border-2" />

        <section className="pb-6">
          <h2 className="mb-4 text-base font-semibold text-black">{t("Services")}</h2>
          <ul className="space-y-4">
            {detail.offerings.map((item) => (
              <li key={item.id} className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt=""
                  className="h-[70px] w-[70px] shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-black">{t(item.name)}</p>
                    <p className="shrink-0 text-sm font-medium text-black">{item.priceLabel}</p>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-grey">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <hr className="mb-6 border-border-2" />

        <section className="pb-8">
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="font-semibold text-black">{detail.rating.toFixed(1)}</span>
            <BrandStar className="h-3.5 w-3.5" />
            <span className="text-grey">
              {detail.reviewCount} {detail.reviewCount === 1 ? t("Review") : t("Reviews")}
            </span>
          </div>
          {detail.sampleReview ? (
            <div className="rounded-lg border border-border-2 p-4">
              <div className="flex items-center gap-2">
                <BrandStar className="h-3.5 w-3.5" />
                <span className="text-sm font-medium text-black">{detail.sampleReview.author}</span>
              </div>
              <p className="mt-2 text-sm text-grey">{detail.sampleReview.text}</p>
            </div>
          ) : (
            <p className="text-sm text-grey">{t("No reviews yet.")}</p>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border-2 bg-white/95 px-4 py-3 backdrop-blur-sm lg:static lg:bottom-auto lg:mx-auto lg:max-w-lg lg:border-0 lg:bg-transparent lg:px-4 lg:pb-10 lg:pt-0">
        {messageHref ? (
          <Link
            href={messageHref}
            className="mx-auto flex h-[50px] max-w-lg items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            {t("Message")}
          </Link>
        ) : bookHref ? (
          <Link
            href={bookHref}
            className="mx-auto flex h-[50px] max-w-lg items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            {t(bookLabel || "Book now")}
          </Link>
        ) : (
          <Link
            href="/member/contact"
            className="mx-auto flex h-[50px] max-w-lg items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            {t("Contact club")}
          </Link>
        )}
      </div>

      <ServiceHoursSheet open={hoursOpen} onClose={() => setHoursOpen(false)} />
      <ServiceAddressSheet
        open={addressOpen}
        address={detail.address}
        onClose={() => setAddressOpen(false)}
      />
    </div>
  );
}
