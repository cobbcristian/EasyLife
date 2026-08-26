"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const tabs = [
  {
    href: "/member",
    label: "Today",
    match: (p: string) => p === "/member",
  },
  {
    href: "/member/amenities",
    label: "Book",
    match: (p: string) =>
      p.startsWith("/member/amenities") || p.startsWith("/member/bookings"),
  },
  {
    href: "/member/messages",
    label: "Inbox",
    match: (p: string) => p.startsWith("/member/messages"),
  },
  {
    href: "/member/security",
    label: "You",
    match: (p: string) =>
      p.startsWith("/member/security") ||
      p.startsWith("/member/profile") ||
      p.startsWith("/member/membership"),
  },
] as const;

/** Harbor v2 dock — Today / Book / Inbox / You */
export function HarborBottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label={t("Main navigation")}
    >
      <div
        className="mx-3 mb-3 grid grid-cols-4 gap-1 rounded-[28px] p-1.5"
        style={{ background: "var(--harbor-ink)" }}
      >
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "grid min-h-[52px] place-items-center gap-0.5 rounded-[20px] text-[10px] font-medium transition-colors",
                active
                  ? "bg-[var(--harbor-sand)] font-bold text-[var(--harbor-ink)]"
                  : "text-[var(--harbor-dock-mute)]",
              )}
            >
              <span className="text-sm leading-none">
                {tab.label === "Book" ? "+" : "●"}
              </span>
              {t(tab.label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
