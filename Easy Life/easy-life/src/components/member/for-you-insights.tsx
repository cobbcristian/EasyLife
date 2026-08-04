"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type Insight = {
  id: string;
  title: string;
  score: number;
  level: string;
  reason: string;
  href?: string;
};

export function ForYouInsights() {
  const { t } = useI18n();
  const [items, setItems] = useState<Insight[]>([]);
  const [fb, setFb] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/ai/insights")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setItems(d.forYou ?? []);
        setFb(d.fbSuggestions ?? []);
      })
      .catch(() => undefined);
  }, []);

  if (items.length === 0 && fb.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[21px] font-medium text-black">{t("For you")}</h2>
      </div>
      <ul className="space-y-3">
        {items.slice(0, 4).map((item) => (
          <li key={item.id}>
            <Link
              href={item.href ?? "/member/assistant"}
              className="block rounded-xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3.5"
            >
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-grey">{item.reason}</p>
              <p className="mt-2 text-[12px] font-semibold text-[var(--mvp-blue)]">
                {t("Open")} →
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {fb[0] && !items.some((item) => item.id === "fb") ? (
        <p className="mt-2 text-[12px] text-grey">
          {fb[0]} ·{" "}
          <Link href="/member/dining" className="font-semibold text-[var(--mvp-blue)]">
            {t("Dining")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
