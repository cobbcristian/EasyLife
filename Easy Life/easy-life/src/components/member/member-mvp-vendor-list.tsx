"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, Heart, Search } from "lucide-react";
import {
  SERVICE_CATEGORIES,
  ServiceCategorySheet,
  ServiceRatingSheet,
} from "@/components/member/member-service-filter-sheets";
import { BrandStar } from "@/components/ui/brand-star";
import { imageForProviderCategory } from "@/lib/brand-assets";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface VendorListItem {
  id: string;
  name: string;
  category: string;
  type: string;
  rating: number | null;
}

function categoryMatchesVendor(cat: string, vendorCategory: string): boolean {
  const c = cat.toLowerCase();
  const v = vendorCategory.toLowerCase();
  return v.includes(c) || c.includes(v);
}

/** Figma Services browse (4616:21180) with Category/Rating filter sheets. */
export function MemberMvpVendorList({ vendors }: { vendors: VendorListItem[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const sheetCategories = useMemo(() => {
    const withMatches = SERVICE_CATEGORIES.filter((cat) =>
      vendors.some((v) => categoryMatchesVendor(cat, v.category)),
    );
    return withMatches.length > 0 ? withMatches : SERVICE_CATEGORIES;
  }, [vendors]);

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const q = query.trim().toLowerCase();
      if (q && !v.name.toLowerCase().includes(q) && !v.category.toLowerCase().includes(q)) {
        return false;
      }
      if (categories.length > 0) {
        const match = categories.some(
          (c) =>
            v.category.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(v.category.toLowerCase()),
        );
        if (!match) return false;
      }
      if (minRating != null && (v.rating == null || v.rating < minRating)) {
        return false;
      }
      return true;
    });
  }, [vendors, query, categories, minRating]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 font-[family-name:var(--font-poppins)]">
      <div className="relative mb-4 flex items-center justify-center pt-2">
        <button
          type="button"
          onClick={() => router.push("/member")}
          className="absolute left-0 rounded-lg p-1.5 text-[var(--mvp-blue)] hover:bg-[#eef5ff]"
          aria-label={t("Back")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-medium text-black">{t("Vendors")}</h1>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mvp-blue)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search services")}
          className="h-12 w-full rounded-full border border-border-2 bg-white py-2 pl-10 pr-3 text-sm placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryOpen(true)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm",
            categories.length > 0
              ? "border-[var(--mvp-blue)] bg-[#eef5ff] text-[var(--mvp-blue)]"
              : "border-border-2 text-black",
          )}
        >
          {t("Category")}
          {categories.length > 0 ? ` (${categories.length})` : null}
          <ChevronDown className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => setRatingOpen(true)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm",
            minRating != null
              ? "border-[var(--mvp-blue)] bg-[#eef5ff] text-[var(--mvp-blue)]"
              : "border-border-2 text-black",
          )}
        >
          {t("Rating")}
          {minRating != null ? ` ${minRating}+` : null}
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      <ul className="space-y-5">
        {vendors.length === 0 ? (
          <li className="rounded-xl bg-[#f7f8fa] px-5 py-10 text-center">
            <p className="text-sm font-semibold text-ink">{t("No vendors yet.")}</p>
            <p className="mt-1 text-sm text-grey">
              {t("Ask the club which local pros are approved for your community.")}
            </p>
            <Link
              href="/member/contact"
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
            >
              {t("Contact club")}
            </Link>
          </li>
        ) : filtered.length === 0 ? (
          <li className="rounded-xl bg-[#f7f8fa] px-5 py-10 text-center">
            <p className="text-sm font-semibold text-ink">
              {t("No services match your filters.")}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategories([]);
                setMinRating(null);
              }}
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
            >
              {t("Clear filters")}
            </button>
          </li>
        ) : (
          filtered.map((v, index) => {
            const thumb = imageForProviderCategory(v.category, v.type, v.name);
            const fav = favorites.has(v.id);
            const promoted = index === 0;
            return (
              <li key={v.id}>
                <Link
                  href={`/member/vendors/${v.id}`}
                  className="relative block overflow-hidden rounded-xl shadow-[0_5px_20px_rgba(0,0,0,0.08)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt="" className="h-[234px] w-full object-cover" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(0.35deg, rgba(0,0,0,0.75) 0.39%, rgba(0,0,0,0) 55%)",
                    }}
                  />
                  {promoted ? (
                    <span className="absolute left-3 top-3 rounded-full bg-[var(--mvp-blue)] px-2.5 py-1 text-[11px] font-semibold text-white">
                      {t("Promoted")}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(v.id);
                    }}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm"
                    aria-label={t("Save to favorites")}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        fav ? "fill-[#f99f25] text-[#f99f25]" : "text-white",
                      )}
                    />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 text-white">
                    <div className="min-w-0">
                      <p className="truncate text-xl font-medium">{v.name}</p>
                      <p className="text-sm font-light">{v.category}</p>
                    </div>
                    {v.rating != null ? (
                      <span className="flex shrink-0 items-center gap-1 text-base font-medium">
                        {v.rating.toFixed(1)}
                        <BrandStar className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>

      <ServiceCategorySheet
        open={categoryOpen}
        selected={categories}
        categories={sheetCategories}
        onClose={() => setCategoryOpen(false)}
        onApply={setCategories}
      />
      <ServiceRatingSheet
        open={ratingOpen}
        selected={minRating}
        onClose={() => setRatingOpen(false)}
        onApply={setMinRating}
      />
    </div>
  );
}
