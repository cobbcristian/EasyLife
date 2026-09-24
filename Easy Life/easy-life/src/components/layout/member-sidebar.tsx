"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { GlobalSearch } from "@/components/search/global-search";
import { UserAvatarMenu } from "@/components/layout/user-avatar-menu";
import {
  communityHasClubDining,
  communityHasGrabGo,
  communityHasHouseholdMembership,
  communityHasLocalPros,
  communityHasRentals,
  communityHasRewards,
  communityHasTournaments,
  communityHasTramService,
  communityHasVendors,
  communityHasBookingWaitlist,
  communityHasActivityCheckIn,
  communityHasFundraising,
  communityIsResidentialHoa,
} from "@/lib/community-features";
import { useI18n } from "@/lib/i18n";
import { avatarForReviewer, preferInitialsAvatar } from "@/lib/brand-assets";
import { plazaIconForHref, PlazaGlyph } from "@/components/member/plaza-theme";

const clubDiningHrefs = new Set(["/member/dining"]);
const grabGoHrefs = new Set(["/member/grab-go"]);
const localProsHrefs = new Set(["/member/local-pros"]);
const vendorsHrefs = new Set(["/member/vendors"]);
const tournamentsHrefs = new Set(["/member/tournaments"]);
const rentalsHrefs = new Set(["/member/rentals"]);
const householdMembershipHrefs = new Set(["/member/household"]);
const tramHrefs = new Set(["/member/tram"]);
const rewardsHrefs = new Set(["/member/rewards"]);
const waitlistHrefs = new Set(["/member/waitlist"]);
const checkInHrefs = new Set(["/member/check-in"]);
const fundraisingHrefs = new Set(["/member/fundraising"]);

type NavItem = { label: string; href: string; icon: string };

/**
 * Pinned "Do this" items for Residential HOA communities.
 * Each item includes the feature flag that must be true for it to show.
 * Flags mirror the existing sidebar gating in community-features.ts.
 */
const hoaPinnedItems: Array<NavItem & { isEnabled: (communityId: string | null | undefined, paysHoa: boolean) => boolean }> = [
  // Visitors: only for residential HOA (gated by residentialOnlyHrefs in sidebar)
  { label: "Visitors", href: "/member/visitors", icon: "UserPlus", isEnabled: (cid) => communityIsResidentialHoa(cid) },
  // Violations: always available for HOA communities (no specific flag)
  { label: "Violations", href: "/member/violations", icon: "AlertTriangle", isEnabled: () => true },
  // Documents: always available (no specific flag)
  { label: "Documents", href: "/member/documents", icon: "FileText", isEnabled: () => true },
  // Payments: shown for HOA residents who pay HOA (gated by hoaOnlyHrefs + paysHoa)
  { label: "Payments", href: "/member/payments", icon: "CreditCard", isEnabled: (_cid, paysHoa) => paysHoa },
  // Service Requests: shown for HOA residents who pay HOA (gated by hoaOnlyHrefs)
  { label: "Service Requests", href: "/member/service-requests", icon: "Wrench", isEnabled: (_cid, paysHoa) => paysHoa },
];

/**
 * Pinned "Do this" items for Club communities.
 * Each item includes the feature flag that must be true for it to show.
 * Flags mirror the existing sidebar gating in community-features.ts.
 */
const clubPinnedItems: Array<NavItem & { isEnabled: (communityId: string | null | undefined, paysHoa: boolean) => boolean }> = [
  // Book: always available for clubs
  { label: "Book", href: "/member/bookings", icon: "CalendarCheck", isEnabled: () => true },
  // Dining: gated by communityHasClubDining (off for oceanside-residents)
  { label: "Dining", href: "/member/dining", icon: "Utensils", isEnabled: (cid) => communityHasClubDining(cid) },
  // Tournaments: gated by communityHasTournaments (off for oceanside-residents)
  { label: "Tournaments", href: "/member/tournaments", icon: "Trophy", isEnabled: (cid) => communityHasTournaments(cid) },
  // Check in: gated by communityHasActivityCheckIn (always true currently)
  { label: "Check in", href: "/member/check-in", icon: "MapPin", isEnabled: (cid) => communityHasActivityCheckIn(cid) },
];

