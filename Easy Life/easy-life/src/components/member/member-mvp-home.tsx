"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { PlazaGlyph } from "@/components/member/plaza-theme";
import {
  brandAssets,
  imageForBookingRow,
  imageForEvent,
  imageForTournament,
} from "@/lib/brand-assets";
import { MemberMvpHomeSearch } from "@/components/member/member-mvp-home-search";
import {
  RESIDENTIAL_HOA_ACCOUNT_LINKS,
  UserAvatarMenu,
} from "@/components/layout/user-avatar-menu";
import { BrandStar } from "@/components/ui/brand-star";
import {
  communityHasClubDining,
  communityHasLocalPros,
  communityHasRentals,
  communityHasTournaments,
  communityIsResidentialHoa,
} from "@/lib/community-features";
import type { PlazaIconKey } from "@/components/member/plaza-theme";
import { useI18n } from "@/lib/i18n";
import { formatDate, isUpcomingItem } from "@/lib/utils";
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
  userRsvped?: boolean;
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

  for (const event of events.filter(
    (item) =>
      item.userRsvped !== false && isUpcomingItem(item.date, item.time),
  ).slice(0, 3)) {
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

  for (const booking of bookings
    .filter(
      (b) => b.status !== "cancelled" && isUpcomingItem(b.date, b.time),
    )
    .slice(0, 3)) {
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
    .filter((b) => isUpcomingItem(b.date, b.time))
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

  for (const tournament of tournaments
    .filter((t) => t.nextMatch?.opponent)
    .filter((t) =>
      isUpcomingItem(t.nextMatch?.date || t.date, t.nextMatch?.time),
    )
    .slice(0, 3)) {
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

type HeroConfig = {
  href: string;
  headline: string;
  sub1: string;
  sub2: string;
  cta: string;
  gradient: string;
  image: string;
};

function getHeroConfig(
  isResidentialHoa: boolean,
  hasRentals: boolean,
  hasClubDining: boolean,
): HeroConfig {
  if (isResidentialHoa) {
    return {
      href: "/member/visitors",
      headline: "Expecting Visitors?",
      sub1: "Register guests ahead of time.",
      sub2: "Fast check-in at the gate.",
      cta: "Register a Visitor",
      gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      image: "/brand/amenity-clubhouse.png",
    };
  }
  if (hasRentals) {
    return {
      href: "/member/rentals",
      headline: "Rent a Jetski and Make Waves",
      sub1: "Premium jetski rentals.",
      sub2: "Explore. Adventure. Repeat.",
      cta: "Book Your Jetski",
      gradient: "linear-gradient(135deg, #0a6ea8 0%, #1aa0d6 100%)",
      image: "/brand/plaza-hero-jetski.png",
    };
  }
  if (hasClubDining) {
    return {
      href: "/member/dining",
      headline: "Reserve Your Table",
      sub1: "Fresh seasonal menus.",
      sub2: "Book for lunch or dinner.",
      cta: "View Dining",
      gradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
      image: "/brand/featured-dining.png",
    };
  }
  return {
    href: "/member/bookings",
    headline: "Book a Court",
    sub1: "Tennis, pickleball, and more.",
    sub2: "Reserve your time slot today.",
    cta: "Reserve Now",
    gradient: "linear-gradient(135deg, #0a6ea8 0%, #1aa0d6 100%)",
    image: "/brand/amenity-tennis-clay.png",
  };
}

function HomeHeroBanner({
  isResidentialHoa,
  hasRentals,
  hasClubDining,
  t,
}: {
  isResidentialHoa: boolean;
  hasRentals: boolean;
  hasClubDining: boolean;
  t: (key: string) => string;
}) {
  const config = getHeroConfig(isResidentialHoa, hasRentals, hasClubDining);
  return (
    <Link
      href={config.href}
      className="grid min-h-[168px] grid-cols-[1.15fr_0.95fr] overflow-hidden rounded-[28px] shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
    >
      <div
        className="flex flex-col justify-center px-5 py-5 text-white"
        style={{ background: config.gradient }}
      >
        <p className="text-[22px] font-semibold leading-[1.15]">
          {t(config.headline)}
        </p>
        <p className="mt-2 text-[13px] leading-snug text-white/90">
          {t(config.sub1)}
          <br />
          {t(config.sub2)}
        </p>
        <span className="mt-4 inline-flex w-fit items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
          {t(config.cta)} →
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={config.image}
        alt=""
        className="h-full min-h-[168px] w-full object-cover"
      />
    </Link>
  );
}

/** Figma MVP Home / Home w/ service added (nodes 4616:17702, 4616:21865). */
export function MemberMvpHome({
  profileName,
  profileEmail,
  avatarSrc,
  clubName,
  communityId,
  paysHoa: _paysHoa = true, // Available for future use
  residencyStatus: _residencyStatus = "resident", // Available for future use
  featuredTiles,
  bookings,
  serviceBookings = [],
  events,
  tournaments = [],
  notificationCount = 0,
}: MemberMvpHomeProps) {
  const { t } = useI18n();
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
  const hasRentals = communityHasRentals(communityId);
  const emptyScheduleCta = isResidentialHoa
    ? "Book an amenity or service"
    : "Book a court or service";
  const featuredViewAllHref = isResidentialHoa
    ? "/member/local-pros"
    : isGolfClub
      ? "/member/bookings"
      : hasClubDining
        ? "/member/dining"
        : "/member/amenities";
  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <div
        className="relative px-3 pb-8 pt-3 lg:rounded-t-2xl"
        style={{
          background:
            "linear-gradient(168deg, #ff7a00 0%, #ff9f1a 22%, #f6c445 48%, #d4e04a 72%, #8ed63a 100%)",
        }}
      >
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-white hover:bg-white/10 lg:hidden"
              aria-label={t("Open menu")}
              onClick={() => window.dispatchEvent(new Event("member:open-sidebar"))}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/member/notifications"
                className="relative flex h-10 w-10 items-center justify-center"
                aria-label={
                  badgeCount > 0
                    ? `${badgeCount} ${t("Notifications")}`
                    : t("Notifications")
                }
              >
                <PlazaGlyph name="bell" className="h-10 w-10" />
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
                className="[&_button]:ring-2 [&_button]:ring-white/70"
              />
            </div>
          </div>
          <div className="mt-3">
            <MemberMvpHomeSearch communityId={communityId} />
          </div>
          <h1 className="mt-5 text-center text-[34px] font-semibold leading-tight text-white">
            {t("Hey")}, {firstName}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-4 pb-28 pt-6 md:pb-10">
        <section>
          <h2 className="mb-4 text-[22px] font-semibold text-black">{t("Explore")}</h2>
          <div className="grid grid-cols-4 gap-2">
            {(isResidentialHoa
              ? ([
                  { key: "people", label: "Visitors", href: "/member/visitors" },
                  { key: "reserve", label: "Amenities", href: "/member/amenities" },
                  { key: "pros", label: "Pros", href: "/member/local-pros" },
                  { key: "info", label: "Info", href: "/member/faq" },
                ] as Array<{ key: PlazaIconKey; label: string; href: string }>)
              : ([
                  { key: "reserve", label: "Reserve", href: "/member/bookings" },
                  ...(hasClubDining
                    ? [{ key: "dining" as PlazaIconKey, label: "Dining", href: "/member/dining" }]
                    : [{ key: "pros" as PlazaIconKey, label: "Pros", href: hasLocalPros ? "/member/local-pros" : "/member/service-requests" }]),
                  { key: "outings", label: "Outings", href: "/member/calendar" },
                  { key: "info", label: "Info", href: "/member/faq" },
                ] as Array<{ key: PlazaIconKey; label: string; href: string }>)
            ).map((tile) => (
              <Link key={tile.key} href={tile.href} className="flex flex-col items-center gap-2">
                <PlazaGlyph name={tile.key} />
                <span className="text-[13px] font-semibold text-black">{t(tile.label)}</span>
              </Link>
            ))}
          </div>
        </section>

        <HomeHeroBanner
          isResidentialHoa={isResidentialHoa}
          hasRentals={hasRentals}
          hasClubDining={hasClubDining}
          t={t}
        />

        {/* Featured — cards wider than half so the next one peeks */}
        {featured.length > 0 ? (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[21px] font-medium text-black">
                {t(isResidentialHoa ? "Sponsored" : "Featured")}
              </h2>
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
    </div>
  );
}
