"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandIcon } from "@/components/ui/brand-icon";
import { communityIsResidentialHoa } from "@/lib/community-features";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SearchResult = {
  type: string;
  id: string;
  label: string;
  meta: string;
  href: string;
};

/** Figma MVP home search pill — overlaps blue header. */
export function MemberMvpHomeSearch({
  className,
  communityId,
}: {
  className?: string;
  communityId?: string | null;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hoaNoGolf = new Set([
    "harbor-pointe",
    "willow-creek",
    "alliant",
    "oceanside-residents",
    "oceansideresidents",
  ]);
  const placeholder =
    communityIsResidentialHoa(communityId) || hoaNoGolf.has(communityId ?? "")
      ? "Search for amenities, pool, plumbing, etc."
      : "Search for tennis, golf, plumbing, etc.";

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className={cn("relative z-10", className)}>
      <div className="flex h-12 items-center gap-3 rounded-[22px] bg-white px-4 shadow-[0_5px_10px_rgba(0,0,0,0.15)]">
        <Link
          href="/member/assistant"
          className="shrink-0 rounded-md p-0.5 text-[var(--mvp-blue)] hover:bg-[var(--mvp-blue)]/10"
          aria-label={t("Ask assistant")}
          title={t("Ask assistant")}
        >
          <BrandIcon name="Search" className="h-4 w-4" />
        </Link>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t(placeholder)}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-[#aeb4c2] focus:outline-none"
          aria-label={t("Search")}
        />
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-border-2 bg-white py-1 shadow-lg">
          {loading ? (
            <p className="px-4 py-3 text-sm text-grey">{t("Searching…")}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-grey">{t("No results")}</p>
          ) : (
            results.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 hover:bg-[var(--mvp-blue)]/10"
              >
                <p className="text-sm font-medium text-ink">{r.label}</p>
                <p className="text-xs text-grey">{r.meta}</p>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