/** Primary life-first nav — matches mobile: Home / Book / Calendar / Connect / Payments. */
const primaryNav = [
  { label: "Home", href: "/member", icon: "LayoutDashboard" },
  { label: "Assistant", href: "/member/assistant", icon: "Sparkles" },
  { label: "Book", href: "/member/bookings", icon: "CalendarCheck" },
  { label: "Hours", href: "/member/hours", icon: "CalendarDays" },
  { label: "Calendar", href: "/member/calendar", icon: "CalendarDays" },
  { label: "Messages", href: "/member/messages", icon: "MessageCircle" },
  { label: "Payments", href: "/member/payments", icon: "CreditCard" },
  { label: "Household", href: "/member/household", icon: "Users" },
  { label: "Membership", href: "/member/membership", icon: "Award" },
  { label: "Profile", href: "/member/profile", icon: "UserCircle" },
];

/** On-property / HOA-only — hidden for club-only (non-resident) members. */
const hoaOnlyHrefs = new Set([
  "/member/service-requests",
  "/member/properties",
  "/member/real-estate",
  "/member/newsletter",
  "/member/payments",
]);

const moreNav = [
  { label: "Notifications", href: "/member/notifications", icon: "Bell" },
  { label: "Visitor", href: "/member/visitors", icon: "UserPlus" },
  { label: "Favorites", href: "/member/favorites", icon: "Star" },
  { label: "Announcements", href: "/member/announcements", icon: "Megaphone" },
  { label: "Tram Service", href: "/member/tram", icon: "Bus" },
  { label: "Packages", href: "/member/packages", icon: "Package" },
  { label: "Violations", href: "/member/violations", icon: "AlertTriangle" },
  { label: "Help & FAQ", href: "/member/faq", icon: "HelpCircle" },
  { label: "Dining", href: "/member/dining", icon: "Utensils" },
  { label: "Waitlist", href: "/member/waitlist", icon: "Clock" },
  { label: "Check in", href: "/member/check-in", icon: "MapPin" },
  { label: "Fundraising", href: "/member/fundraising", icon: "Heart" },
  { label: "Activities", href: "/member/activities", icon: "Sparkles" },
  { label: "Grab & Go", href: "/member/grab-go", icon: "ShoppingBag" },
  { label: "Local Pros", href: "/member/local-pros", icon: "Sparkles" },
  { label: "Vendors", href: "/member/vendors", icon: "Store" },
  { label: "Tournaments", href: "/member/tournaments", icon: "Trophy" },
  { label: "Groups", href: "/member/groups", icon: "UsersRound" },
  { label: "Directory", href: "/member/directory", icon: "Users" },
  { label: "Documents", href: "/member/documents", icon: "FileText" },
  { label: "Service Requests", href: "/member/service-requests", icon: "Wrench" },
  { label: "Club Apparel", href: "/member/apparel", icon: "Shirt" },
  { label: "Rentals", href: "/member/rentals", icon: "Bike" },
  { label: "Rewards", href: "/member/rewards", icon: "Award" },
  { label: "Marketplace", href: "/member/marketplace", icon: "ShoppingBag" },
  { label: "Blog", href: "/member/blog", icon: "Newspaper" },
  { label: "Gallery", href: "/member/gallery", icon: "Image" },
  { label: "Properties", href: "/member/properties", icon: "Building2" },
  { label: "Real Estate", href: "/member/real-estate", icon: "Home" },
  { label: "Contact", href: "/member/contact", icon: "Mail" },
];

/** HOA section — dues, newsletter, building ops. */
const hoaNav = [
  { label: "Payments", href: "/member/payments", icon: "CreditCard" },
  { label: "Newsletter", href: "/member/newsletter", icon: "Mail" },
  { label: "Service Requests", href: "/member/service-requests", icon: "Wrench" },
  { label: "Documents", href: "/member/documents", icon: "FileText" },
];

const residentialOnlyHrefs = new Set(["/member/visitors"]);

