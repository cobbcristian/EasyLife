"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { UserAvatarMenu } from "@/components/layout/user-avatar-menu";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { PlazaPhoneChrome } from "@/components/layout/plaza-phone-chrome";
import { PlazaGlyph, plazaIconForNav } from "@/components/member/plaza-theme";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import type { PortalBrandSeed } from "@/lib/demo-branding";

export interface PortalNavItem {
  label: string;
  href: string;
  icon: string;
}

interface PortalShellProps {
  navItems: PortalNavItem[];
  homeHref: string;
  /** Fallback when session has not loaded yet */
  avatarName?: string;
  profileHref?: string;
  /** Sidebar / mobile eyebrow — e.g. "Board portal" */
  portalLabel: string;
  /** SSR seed so white-label portals never flash Easy Life before session loads */
  initialBrand?: PortalBrandSeed | null;
  children: React.ReactNode;
}

function phoneTabs(navItems: PortalNavItem[], homeHref: string) {
  const home = navItems.find((item) => item.href === homeHref) ?? navItems[0];
  const messages = navItems.find((item) => /messages/i.test(item.href));
  const middle =
    navItems.find((item) =>
      ["/pm/amenities", "/pm/bookings", "/board/announcements", "/board/scheduler"].includes(
        item.href,
      ),
    ) ?? navItems.find((item) => item !== home && item !== messages);
  return [home, middle, messages].filter((item): item is PortalNavItem => Boolean(item));
}

export function PortalShell({
  navItems,
  homeHref,
  avatarName: avatarNameProp = "User",
  portalLabel,
  initialBrand = null,
  children,
}: PortalShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();
  const profile = useSessionProfile();
  const avatarName = profile.name && profile.name !== "Member" ? profile.name : avatarNameProp;
  const productName =
    profile.appDisplayName?.trim() ||
    initialBrand?.productName ||
    "Easy Life";
  const logoUrl = profile.logoUrl || initialBrand?.logoUrl || null;
  const communityName =
    profile.communityName || initialBrand?.communityName || null;
  const whiteLabel = Boolean(productName !== "Easy Life" && logoUrl);

  const activeItem = useMemo(() => {
    return (
      navItems.find((item) =>
        item.href === homeHref
          ? pathname === homeHref
          : pathname === item.href || pathname.startsWith(`${item.href}/`),
      ) ?? null
    );
  }, [navItems, homeHref, pathname]);
  const activeNavLabel = activeItem?.label ?? portalLabel;
  const tabs = phoneTabs(navItems, homeHref);

  const navClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 rounded-full px-3 py-2.5 text-[15px] font-medium transition-colors",
      isActive
        ? "bg-[var(--mvp-blue)] text-white shadow-sm"
        : "text-ink hover:bg-white/70",
    );

  return (
    <div className="flex min-h-screen bg-white font-[family-name:var(--font-poppins)]">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/50 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-2 bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="plaza-chrome flex shrink-0 items-start justify-between gap-2 px-5 pb-4 pt-5 text-white">
          <div className="min-w-0">
            <UserAvatarMenu
              name={avatarName}
              align="left"
              homeHref={homeHref}
              trigger={
                <Logo
                  size="lg"
                  productName={productName}
                  communityLogoSrc={logoUrl}
                  communityName={communityName}
                  showCommunityName={false}
                />
              }
            />
            {whiteLabel ? (
              <p className="mt-1 truncate text-xs font-medium text-grey">
                {productName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-white hover:bg-white/20 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-3 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mvp-blue)]">
            {t(portalLabel)}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              const isActive =
                item.href === homeHref
                  ? pathname === homeHref
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={navClass(isActive)}
                  >
                    <PlazaGlyph name={plazaIconForNav(item.icon)} className="h-8 w-8" />
                    {t(item.label)}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border-2 px-4 py-4">
          <p className="mb-2 truncate px-1 text-xs text-grey">{avatarName}</p>
          <LanguageSwitcher />
        </div>
      </aside>

      <PlazaPhoneChrome
        productName={productName}
        logoUrl={logoUrl}
        communityName={communityName}
        accountName={avatarName}
        homeHref={homeHref}
        title={activeNavLabel}
        icon={plazaIconForNav(activeItem?.icon ?? "LayoutDashboard")}
        onOpenMenu={() => setOpen(true)}
        tabs={tabs.map((item) => ({
          href: item.href,
          label: /messages/i.test(item.href) ? "Messages" : item.href === homeHref ? "Home" : item.label,
          icon: plazaIconForNav(item.icon),
          exact: item.href === homeHref,
        }))}
      >
        {children}
      </PlazaPhoneChrome>
    </div>
  );
}
