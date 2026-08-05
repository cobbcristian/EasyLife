"use client";

import { useRef } from "react";
import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import {
  brandAssets,
  homeCategoryTiles,
  imageForBookingRow,
  imageForEvent,
  imageForTournament,
} from "@/lib/brand-assets";
import { MemberMvpBottomNav } from "@/components/member/member-mvp-bottom-nav";
import { MemberMvpHomeSearch } from "@/components/member/member-mvp-home-search";
import {
  RESIDENTIAL_HOA_ACCOUNT_LINKS,
  UserAvatarMenu,
} from "@/components/layout/user-avatar-menu";
import { BrandStar } from "@/components/ui/brand-star";
import {
  communityHasClubDining,
  communityHasLocalPros,
  communityHasTournaments,
  communityHasVendors,
  communityIsResidentialHoa,
} from "@/lib/community-features";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface HomeBooking {
  id: string;
  amenity: string;
  date: string;
  time: string;
  status: string;
}

interface HomeServiceBooking {
  id: string;
  service: string;
  date: string;
  time: string;
  status: string;
}

interface HomeEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
}

interface HomeTournament {
  id: string;
  title: string;
  sport: string;
  date: string;
  status: string;
  nextMatch: {
    opponent: string;
    courtNumber?: number | null;
    courtLabel?: string;
    time?: string;
    date?: string;
  } | null;
}

export interface MemberMvpHomeProps {
  profileName: string;
  profileEmail?: string;
  avatarSrc?: string;
  clubName?: string;
  clubLogoSrc?: string | null;
  communityId?: string | null;
  /** On-property residents who pay assessments. Club-only members are false. */
  paysHoa?: boolean;
  residencyStatus?: "resident" | "non_resident" | string;
  featuredTiles?: Array<{
    key: string;
    label: string;
    sub: string;
    rating: string;
    price: string;
    image: string;
    href: string;
    sponsored?: boolean;
  }>;
  bookings: HomeBooking[];
  serviceBookings?: HomeServiceBooking[];
  events: HomeEvent[];
  tournaments?: HomeTournament[];
  notificationCount?: number;
}

type UpcomingRow = {
  id: string;
  title: string;
  date: string;
  time: string;
  statusLabel: string;
  statusTone: "going" | "reserved" | "pending";
  image: string;
  href: string;
};

function amenityStatusLabel(status: string): { label: string; tone: "reserved" | "pending" } {
  if (status === "pending" || status === "requested") {
    return { label: "Pending", tone: "pending" };
  }
  return { label: "Reserved", tone: "reserved" };
}

function buildUpcomingRows(
  bookings: HomeBooking[],
  events: HomeEvent[],
  serviceBookings: HomeServiceBooking[],
  tournaments: HomeTournament[],
): UpcomingRow[] {
  const rows: UpcomingRow[] = [];

  for (const event of events.slice(0, 3)) {
    rows.push({
      id: `event-${event.id}`,
      title: event.title,
      date: event.date,
      time: event.time,
      statusLabel: "Going",
      statusTone: "going",
      image: imageForEvent(event.category, event.title),
      href: "/member/calendar",
    });
  }

  for (const booking of bookings.filter((b) => b.status !== "cancelled").slice(0, 3)) {
    const { label, tone } = amenityStatusLabel(booking.status);
    rows.push({
      id: `booking-${booking.id}`,
      title: booking.amenity,
      date: booking.date,
      time: booking.time,
      statusLabel: label,
      statusTone: tone,
      image: imageForBookingRow(booking.amenity),
      href: "/member/bookings",
    });
  }

  for (const service of serviceBookings
    .filter((b) => b.date >= new Date().toISOString().slice(0, 10))
    .slice(0, 3)) {
    rows.push({
      id: `service-${service.id}`,
      title: service.service,
      date: service.date,
      time: service.time,
      statusLabel: service.status === "accepted" ? "Accepted" : "Pending",
      statusTone: "pending",
      image: imageForBookingRow(service.service),
      href: `/member/service-bookings/${service.id}`,
    });
  }

  for (const tournament of tournaments.filter((t) => t.nextMatch?.opponent).slice(0, 3)) {
    const match = tournament.nextMatch!;
    const courtPart =
      tournament.sport.toLowerCase() === "tennis" && match.courtLabel
        ? match.courtLabel
        : match.courtLabel || "";
    const titleParts = [
      courtPart,
      match.time,
      `vs ${match.opponent}`,
    ].filter(Boolean);
    rows.push({
      id: `tournament-${tournament.id}`,
      title: `${tournament.title}: ${titleParts.join(" · ")}`,
      date: match.date || tournament.date,
      time: match.time || "",
      statusLabel: "Match",
      statusTone: "going",
      image: imageForTournament(tournament.sport),
      href: "/member/tournaments",
    });
  }

  return rows
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 5);
}

