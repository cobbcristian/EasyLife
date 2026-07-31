"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { BrandStar } from "@/components/ui/brand-star";
import { useI18n } from "@/lib/i18n";

interface Favorite {
  id: string;
  label: string;
  href: string;
}

/** Figma-aligned member favorites list. */
export default function MemberFavoritesPage() {
  const { t } = useI18n();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((favData) => {
        if (!on) return;
        setFavorites(favData.favorites ?? []);
      })
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  async function remove(id: string) {
    const res = await fetch(`/api/favorites?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) setFavorites((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Favorites")}
          </h1>
          <p className="mt-0.5 text-[12px] text-grey">{t("Your most-used shortcuts")}</p>
        </header>

        <div className="px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {loading ? (
            <p className="text-sm text-grey">{t("Loading…")}</p>
          ) : favorites.length === 0 ? (
            <div className="rounded-xl bg-[#f7f8fa] p-5">
              <p className="text-sm font-semibold text-ink">{t("No favorites yet.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Save amenities and services from detail pages.")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/member/activities"
                  className="inline-flex h-9 items-center rounded-lg bg-[var(--mvp-blue)] px-3 text-sm font-semibold text-white"
                >
                  {t("Browse Fun Stuff")}
                </Link>
                <Link
                  href="/member/dining"
                  className="inline-flex h-9 items-center rounded-lg border border-[#e8ebf0] bg-white px-3 text-sm font-semibold text-ink"
                >
                  {t("Dining")}
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-[#eceff3]">
              {favorites.map((f) => (
                <li key={f.id} className="flex items-center gap-3 py-3.5">
                  <Link href={f.href} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff8e8] text-amber-500">
                      <BrandStar className="h-5 w-5" />
                    </span>
                    <span className="truncate text-[15px] font-semibold text-ink">
                      {f.label}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    className="rounded-lg p-2 text-grey hover:bg-red-50 hover:text-[#c45c5c]"
                    aria-label={t("Remove favorite")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
