"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, Plus, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SearchResult = {
  type: string;
  id: string;
  label: string;
  meta: string;
  href: string;
};

/** ChatGPT-style “Ask Plaza” composer on member home. */
export function MemberMvpHomeSearch({
  className,
}: {
  className?: string;
  communityId?: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const placeholder = "Ask Plaza";

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

  function openAssistant(prompt?: string) {
    const q = (prompt ?? query).trim();
    if (q) {
      router.push(`/member/assistant?q=${encodeURIComponent(q)}`);
      return;
    }
    router.push("/member/assistant");
  }

  return (
    <div ref={wrapRef} className={cn("relative z-10", className)}>
      <div className="flex h-14 items-center gap-2 rounded-full border border-[#e6eaf0] bg-white px-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
        <Link
          href="/member/assistant"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#667085] hover:bg-[#f2f4f7]"
          aria-label={t("Open Plaza")}
          title={t("Ask Plaza")}
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </Link>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              openAssistant();
            }
          }}
          placeholder={t(placeholder)}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-[#98a2b3] focus:outline-none"
          aria-label={t("Ask Plaza")}
        />
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#667085] hover:bg-[#f2f4f7] active:bg-[#e8ebf0]"
          aria-label={t("Voice input")}
          title={t("Ask with your voice")}
          onClick={() => {
            const q = query.trim();
            if (q) {
              router.push(
                `/member/assistant?q=${encodeURIComponent(q)}&voice=1`,
              );
              return;
            }
            router.push("/member/assistant?voice=1");
          }}
        >
          <Mic className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mvp-blue)] text-white shadow-sm hover:brightness-95"
          aria-label={t("Ask Plaza")}
          onClick={() => openAssistant()}
        >
          <Sparkles className="h-4.5 w-4.5 h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-border-2 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => openAssistant()}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--mvp-blue)]/10"
          >
            <Sparkles className="h-4 w-4 text-[var(--mvp-blue)]" />
            <span className="text-sm font-medium text-ink">
              {t("Ask Plaza")}: “{query.trim()}”
            </span>
          </button>
          {loading ? (
            <p className="px-4 py-3 text-sm text-grey">{t("Searching…")}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-grey">{t("No quick results — ask Plaza")}</p>
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