/** Figma MVP Home / Home w/ service added (nodes 4616:17702, 4616:21865). */
export function MemberMvpHome({
  profileName,
  profileEmail,
  avatarSrc,
  clubName,
  communityId,
  paysHoa = true,
  residencyStatus = "resident",
  featuredTiles,
  bookings,
  serviceBookings = [],
  events,
  tournaments = [],
  notificationCount = 0,
}: MemberMvpHomeProps) {
  const { t } = useI18n();
  const categoryScrollerRef = useRef<HTMLDivElement>(null);
  const firstName = profileName.split(" ")[0] ?? profileName;
  const accountLinks = communityIsResidentialHoa(communityId)
    ? RESIDENTIAL_HOA_ACCOUNT_LINKS
    : undefined;
  const hasTournaments = communityHasTournaments(communityId);
  const upcoming = buildUpcomingRows(
    bookings,
    events,
    serviceBookings,
    hasTournaments ? tournaments : [],
  );
  const featured = (featuredTiles ?? []).filter((tile) => tile.sponsored === true);
  const badgeCount = Math.max(0, Math.floor(notificationCount));
  const isGolfClub = communityId === "spanish-wells";
  const isResidentialHoa =
    communityIsResidentialHoa(communityId) || /oceanside/i.test(clubName ?? "");
  const hasClubDining = communityHasClubDining(communityId);
  const hasLocalPros = communityHasLocalPros(communityId);
  const hasVendors = communityHasVendors(communityId);
  const emptyScheduleCta = isResidentialHoa
    ? "Book an amenity or service"
    : "Book a court or service";
  const featuredViewAllHref = isGolfClub
    ? "/member/bookings"
    : hasClubDining
      ? "/member/dining"
      : "/member/amenities";
  const showHoa = paysHoa && residencyStatus !== "non_resident";
  const categoryTiles = homeCategoryTiles
    .filter((tile) => {
      if (!showHoa && tile.key === "hoa") return false;
      if (!hasClubDining && tile.key === "food") return false;
      // Club vendors / Local Pros: hide Services when neither marketplace is on.
      // Condo HOAs still get Services → maintenance / service requests.
      if (
        tile.key === "services" &&
        !isResidentialHoa &&
        !hasLocalPros &&
        !hasVendors
      ) {
        return false;
      }
      return true;
    })
    .map((tile) => {
      if (tile.key === "services" && isResidentialHoa) {
        return {
          ...tile,
          href: "/member/service-requests",
        };
      }
      if (tile.key === "hoa" && isResidentialHoa) {
        return {
          ...tile,
          // Plaza tower — never the generic golf clubhouse manor.
          image: brandAssets.communityOceansideBuilding,
          href: "/member/payments",
        };
      }
      if (tile.key !== "hoa" || !isGolfClub) return tile;
      return { ...tile, label: "Dues", href: "/member/payments" };
    });
  const accessLabel = isResidentialHoa
    ? null
    : showHoa
      ? t("Resident · pays HOA")
      : t("Club member · no HOA");

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      {/* Blue header — greeting + actions (community name lives in native/portal chrome) */}
      <div className="relative bg-[var(--mvp-blue)] px-3 pb-7 pt-3 lg:rounded-t-2xl">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-white hover:bg-white/10 lg:hidden"
              aria-label={t("Open menu")}
              onClick={() => window.dispatchEvent(new Event("member:open-sidebar"))}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="truncate text-[22px] font-medium leading-tight text-white">
                {t("Hi")}, {firstName}
              </h1>
              {accessLabel ? (
                <p className="mt-0.5 truncate text-[12px] font-medium text-white/85">
                  {accessLabel}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/member/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15"
                aria-label={
                  badgeCount > 0
                    ? `${badgeCount} ${t("Notifications")}`
                    : t("Notifications")
                }
              >
                <Bell className="h-5 w-5 text-white" strokeWidth={1.75} />
                {badgeCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3b30] px-1 text-[10px] font-bold leading-none text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                ) : null}
              </Link>
              <UserAvatarMenu
                name={profileName}
                email={profileEmail}
                avatarSrc={avatarSrc ?? brandAssets.memberAvatar}
                links={accountLinks}
                className="[&_button]:ring-2 [&_button]:ring-white/40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search overlaps header */}
      <div className="relative z-10 mx-auto -mt-4 max-w-lg px-4">
        <MemberMvpHomeSearch communityId={communityId} />
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-4 pb-28 pt-5 md:pb-10">
        {/* Categories — size so ~3 tiles + HOA peek (scroll cue) */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[21px] font-medium text-black">{t("Categories")}</h2>
            {categoryTiles.length >= 3 ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-ink shadow-sm active:bg-[#f3f4f6]"
                  aria-label={t("Previous")}
                  onClick={() => {
                    categoryScrollerRef.current?.scrollBy({
                      left: -150,
                      behavior: "smooth",
                    });
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-ink shadow-sm active:bg-[#f3f4f6]"
                  aria-label={t("Next")}
                  onClick={() => {
                    categoryScrollerRef.current?.scrollBy({
                      left: 150,
                      behavior: "smooth",
                    });
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
          <div
            ref={categoryScrollerRef}
            className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-none"
          >
            {categoryTiles.map((tile) => (
              <Link
                key={tile.key}
                href={tile.href}
                className="relative h-20 w-[138px] shrink-0 snap-start overflow-hidden rounded-lg"
                style={{ backgroundColor: tile.bg }}
              >
                <span className="absolute left-2.5 top-3 text-base font-medium text-white">
                  {t(tile.label)}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tile.image}
                  alt=""
                  className="absolute bottom-0 right-0 h-[72px] w-auto max-w-[55%] object-contain object-bottom"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* Featured — cards wider than half so the next one peeks */}
        {featured.length > 0 ? (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[21px] font-medium text-black">{t("Featured")}</h2>
              <Link href={featuredViewAllHref} className="text-[11px] text-[var(--mvp-blue)]">
                {t("View all")}
              </Link>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-none">
              {featured.map((tile) => (
                <Link
                  key={tile.key}
                  href={tile.href}
                  className="relative h-[164px] w-[255px] shrink-0 snap-start overflow-hidden rounded-lg shadow-[0_5px_20px_rgba(0,0,0,0.1)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tile.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(0.35deg, rgba(0,0,0,0.75) 0.39%, rgba(0,0,0,0) 99.5%)",
                    }}
                  />
                  <span className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {t("Sponsored")}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-white">
                    <div>
                      <p className="text-base font-medium">{t(tile.label)}</p>
                      <p className="text-[10px] font-light">{t(tile.sub)}</p>
                      <p className="mt-0.5 text-[10px] font-light">{tile.price}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium">
                      {tile.rating}
                      <BrandStar className="h-2.5 w-2.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Upcoming — includes amenity + service bookings (Figma Home w/ service added) */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[21px] font-medium text-black">{t("Upcoming")}</h2>
            <Link href="/member/bookings" className="text-[11px] text-[var(--mvp-blue)]">
              {t("View all")}
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <Link
              href="/member/bookings"
              className="block rounded-xl bg-[#F7F8FA] p-4"
            >
              <p className="text-[15px] font-semibold text-ink">{t("Nothing scheduled yet.")}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--mvp-blue)]">
                {t(emptyScheduleCta)} →
              </p>
            </Link>
          ) : (
            <ul className="space-y-4">
              {upcoming.map((row) => (
                <li key={row.id}>
                  <Link href={row.href} className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.image}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-black">{row.title}</p>
                      <p
                        className={cn(
                          "mt-1 text-xs capitalize",
                          row.statusTone === "going" && "text-[var(--mvp-status-going)]",
                          row.statusTone === "reserved" && "text-[var(--mvp-status-reserved)]",
                          row.statusTone === "pending" && "text-[var(--mvp-status-pending)]",
                        )}
                      >
                        {t(row.statusLabel)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-[#262626]">
                      <p>{formatDate(row.date)}</p>
                      <p className="mt-1">{row.time}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <MemberMvpBottomNav />
    </div>
  );
}
