"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PlazaGlyph, type PlazaIconKey } from "@/components/member/plaza-theme";

const tabs: Array<{
  href: string;
  label: string;
  plaza: PlazaIconKey;
  match: (p: string) => boolean;
  kind: "link" | "more";
}> = [
  {
    href: "/member",
    label: "Home",
    plaza: "home",
    match: (p) => p === "/member",
    kind: "link",
  },
  {
    href: "/member/calendar",
    label: "Outings",
    plaza: "outings",
    match: (p) => p.startsWith("/member/calendar"),
    kind: "link",
  },
  {
    href: "/member/messages",
    label: "Messages",
    plaza: "messages",
    match: (p) => p.startsWith("/member/messages"),
    kind: "link",
  },
  {
    href: "#more",
    label: "More",
    plaza: "more",
    match: () => false,
    kind: "more",
  },
];

/** Member bottom bar — 3D Plaza icons. */
export function MemberMvpBottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eceff3] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(16,24,40,0.06)] backdrop-blur md:hidden">
      <ul className="mx-auto flex h-[84px] max-w-lg items-start justify-around px-2 pt-2">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const className = cn(
            "flex flex-col items-center gap-1 text-[11px] font-medium",
            active ? "text-[var(--mvp-blue)]" : "text-grey",
          );
          const glyph = <PlazaGlyph name={tab.plaza} className="h-9 w-9" />;

          if (tab.kind === "more") {
            return (
              <li key={tab.label} className="flex-1">
                <button
                  type="button"
                  className={cn(className, "mx-auto w-full")}
                  onClick={() => window.dispatchEvent(new Event("member:open-sidebar"))}
                  aria-label={t("More")}
                >
                  {glyph}
                  {t(tab.label)}
                </button>
              </li>
            );
          }

          return (
            <li key={tab.href} className="flex-1">
              <Link href={tab.href} className={className}>
                {glyph}
                {t(tab.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
