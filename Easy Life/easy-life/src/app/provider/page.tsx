"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, CalendarDays, ChevronRight, Mail, User } from "lucide-react";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import { LogoutButton } from "@/components/auth/logout-button";
import { brandAssets, defaultAvatarForRole } from "@/lib/brand-assets";
import { useI18n } from "@/lib/i18n";
import { isActiveServiceBooking, type ServiceBookingStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface BookingRow {
  id: string;
  resident: string;
  service: string;
  date: string;
  time: string;
  status: ServiceBookingStatus;
  amount: number;
}

const mobileHubLinks = [
  { href: "/provider/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/provider/services", label: "Services", icon: Briefcase },
  { href: "/provider/messages", label: "Messages", icon: Mail, badgeKey: "messages" as const },
  { href: "/provider/account", label: "Account", icon: User },
] as const;

/** Figma Multi Series Pie colors (4616:14102). */
const SERVICE_MIX_COLORS = ["#007aff", "#63abfd", "#f99f25", "#af52de"] as const;

const DONUT_SIZE = 128;
const DONUT_RADIUS = 46;
const DONUT_STROKE = 22;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Open arc from startAngle→endAngle (degrees, 0 = top, clockwise). */
function donutArcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0) return "";
  // Full ring: SVG arcs cannot span a full 360° in one command.
  if (sweep >= 359.99) {
    const a = polarToCartesian(cx, cy, r, startAngle);
    const b = polarToCartesian(cx, cy, r, startAngle + 180);
    return [
      `M ${a.x} ${a.y}`,
      `A ${r} ${r} 0 1 1 ${b.x} ${b.y}`,
      `A ${r} ${r} 0 1 1 ${a.x} ${a.y}`,
    ].join(" ");
  }
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function ServiceBookingsDonut({
  segments,
}: {
  segments: readonly { name: string; count: number }[];
}) {
  const { t } = useI18n();
  const cx = DONUT_SIZE / 2;
  const cy = DONUT_SIZE / 2;
  const total = segments.reduce((sum, item) => sum + item.count, 0) || 1;

  const arcs = segments
    .reduce<
      {
        angle: number;
        items: Array<{
          key: string;
          color: string;
          d: string;
          count: number;
        }>;
      }
    >(
      (acc, segment, index) => {
        const sweep = (segment.count / total) * 360;
        const startAngle = acc.angle;
        const endAngle = acc.angle + sweep;
        if (sweep <= 0) return { angle: endAngle, items: acc.items };
        const d = donutArcPath(cx, cy, DONUT_RADIUS, startAngle, endAngle);
        if (!d) return { angle: endAngle, items: acc.items };
        return {
          angle: endAngle,
          items: [
            ...acc.items,
            {
              key: segment.name,
              color: SERVICE_MIX_COLORS[index] ?? SERVICE_MIX_COLORS[0],
              d,
              count: segment.count,
            },
          ],
        };
      },
      { angle: 0, items: [] },
    ).items;

  return (
    <div className="relative size-32 shrink-0 grow-0 overflow-hidden">
      <svg
        width={DONUT_SIZE}
        height={DONUT_SIZE}
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        className="block size-full"
        aria-label={t("Service Bookings")}
      >
        <circle
          cx={cx}
          cy={cy}
          r={DONUT_RADIUS}
          fill="none"
          stroke="#e8f4fc"
          strokeWidth={DONUT_STROKE}
        />
        {arcs.map((arc) => (
          <path
            key={arc.key}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth={DONUT_STROKE}
            strokeLinecap="butt"
          >
            <title>{`${arc.key}: ${arc.count}`}</title>
          </path>
        ))}
      </svg>
    </div>
  );
}