function NavList({
  items,
  pathname,
  onClose,
  t,
}: {
  items: typeof primaryNav;
  pathname: string;
  onClose: () => void;
  t: (s: string) => string;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const isActive =
          item.href === "/member"
            ? pathname === "/member"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const plazaIcon = plazaIconForHref(item.href);
        return (
          <li key={item.href}>
            <a
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                isActive
                  ? "bg-[var(--mvp-blue)] text-white shadow-sm"
                  : "text-ink hover:bg-white/70",
              )}
            >
              <PlazaGlyph name={plazaIcon} className="h-8 w-8" />
              {t(item.label)}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function MemberSidebar({
  open,
  onClose,
  appName,
  logoUrl,
  userName = "Member",
  avatarSrc,
  communityId: communityIdProp,
}: {
  open: boolean;
  onClose: () => void;
  appName?: string;
  logoUrl?: string | null;
  userName?: string;
  avatarSrc?: string;
  communityId?: string | null;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const displayAvatar = preferInitialsAvatar(userName)
    ? undefined
    : (avatarSrc ?? avatarForReviewer(userName || "Member"));
  const [paysHoa, setPaysHoa] = useState(true);
  const [communityId, setCommunityId] = useState<string | null | undefined>(
    communityIdProp,
  );
  const hasClubDining = communityHasClubDining(communityId);
  const hasGrabGo = communityHasGrabGo(communityId);
  const hasLocalPros = communityHasLocalPros(communityId);
  const hasVendors = communityHasVendors(communityId);
  const hasTournaments = communityHasTournaments(communityId);
  const hasRentals = communityHasRentals(communityId);
  const hasHouseholdMembership = communityHasHouseholdMembership(communityId);
  const hasTram = communityHasTramService(communityId);
  const hasRewards = communityHasRewards(communityId);
  const hasWaitlist = communityHasBookingWaitlist(communityId);
  const hasCheckIn = communityHasActivityCheckIn(communityId);
  const hasFundraising = communityHasFundraising(communityId);
  const productName = appName?.trim() || "Easy Life";
  const isWhiteLabel = Boolean(productName !== "Easy Life" && logoUrl);
  // Prefer DB/session community id; also treat Oceanside white-label as residential
  // so "Resident · pays HOA" never flashes when communityId is still loading.
  const isResidentialHoa =
    communityIsResidentialHoa(communityId) ||
    /oceanside/i.test(productName);
  const tramEnabled = hasTram && !isResidentialHoa;
  const visiblePrimaryNav = primaryNav
    .filter((item) => {
      if (!hasHouseholdMembership && householdMembershipHrefs.has(item.href)) {
        return false;
      }
      // Residential HOA: Payments + Newsletter live under the HOA section below.
      if (
        isResidentialHoa &&
        paysHoa &&
        (item.href === "/member/payments" || item.href === "/member/newsletter")
      ) {
        return false;
      }
      return true;
    })
    .map((item) =>
      isResidentialHoa && item.href === "/member/membership"
        ? { ...item, label: "Your access" }
        : item,
    );
  // Build pinned "Do this" items based on community type, respecting feature flags
  const pinnedItems = isResidentialHoa
    ? hoaPinnedItems.filter((item) => item.isEnabled(communityId, paysHoa))
    : clubPinnedItems.filter((item) => item.isEnabled(communityId, paysHoa));
  const pinnedHrefs = new Set(pinnedItems.map((i) => i.href));

  // Filter primaryNav to exclude pinned items (no duplicates)
  const visiblePrimaryNavFiltered = visiblePrimaryNav.filter(
    (item) => !pinnedHrefs.has(item.href)
  );

  const visibleHoaNav =
    isResidentialHoa && paysHoa
      ? hoaNav.filter((item) => !pinnedHrefs.has(item.href))
      : [];
  const hoaHrefSet = new Set(visibleHoaNav.map((i) => i.href));

  // Filter moreNav to exclude pinned items (they go in "Do this") and respect feature flags
  const visibleMoreNav = moreNav.filter((item) => {
    // Exclude items that are in the pinned section
    if (pinnedHrefs.has(item.href)) return false;
    if (hoaHrefSet.has(item.href)) return false;
    if (!paysHoa && hoaOnlyHrefs.has(item.href)) return false;
    if (!isResidentialHoa && residentialOnlyHrefs.has(item.href)) return false;
    if (!hasClubDining && clubDiningHrefs.has(item.href)) return false;
    if (!hasGrabGo && grabGoHrefs.has(item.href)) return false;
    if (!hasLocalPros && localProsHrefs.has(item.href)) return false;
    if (!hasVendors && vendorsHrefs.has(item.href)) return false;
    if (!hasTournaments && tournamentsHrefs.has(item.href)) return false;
    if (!hasRentals && rentalsHrefs.has(item.href)) return false;
    if (!tramEnabled && tramHrefs.has(item.href)) return false;
    if (!hasRewards && rewardsHrefs.has(item.href)) return false;
    if (!hasWaitlist && waitlistHrefs.has(item.href)) return false;
    if (!hasCheckIn && checkInHrefs.has(item.href)) return false;
    if (!hasFundraising && fundraisingHrefs.has(item.href)) return false;
    return true;
  });
  const hoaActive = visibleHoaNav.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const pinnedActive = pinnedItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const browseActive = visiblePrimaryNavFiltered.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ) || visibleMoreNav.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const [hoaOpen, setHoaOpen] = useState(hoaActive || isResidentialHoa);
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [browseOpen, setBrowseOpen] = useState(browseActive);

  useEffect(() => {
    setCommunityId(communityIdProp);
  }, [communityIdProp]);

  useEffect(() => {
    let on = true;
    fetch("/api/member/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!on) return;
        const residency = d.residencyStatus as string | undefined;
        const hoa = d.paysHoa as boolean | undefined;
        setPaysHoa(residency === "non_resident" ? false : hoa !== false);
        if (typeof d.communityId === "string" && d.communityId) {
          setCommunityId(d.communityId);
        }
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

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
        <div className="plaza-chrome flex shrink-0 items-start justify-between gap-2 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <UserAvatarMenu
              name={userName}
              avatarSrc={displayAvatar}
              align="left"
              homeHref="/member"
              trigger={
                <Logo
                  size="md"
                  productName={productName}
                  communityLogoSrc={logoUrl}
                  communityName={appName}
                  showCommunityName={false}
                />
              }
            />
            {isWhiteLabel && appName && appName !== "Easy Life" ? (
              <p className="mt-1 truncate text-xs font-medium text-grey">{appName}</p>
            ) : null}
            {!isResidentialHoa ? (
              <p className="mt-1 text-[11px] font-medium text-grey">
                {paysHoa ? t("Resident · pays HOA") : t("Club member · no HOA")}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-white hover:bg-white/20 lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pb-3">
          <GlobalSearch className="w-full" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label={t("Member navigation")}>
          {/* Pinned "Do this" section — FIRST, right after search, community-type-aware quick actions */}
          {pinnedItems.length > 0 ? (
            <section aria-labelledby="do-this-heading">
              <h2
                id="do-this-heading"
                className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-grey"
              >
                <button
                  type="button"
                  onClick={() => setPinnedOpen((v) => !v)}
                  className="flex w-full items-center justify-between hover:bg-white/60 rounded-lg -mx-3 -my-2 px-3 py-2"
                  aria-expanded={pinnedOpen}
                  aria-controls="do-this-list"
                >
                  {t("Do this")}
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", pinnedOpen && "rotate-180")}
                  />
                </button>
              </h2>
              {pinnedOpen ? (
                <div id="do-this-list">
                  <NavList
                    items={pinnedItems}
                    pathname={pathname}
                    onClose={onClose}
                    t={t}
                  />
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Browse section — contains everything else */}
          <section className="mt-4 border-t border-border-2 pt-3" aria-labelledby="browse-heading">
            <h2
              id="browse-heading"
              className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-grey"
            >
              <button
                type="button"
                onClick={() => setBrowseOpen((v) => !v)}
                className="flex w-full items-center justify-between hover:bg-white/60 rounded-lg -mx-3 -my-2 px-3 py-2"
                aria-expanded={browseOpen}
                aria-controls="browse-list"
              >
                {t("Browse")}
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", browseOpen && "rotate-180")}
                />
              </button>
            </h2>
            {browseOpen ? (
              <div id="browse-list">
                {/* Primary navigation items (Home, Calendar, Messages, etc.) */}
                <NavList
                  items={visiblePrimaryNavFiltered}
                  pathname={pathname}
                  onClose={onClose}
                  t={t}
                />

                {/* HOA-specific items for residential communities */}
                {visibleHoaNav.length > 0 ? (
                  <div className="mt-3 border-t border-border-2 pt-3" role="group" aria-labelledby="hoa-subheading">
                    <button
                      type="button"
                      id="hoa-subheading"
                      onClick={() => setHoaOpen((v) => !v)}
                      className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-grey/70 hover:bg-white/60"
                      aria-expanded={hoaOpen}
                    >
                      {t("HOA")}
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 transition-transform", hoaOpen && "rotate-180")}
                      />
                    </button>
                    {hoaOpen ? (
                      <NavList
                        items={visibleHoaNav}
                        pathname={pathname}
                        onClose={onClose}
                        t={t}
                      />
                    ) : null}
                  </div>
                ) : null}

                {/* More items */}
                {visibleMoreNav.length > 0 ? (
                  <div className="mt-3">
                    <NavList items={visibleMoreNav} pathname={pathname} onClose={onClose} t={t} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </nav>

        <div className="border-t border-border-2 p-4">
          <LanguageSwitcher />
        </div>
      </aside>
    </>
  );
}
