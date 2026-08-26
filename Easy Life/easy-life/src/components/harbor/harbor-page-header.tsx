"use client";

import { cn } from "@/lib/utils";

export function HarborPageHeader({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "harbor-rise relative overflow-hidden px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-[var(--harbor-sand)]",
        className,
      )}
      style={{
        background: "var(--harbor-ink)",
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
      }}
    >
      <div
        aria-hidden
        className="harbor-atmosphere pointer-events-none absolute inset-0 opacity-60"
      />
      <div className="relative z-[1]">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
          {eyebrow}
        </p>
        <h1 className="font-harbor-display m-0 mt-2.5 text-[1.85rem] font-semibold leading-tight tracking-[-0.03em]">
          {title}
        </h1>
        {lead ? (
          <p className="m-0 mt-2 max-w-md text-[15px] leading-snug opacity-75">
            {lead}
          </p>
        ) : null}
      </div>
    </header>
  );
}