/** Figma Service Dashboard (4616:14081) + Service Vendor Main mobile (4717:12497). */
export default function ProviderDashboardPage() {
  const { t } = useI18n();
  const [avatarName, setAvatarName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/session").then((r) => r.json()),
      fetch("/api/provider/bookings").then((r) => r.json()),
      fetch("/api/provider/messages").then((r) => r.json()),
    ])
      .then(([session, bookingData, messageData]) => {
        setAvatarName(session.name ?? "");
        setAvatarUrl(session.avatarUrl ?? null);
        setSessionEmail(session.email ?? "");
        setCommunityName(session.communityName ?? session.productName ?? "");
        setBookings(bookingData.bookings ?? []);
        setUnread(
          (messageData.threads ?? []).filter((thread: { unread: boolean }) => thread.unread)
            .length,
        );
      })
      .catch(() => {});
  }, []);

  const active = bookings.filter((b) => isActiveServiceBooking(b.status));
  const pending = bookings.filter((b) => b.status === "pending" || b.status === "upcoming");
  const earnings = bookings
    .filter((b) => b.status === "completed" || b.status === "accepted")
    .reduce((sum, b) => sum + b.amount, 0);
  const openTasks = pending.length + unread;

  const serviceMix = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of bookings) {
      for (const part of b.service.split(",").map((s) => s.trim())) {
        counts[part] = (counts[part] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [bookings]);

  const monthBars = useMemo(() => {
    const now = new Date();
    const labels = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        count: 0,
      };
    });
    const byKey = new Map(labels.map((l) => [l.key, l]));
    for (const b of bookings) {
      const d = new Date(b.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const row = byKey.get(key);
      if (row) row.count += 1;
    }
    const max = Math.max(1, ...labels.map((l) => l.count));
    return labels.map((l) => ({
      label: l.label,
      value: l.count,
      height: Math.max(0.08, l.count / max),
    }));
  }, [bookings]);
  const pageViewsTotal = monthBars.reduce((sum, bar) => sum + bar.value, 0);
  const pageViewsAvg =
    monthBars.length > 0 ? Math.round(pageViewsTotal / monthBars.length) : 0;
  const hubAvatar = defaultAvatarForRole(
    "provider",
    avatarUrl,
    avatarName,
    sessionEmail,
  );

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      {/* Mobile hub — Figma Service Vendor Main */}
      <div className="mx-auto max-w-lg px-4 pb-10 pt-6 lg:hidden">
        <h1 className="text-center text-[17px] font-medium text-black">
          {communityName || t("Service Provider")}
        </h1>
        <div className="mt-8 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hubAvatar || brandAssets.serviceCleaningSupplies}
            alt=""
            className="h-[125px] w-[125px] rounded-full object-cover"
          />
          <p className="mt-4 max-w-[266px] text-center text-[20px] font-medium leading-tight text-black">
            {avatarName || t("Your business")}
          </p>
        </div>
        <nav className="mt-10">
          {mobileHubLinks.map((item) => {
            const Icon = item.icon;
            const showBadge = "badgeKey" in item && item.badgeKey === "messages" && unread > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 border-b border-border-2 py-3.5 text-[16px] text-black"
              >
                <Icon className="h-6 w-6 shrink-0 text-grey" strokeWidth={1.75} />
                <span className="flex-1">{t(item.label)}</span>
                {showBadge ? (
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--mvp-blue)] px-1 text-[11px] text-white">
                    {unread}
                  </span>
                ) : null}
                <ChevronRight className="h-4 w-4 text-grey" />
              </Link>
            );
          })}
        </nav>
        <div className="mt-12 flex flex-col items-center gap-3 pb-4">
          <LogoutButton
            className="!h-auto !border-0 !bg-transparent !px-0 !text-[16px] !font-medium !text-[var(--mvp-blue)] hover:!bg-transparent"
            label={t("Log out")}
          />
          <p className="text-xs text-grey">{t("Version")} 1.2.32</p>
        </div>
      </div>

      {/* Desktop dashboard — Figma Service Dashboard (6057:8695) */}
      <div className="hidden lg:block">
        <ProviderContentHeader
          title={avatarName || t("Dashboard")}
          avatarName={avatarName}
          translateTitle={false}
        />
        <PageBody>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[21px] font-medium text-black">{t("Manage Your Account")}</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--mvp-blue)]">
                {openTasks} {t("Tasks")}
              </span>
              {unread > 0 ? (
                <Link
                  href="/provider/messages"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#fff4e5] px-3 py-2 text-sm font-medium text-[#f99f25]"
                >
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--mvp-blue)] text-[11px] text-white">
                    {unread}
                  </span>
                  {t("New messages")}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mb-10 rounded-xl bg-white p-2 pb-16 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="mb-4 px-2 pt-2">
              <h3 className="text-[15px] font-semibold text-black">{t("Workout / Teasers")}</h3>
              <p className="text-[12px] text-grey">
                {t("Upcoming work highlighted for your dashboard.")}
              </p>
            </div>
            <div className="mb-4 flex gap-3 overflow-x-auto px-2 pb-2">
              {(active.length > 0 ? active : pending).slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  href={`/provider/bookings/${b.id}`}
                  className="relative h-[160px] w-[220px] shrink-0 overflow-hidden rounded-xl bg-[#69a8f8] shadow-[0_5px_20px_rgba(0,0,0,0.08)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="text-[13px] font-semibold leading-snug">{b.service}</p>
                    <p className="mt-1 text-[11px] text-white/90">
                      {b.resident} · {b.date} {b.time}
                    </p>
                  </div>
                </Link>
              ))}
              {active.length === 0 && pending.length === 0 ? (
                <Link
                  href="/provider/bookings"
                  className="flex h-[160px] w-[220px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl bg-[#e8f1fc] px-4 text-center text-sm font-semibold text-[var(--mvp-blue)]"
                >
                  <span>{t("No teasers yet")}</span>
                  <span className="text-[12px] font-medium">{t("Create Booking")} →</span>
                </Link>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { title: t("+ Manage Services"), href: "/provider/services" },
                { title: t("+ View Bookings"), href: "/provider/bookings" },
                { title: t("+ Manage Account"), href: "/provider/account" },
              ].map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="flex min-h-[160px] items-center justify-center rounded-xl bg-[#69a8f8] px-4 text-center text-lg font-medium text-white shadow-[0_5px_20px_rgba(0,0,0,0.08)] transition hover:brightness-95"
                >
                  {card.title}
                </Link>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[21px] font-medium text-black">{t("Service Analytics")}</h2>
            <Link href="/provider/bookings" className="text-sm text-[var(--mvp-blue)]">
              {t("View all")}
            </Link>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border-2 bg-white p-5">
              <p className="text-sm text-grey">{t("Upcoming bookings")}</p>
              <p className="mt-2 text-3xl font-semibold text-black">{active.length}</p>
            </div>
            <div className="rounded-xl border border-border-2 bg-white p-5">
              <p className="text-sm text-grey">{t("Pending requests")}</p>
              <p className="mt-2 text-3xl font-semibold text-black">{pending.length}</p>
            </div>
            <div className="rounded-xl border border-border-2 bg-white p-5">
              <p className="text-sm text-grey">{t("Booked revenue")}</p>
              <p className="mt-2 text-3xl font-semibold text-black">{formatCurrency(earnings)}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border-2 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-medium text-black">{t("Bookings by month")}</p>
                <p className="text-3xl font-semibold text-black">{pageViewsAvg}</p>
              </div>
              <p className="mt-1 text-xs text-grey">{t("avg per month")}</p>
              <div className="mt-6 flex h-32 items-end gap-3">
                {monthBars.map((bar) => (
                  <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-24 w-full items-end">
                      <div
                        className="w-full rounded-t-md bg-[var(--mvp-blue)] transition hover:opacity-90"
                        style={{ height: `${Math.round(bar.height * 100)}%` }}
                        title={`${bar.value} ${t("bookings")} · ${bar.label}`}
                      />
                    </div>
                    <span className="text-[11px] text-grey">{bar.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-grey">
                <span className="h-2.5 w-2.5 rounded-sm bg-[var(--mvp-blue)]" />
                {t("Your bookings")} · {pageViewsTotal} {t("last 6 months")}
              </div>
            </div>

            <div className="rounded-xl border border-border-2 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-medium text-black">{t("Service Bookings")}</p>
                <p className="text-3xl font-semibold text-black">{bookings.length}</p>
              </div>
              <p className="mt-1 text-xs text-grey">{t("Breakdown by service type")}</p>
              {serviceMix.length === 0 ? (
                <div className="mt-8 rounded-xl bg-[#f6f9fc] px-4 py-8 text-center">
                  <p className="text-sm text-grey">{t("No booking mix yet.")}</p>
                  <Link
                    href="/provider/bookings"
                    className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
                  >
                    {t("Create Booking")} →
                  </Link>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-6">
                  <ServiceBookingsDonut segments={serviceMix} />
                  <ul className="min-w-0 flex-1 space-y-2 text-sm">
                    {serviceMix.map((item, index) => (
                      <li key={item.name} className="flex items-center gap-2 text-[#262626]">
                        <span
                          className="h-2.5 w-5 shrink-0 rounded-sm"
                          style={{
                            backgroundColor:
                              SERVICE_MIX_COLORS[index] ?? SERVICE_MIX_COLORS[0],
                          }}
                        />
                        <span className="truncate">{t(item.name)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </PageBody>
      </div>
    </div>
  );
}
