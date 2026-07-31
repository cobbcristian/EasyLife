"use client";

import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import {
  brandAssets,
  homeCategoryTiles,
  imageForBookingRow,
  imageForEvent,
  imageForTournament,
} from "@/lib/brand-assets";
import { MemberMvpBottomNav } from "@/components/member/member-mvp-bottom-nav";
import { MemberMvpHomeSearch } from "@/components/member/member-mvp-home-search";
import { ForYouInsights } from "@/components/member/for-you-insights";
import { UserAvatarMenu } from "@/components/layout/user-avatar-menu";
import { BrandStar } from "@/components/ui/brand-star";
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
  avatarSrc?: string;
  clubName?: string;
  clubLogoSrc?: string | null;
  communityId?: string | null;
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
  avatarSrc,
  clubName,
  clubLogoSrc,
  communityId,
  featuredTiles,
  bookings,
  serviceBookings = [],
  events,
  tournaments = [],
  notificationCount = 0,
}: MemberMvpHomeProps) {
  const { t } = useI18n();
  const firstName = profileName.split(" ")[0] ?? profileName;
  const upcoming = buildUpcomingRows(bookings, events, serviceBookings, tournaments);
  const featured = (featuredTiles ?? []).filter((tile) => tile.sponsored === true);
  const badgeCount = Math.max(0, Math.floor(notificationCount));
  const isGolfClub = communityId === "spanish-wells";
  const bookSubtitle = isGolfClub
    ? "Tee times · Courts · Spa"
    : "Courts · Spa · Clubhouse";
  const featuredViewAllHref = isGolfClub ? "/member/bookings" : "/member/dining";
  const categoryTiles = homeCategoryTiles.map((tile) => {
    if (tile.key !== "hoa" || !isGolfClub) return tile;
    return { ...tile, label: "Dues", href: "/member/payments" };
  });

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      {/* Blue header band */}
      <div className="relative bg-[var(--mvp-blue)] px-4 pb-14 pt-6 lg:rounded-t-2xl">
        <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              className="rounded-lg p-1.5 text-white hover:bg-white/10 lg:hidden"
              aria-label={t("Open menu")}
              onClick={() => window.dispatchEvent(new Event("member:open-sidebar"))}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              {clubLogoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clubLogoSrc}
                  alt={clubName ?? ""}
                  className="mb-2 h-12 w-auto max-w-[190px] rounded-lg bg-white px-2 py-1 object-contain"
                />
              ) : null}
              <h1 className="truncate text-[25px] font-medium leading-tight text-white">
                {t("Hi")}, {firstName}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <Link
              href="/member/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
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
              avatarSrc={avatarSrc ?? brandAssets.memberAvatar}
              className="[&_button]:ring-2 [&_button]:ring-white/40"
            />
          </div>
        </div>
      </div>

      {/* Search overlaps header */}
      <div className="relative z-10 mx-auto -mt-6 max-w-lg px-4">
        <MemberMvpHomeSearch communityId={communityId} />
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-4 pb-28 pt-5 md:pb-10">
        <ForYouInsights />

        {/* Next up + Book — life-first entry */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[21px] font-medium text-black">{t("Next up")}</h2>
            <Link href="/member/calendar" className="text-[11px] text-[var(--mvp-blue)]">
              {t("See calendar")}
            </Link>
          </div>
          {upcoming[0] ? (
            <Link
              href={upcoming[0].href}
              className="flex gap-3 rounded-xl bg-[#F7F8FA] p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={upcoming[0].image}
                alt=""
                className="h-[72px] w-[72px] rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">
                  {upcoming[0].title}
                </p>
                <p className="mt-1 text-[13px] text-grey">
                  {formatDate(upcoming[0].date)}
                  {upcoming[0].time ? ` · ${upcoming[0].time}` : ""}
                </p>
                <p
                  className={cn(
                    "mt-1 text-[12px] font-semibold",
                    upcoming[0].statusTone === "going" && "text-[var(--mvp-blue)]",
                    upcoming[0].statusTone === "reserved" && "text-[var(--mvp-status-going)]",
                    upcoming[0].statusTone === "pending" && "text-amber-600",
                  )}
                >
                  {t(upcoming[0].statusLabel)}
                </p>
              </div>
            </Link>
          ) : (
            <Link
              href="/member/bookings"
              className="block rounded-xl bg-[#F7F8FA] p-4"
            >
              <p className="text-[15px] font-semibold text-ink">{t("Nothing scheduled")}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--mvp-blue)]">
                {t("Book a court or service")} →
              </p>
            </Link>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/member/bookings"
            className="rounded-xl bg-[var(--mvp-blue)] p-4 text-white"
          >
            <p className="text-[16px] font-semibold">{t("Book")}</p>
            <p className="mt-1 text-[12px] text-white/90">
              {t(bookSubtitle)}
            </p>
          </Link>
          <Link
            href="/member/payments"
            className="rounded-xl border border-[#eceff3] bg-white p-4"
          >
            <p className="text-[16px] font-semibold text-ink">{t("Pay")}</p>
            <p className="mt-1 text-[12px] text-grey">
              {t("Dues and statements")}
            </p>
          </Link>
          <Link
            href="/member/messages"
            className="rounded-xl border border-[#eceff3] bg-white p-4"
          >
            <p className="text-[16px] font-semibold text-ink">{t("Messages")}</p>
            <p className="mt-1 text-[12px] text-grey">
              {t("Neighbors and staff")}
            </p>
          </Link>
          <Link
            href="/member/dining"
            className="rounded-xl border border-[#eceff3] bg-white p-4"
          >
            <p className="text-[16px] font-semibold text-ink">{t("Dining")}</p>
            <p className="mt-1 text-[12px] text-grey">
              {t("Menus and reservations")}
            </p>
          </Link>
        </section>

        {/* Categories — horizontal scroll */}
        <section>
          <h2 className="mb-3 text-[21px] font-medium text-black">{t("Categories")}</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
            {categoryTiles.map((tile) => (
              <Link
                key={tile.key}
                href={tile.href}
                className="relative h-20 w-[156px] shrink-0 overflow-hidden rounded-lg"
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

        {/* Featured — paid placements only; hide when empty so demos stay polished */}
        {featured.length > 0 ? (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[21px] font-medium text-black">{t("Featured")}</h2>
              <Link href={featuredViewAllHref} className="text-[11px] text-[var(--mvp-blue)]">
                {t("View all")}
              </Link>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
              {featured.map((tile) => (
                <Link
                  key={tile.key}
                  href={tile.href}
                  className="relative h-[164px] w-[242px] shrink-0 overflow-hidden rounded-lg shadow-[0_5px_20px_rgba(0,0,0,0.1)]"
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
                {t("Book a court or service")} →
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
