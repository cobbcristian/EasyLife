"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  author: string;
  priority: string;
  createdAt: string;
}

/** Figma-aligned member announcements feed. */
export function MemberMvpAnnouncements({
  announcements,
}: {
  announcements: AnnouncementRow[];
}) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {t("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Announcements")}
          </h1>
        </header>

        <div className="px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {announcements.length === 0 ? (
            <div className="rounded-xl bg-[#f7f8fa] p-5">
              <p className="text-sm font-semibold text-ink">{t("No announcements yet.")}</p>
              <Link
                href="/member/newsletter"
                className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
              >
                {t("Read the newsletter")} →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#eceff3]">
              {announcements.map((a) => (
                <li key={a.id} className="py-4 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[15px] font-semibold leading-snug text-ink">
                      {a.title}
                    </h2>
                    {a.priority === "important" ? (
                      <span className="shrink-0 rounded-full bg-[#fff4f0] px-2.5 py-0.5 text-[11px] font-semibold text-[#c45c5c]">
                        {t("Important")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-grey">{a.body}</p>
                  <p className="mt-2 text-[12px] text-grey">
                    {a.author} · {formatDate(a.createdAt.slice(0, 10))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
