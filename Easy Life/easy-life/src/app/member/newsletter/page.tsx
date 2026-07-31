"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

interface Newsletter {
  id: string;
  title: string;
  summary: string;
  date: string;
}

export default function MemberNewsletterPage() {
  const { t } = useI18n();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    fetch("/api/newsletters")
      .then((r) => {
        if (!r.ok) throw new Error("newsletters");
        return r.json();
      })
      .then((newsData) => {
        if (!on) return;
        setNewsletters(newsData.newsletters ?? []);
      })
      .catch(() => {
        if (on) setNewsletters([]);
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {t("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Newsletter")}
          </h1>
        </header>

        <div className="px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {loading ? (
            <p className="text-sm text-grey">{t("Loading…")}</p>
          ) : newsletters.length === 0 ? (
            <div className="rounded-xl bg-[#f7f8fa] p-5">
              <p className="text-sm font-semibold text-ink">{t("No newsletters yet.")}</p>
              <Link
                href="/member/announcements"
                className="mt-2 inline-block text-sm font-semibold text-[var(--mvp-blue)]"
              >
                {t("View announcements")} →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#eceff3]">
              {newsletters.map((n) => {
                const open = openId === n.id;
                return (
                <li key={n.id} className="py-4 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold text-ink">{n.title}</h2>
                      <p className={`mt-1 text-sm ${open ? "leading-relaxed text-ink" : "text-grey"}`}>
                        {n.summary}
                      </p>
                      <p className="mt-1 text-[12px] text-grey">
                        {n.date ? formatDate(n.date) : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : n.id)}
                      className="shrink-0 rounded-full bg-[#f2f4f7] px-3 py-1.5 text-[12px] font-semibold text-ink"
                    >
                      {open ? t("Close") : t("Read")}
                    </button>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
