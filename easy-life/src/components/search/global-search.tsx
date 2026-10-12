"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SearchResult = {
  type: string;
  id: string;
  label: string;
  meta: string;
  href: string;
};

export function GlobalSearch({ className }: { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const shortcutLabel = useSyncExternalStore(
    () => () => {},
    () =>
      /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
        ? "⌘K"
        : "Ctrl K",
    () => "Ctrl K",
  );

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
    if (!open) return;
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, open, search]);

  useEffect(() => {
    function doKeyboardShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", doKeyboardShortcut);
    return () => window.removeEventListener("keydown", doKeyboardShortcut);
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border-1 bg-white px-3 py-2 text-sm text-grey hover:border-[var(--mvp-blue)]/40",
          className,
        )}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t("Search")}</span>
        <kbd className="hidden rounded bg-slate-100 px-1.5 text-[10px] text-grey md:inline">
          {shortcutLabel}
        </kbd>
      </button>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-lg border border-[var(--mvp-blue)]/40 bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-grey" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search documents, events, members…")}
          className="h-8 flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery("");
            setResults([]);
          }}
          className="text-grey hover:text-ink"
          aria-label={t("Close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {(results.length > 0 || loading || query.length >= 2) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border-1 bg-white py-1 shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-sm text-grey">{t("Searching…")}</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-grey">{t("No results")}</p>
          ) : (
            results.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.href}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  setResults([]);
                }}
                className="block px-3 py-2 hover:bg-[var(--mvp-blue)]/10"
              >
                <p className="text-sm font-medium text-ink">{r.label}</p>
                <p className="text-xs text-grey capitalize">
                  {t(r.type)} · {r.meta}
                </p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
