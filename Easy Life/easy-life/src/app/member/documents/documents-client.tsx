"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export interface DocumentDTO {
  id: string;
  title: string;
  category: string;
  url: string;
  size: string;
  date: string;
}

const categoryLabel = {
  legal: "Legal",
  minutes: "Minutes",
  financial: "Financial",
  policy: "Policy",
  membership: "Membership",
  dining: "Dining",
} as const;

export function DocumentsClient({ documents }: { documents: DocumentDTO[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((doc) => {
      const category =
        categoryLabel[doc.category as keyof typeof categoryLabel] ?? doc.category;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q)
      );
    });
  }, [documents, query]);

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {t("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Documents")}
          </h1>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search documents...")}
            className="mt-3 h-11 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm outline-none focus:border-[var(--mvp-blue)]"
          />
        </header>

        <ul className="divide-y divide-[#eceff3] px-4 py-2 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          {filtered.length === 0 ? (
            <li className="py-8 text-center text-sm text-grey">
              {query
                ? t("No documents match your search.")
                : t("No documents available.")}
            </li>
          ) : (
            filtered.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">{doc.title}</p>
                  <p className="mt-0.5 text-[12px] text-grey">
                    {t(
                      categoryLabel[doc.category as keyof typeof categoryLabel] ??
                        doc.category,
                    )}{" "}
                    · {formatDate(doc.date)} · {doc.size}
                  </p>
                </div>
                <a
                  href={doc.url}
                  download
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#f2f4f7] px-3 text-[12px] font-semibold text-ink"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("Download")}
                </a>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
