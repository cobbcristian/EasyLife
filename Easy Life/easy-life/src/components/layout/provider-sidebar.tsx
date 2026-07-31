"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { NavIcon } from "@/components/ui/nav-icon";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useI18n } from "@/lib/i18n";
import { UserAvatarMenu } from "@/components/layout/user-avatar-menu";

const providerNav = [
  { label: "Dashboard", href: "/provider", icon: "LayoutDashboard", exact: true },
  { label: "Bookings", href: "/provider/bookings", icon: "CalendarCheck" },
  { label: "Clinics", href: "/provider/clinics", icon: "Users" },
  { label: "Services", href: "/provider/services", icon: "Briefcase" },
  { label: "Activities", href: "/provider/activities", icon: "Briefcase" },
  { label: "Messages", href: "/provider/messages", icon: "Mail", badgeKey: "messages" as const },
  { label: "Transactions", href: "/provider/transactions", icon: "CreditCard" },
  { label: "Account", href: "/provider/account", icon: "UserCircle" },
];

const providerSecondaryNav = [
  { label: "Calendar", href: "/provider/calendar", icon: "CalendarDays" },
  { label: "Community", href: "/provider/community", icon: "Users" },
  { label: "Promotions", href: "/provider/promotions", icon: "Tag" },
];

/** Dining-only secondary links (hidden for lawn / home-service providers). */
const providerDiningNav = [
  { label: "Menu", href: "/provider/menu", icon: "UtensilsCrossed" },
];

interface ProviderSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function ProviderSidebar({ open, onClose }: ProviderSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [showDiningMenu, setShowDiningMenu] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.logoUrl) setBrandLogo(d.logoUrl);
        if (d.appDisplayName) setBrandName(d.appDisplayName);
        const email = String(d.email ?? "").toLowerCase();
        // Menu is for dining providers only — hide for lawn / home-service demos.
        setShowDiningMenu(
          email.includes("dining") || email.includes("food") || email.includes("restaurant"),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/provider/messages")
      .then((r) => r.json())
      .then((d) => {
        const threads = d.threads ?? [];
        setUnreadMessages(threads.filter((thread: { unread: boolean }) => thread.unread).length);
      })
      .catch(() => setUnreadMessages(0));
  }, [pathname]);

  const moreNav = showDiningMenu
    ? [...providerSecondaryNav.slice(0, 2), ...providerDiningNav, ...providerSecondaryNav.slice(2)]
    : providerSecondaryNav;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/50 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-2 bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 px-5 pb-2 pt-5">
          <UserAvatarMenu
            name={t("Provider")}
            align="left"
            homeHref="/provider"
            trigger={
              <Logo
                size="md"
                communityLogoSrc={brandLogo}
                productName={brandName}
                showText={!brandLogo}
              />
            }
          />
          <button
            type="button"
            className="rounded-lg p-1.5 text-grey hover:bg-white/60 lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1.5">
            {providerNav.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge =
                item.badgeKey === "messages" && unreadMessages > 0 ? unreadMessages : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-full px-3 py-2.5 text-[15px] font-medium transition-colors",
                      isActive
                        ? "bg-[var(--mvp-blue)] text-white shadow-sm"
                        : "text-ink hover:bg-white/70",
                    )}
                  >
                    <NavIcon name={item.icon} active={isActive} />
                    <span className="flex-1">{t(item.label)}</span>
                    {badge > 0 ? (
                      <span
                        className={cn(
                          "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold",
                          isActive ? "bg-white text-[var(--mvp-blue)]" : "bg-[var(--mvp-blue)] text-white",
                        )}
                      >
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wide text-grey">
            {t("More")}
          </p>
          <ul className="space-y-1.5">
            {moreNav.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-full px-3 py-2.5 text-[15px] font-medium transition-colors",
                      isActive
                        ? "bg-[var(--mvp-blue)] text-white shadow-sm"
                        : "text-ink hover:bg-white/70",
                    )}
                  >
                    <NavIcon name={item.icon} active={isActive} />
                    {t(item.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border-2 p-4">
          <LanguageSwitcher />
        </div>
      </aside>
    </>
  );
}
