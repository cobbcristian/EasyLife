"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, MessageCircle, MoreHorizontal } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const tabs = [
  {
    href: "/member",
    label: "Home",
    icon: Home,
    match: (p: string) => p === "/member",
    kind: "link" as const,
  },
  {
    href: "/member/calendar",
    label: "Calendar",
    icon: CalendarDays,
    match: (p: string) => p.startsWith("/member/calendar"),
    kind: "link" as const,
  },
  {
    href: "/member/messages",
    label: "Messages",
    icon: MessageCircle,
    match: (p: string) => p.startsWith("/member/messages"),
    kind: "link" as const,
  },
  {
    href: "#more",
    label: "More",
    icon: MoreHorizontal,
    match: () => false,
    kind: "more" as const,
  },
] as const;

/** Figma MVP Home bottom tab bar (4616:17702) — Home / Calendar / Messages / More. */
export function MemberMvpBottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eceff3] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(16,24,40,0.06)] backdrop-blur md:hidden">
      <ul className="mx-auto flex h-[84px] max-w-lg items-start justify-around px-2 pt-3">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const className = cn(
            "flex flex-col items-center gap-1 text-[11px] font-medium",
            active ? "text-[var(--mvp-blue)]" : "text-grey",
          );
          const iconWrap = cn(
            "flex h-8 w-10 items-center justify-center rounded-lg",
            active && "bg-[#eef2f6]",
          );

          if (tab.kind === "more") {
            return (
              <li key={tab.label} className="flex-1">
                <button
                  type="button"
                  className={cn(className, "mx-auto w-full")}
                  onClick={() => window.dispatchEvent(new Event("member:open-sidebar"))}
                  aria-label={t("More")}
                >
                  <span className={iconWrap}>
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  {t(tab.label)}
                </button>
              </li>
            );
          }

          return (
            <li key={tab.href} className="flex-1">
              <Link href={tab.href} className={className}>
                <span className={iconWrap}>
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                </span>
                {t(tab.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
