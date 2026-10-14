"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { UserAvatarMenu } from "@/components/layout/user-avatar-menu";
import { PlazaGlyph, type PlazaIconKey } from "@/components/member/plaza-theme";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type PlazaTab = {
  href: string;
  label: string;
  icon: PlazaIconKey;
  exact?: boolean;
};

export function PlazaPhoneChrome({
  productName,
  logoUrl,
  communityName,
  accountName,
  avatarSrc,
  homeHref,
  title,
  icon,
  tabs,
  onOpenMenu,
  children,
}: {
  productName: string;
  logoUrl?: string | null;
  communityName?: string | null;
  accountName: string;
  avatarSrc?: string;
  homeHref: string;
  title: string;
  icon: PlazaIconKey;
  tabs: PlazaTab[];
  onOpenMenu: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="sticky top-0 z-40">
        <header className="plaza-chrome px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] text-white sm:px-6 lg:hidden">
          <div className="flex h-12 items-center gap-4">
            <button
              type="button"
              className="rounded-lg p-2 text-white hover:bg-white/15"
              onClick={onOpenMenu}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Logo
              size="sm"
              productName={productName}
              communityLogoSrc={logoUrl}
              communityName={communityName}
              showCommunityName={false}
            />
            <UserAvatarMenu
              name={accountName}
              avatarSrc={avatarSrc}
              homeHref={homeHref}
              className="ml-auto"
            />
          </div>
          <div className="mt-1 flex items-center gap-2 pb-1">
            <PlazaGlyph name={icon} className="h-9 w-9" />
            <h1 className="truncate text-[22px] font-semibold tracking-[-0.02em] text-white">
              {t(title)}
            </h1>
          </div>
        </header>
        <div className="plaza-chrome hidden h-14 items-center justify-end gap-3 px-8 text-white lg:flex">
          <UserAvatarMenu name={accountName} avatarSrc={avatarSrc} homeHref={homeHref} />
        </div>
      </div>
      <main id="main-content" className="flex min-h-0 flex-1 flex-col bg-white pb-28 lg:pb-0">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eceff3] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(16,24,40,0.06)] backdrop-blur lg:hidden">
        <ul className="mx-auto flex h-[84px] max-w-lg items-start justify-around px-2 pt-2">
          {tabs.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href} className="flex-1">
                <a
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 text-[11px] font-medium",
                    active ? "text-[var(--mvp-blue)]" : "text-grey",
                  )}
                >
                  <PlazaGlyph name={tab.icon} className="h-9 w-9" />
                  {t(tab.label)}
                </a>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              className="mx-auto flex w-full flex-col items-center gap-1 text-[11px] font-medium text-grey"
              onClick={onOpenMenu}
              aria-label={t("More")}
            >
              <PlazaGlyph name="more" className="h-9 w-9" />
              {t("More")}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
