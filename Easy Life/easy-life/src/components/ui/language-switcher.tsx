"use client";

import { Globe } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const langs: { id: Lang; label: string }[] = [
    { id: "en", label: "EN" },
    { id: "es", label: "ES" },
  ];

  return (
    <div className={cn("flex items-center gap-2 px-1", className)}>
      <Globe className="h-4 w-4 text-grey" aria-hidden="true" />
      <span className="sr-only">{t("Language")}</span>
      <div className="flex rounded-md border border-border-1 p-0.5">
        {langs.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLang(l.id)}
            aria-pressed={lang === l.id}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              lang === l.id ? "bg-[var(--mvp-blue)] text-white" : "text-grey hover:text-ink",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
