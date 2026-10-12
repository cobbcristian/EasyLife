"use client";

import Link from "next/link";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/t";
import { useI18n } from "@/lib/i18n";
import { brandAssets } from "@/lib/brand-assets";
import type { PlatformOverview } from "@/lib/server/platform-analytics";

const CHART_HEIGHT = 160;

function BarChart({ points }: { points: { label: string; value: number }[] }) {
  const { t } = useI18n();
  const max = Math.max(...points.map((p) => p.value), 1);
  const yTicks = [
    { key: "max", value: max },
    { key: "mid", value: Math.round(max * 0.6) },
    { key: "low", value: Math.round(max * 0.3) },
    { key: "zero", value: 0 },
  ];

  return (
    <div className="flex gap-3">
      <div className="flex flex-col justify-between py-1 text-[10px] text-grey-light">
        {yTicks.map((tick) => (
          <span key={tick.key}>{tick.value}</span>
        ))}
      </div>
      <div className="flex-1">
        <div className="relative px-2" style={{ height: CHART_HEIGHT }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandAssets.chartGrid}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-fill"
          />
          <div className="relative flex h-full items-end justify-between gap-2">
            {points.map((point) => {
              const h = Math.max(4, Math.round((point.value / max) * CHART_HEIGHT));
              return (
                <div key={point.label} className="flex flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-[9px] text-grey">{point.value}</span>
                  <div
                    className="w-full max-w-[32px] rounded-t bg-[var(--mvp-blue)]"
                    style={{ height: h }}
                    title={`${t(point.label)}: ${point.value}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex justify-between gap-1 px-1 text-[10px] text-grey">
          {points.map((point) => (
            <span key={point.label} className="flex-1 truncate text-center" title={t(point.label)}>
              {t(point.label)}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-grey">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brandAssets.chartDivider} alt="" className="h-px w-4" />
          <span className="h-2 w-4 rounded-sm bg-[var(--mvp-blue)]" />
          <T>Bookings + requests + activity (6 mo)</T>
        </div>
      </div>
    </div>
  );
}

function DonutChart({
  serviceBooking,
  mapViews,
}: {
  serviceBooking: number;
  mapViews: number;
}) {
  const { t } = useI18n();
  // Live SVG only — never layer Figma chart-donut-*.svg overlays (misaligned arcs).
  const size = 180;
  const center = size / 2;
  const radius = 58;
  const stroke = 28;
  const circumference = 2 * Math.PI * radius;
  const bookingPct = Math.min(100, Math.max(0, serviceBooking));
  const otherPct = Math.min(100, Math.max(0, mapViews));
  const bookingLen = (bookingPct / 100) * circumference;
  // Track ring always full; booking arc starts at 12 o'clock via rotate only (no dashoffset).
  const bookingDash = bookingPct > 0 ? `${bookingLen} ${circumference - bookingLen}` : undefined;

  return (
    <div className="flex items-center gap-6">
      <div className="h-[180px] w-[180px] shrink-0">
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${size} ${size}`}
          aria-label={t("Activity breakdown")}
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e8f4fc"
            strokeWidth={stroke}
          />
          {bookingPct > 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="var(--mvp-blue)"
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={bookingDash}
              transform={`rotate(-90 ${center} ${center})`}
            />
          ) : null}
        </svg>
      </div>
      <div className="space-y-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[var(--mvp-blue)]" />
          <span className="text-grey">
            <T>Service Booking</T> · {Math.round(bookingPct)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[#e8f4fc]" />
          <span className="text-grey">
            <T>Other activity</T> · {Math.round(otherPct)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({
  title,
  metric,
  subtitle,
  children,
}: {
  title: string;
  metric: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-border-2 bg-white p-6">
      <h3 className="text-[15px] font-semibold text-black">{t(title)}</h3>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-black">{metric}</p>
      <p className="mt-1 text-sm text-grey">{t(subtitle)}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function DashboardClient({
  clubAdmin,
  superAdmin,
  scopedCommunityName,
  engagement,
  avgEngagement,
  tabUsage,
  platform,
}: {
  clubAdmin: boolean;
  superAdmin: boolean;
  scopedCommunityName?: string | null;
  engagement: { label: string; value: number }[];
  avgEngagement: number;
  tabUsage: { serviceBooking: number; mapViews: number };
  platform: PlatformOverview | null;
}) {
  const { t } = useI18n();

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={clubAdmin ? "Club Dashboard" : "Super Admin"} right="logo" />
      <PageBody>
        {superAdmin && platform ? (
          <section className="mb-8">
            <h2 className="text-[21px] font-medium text-black">{t("Platform Overview")}</h2>
            <p className="mt-1 text-sm text-grey">
              {t("Communities, providers, and subscriptions — Board and PM stay in their own portals.")}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { title: t("Communities"), value: String(platform.totalCommunities), href: "/communities" },
                {
                  title: t("Providers"),
                  value: String(platform.totalProviders),
                  href: "/services-activities",
                },
                {
                  title: t("Subscriptions"),
                  value: String(platform.totalProviders),
                  href: "/subscriptions",
                },
              ].map((stat) => (
                <Link
                  key={stat.title}
                  href={stat.href}
                  className="rounded-xl bg-[var(--mvp-blue)] p-5 text-white shadow-[0_5px_20px_rgba(0,0,0,0.08)]"
                >
                  <p className="text-sm font-medium text-white/90">{stat.title}</p>
                  <p className="mt-4 text-3xl font-semibold">{stat.value}</p>
                </Link>
              ))}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[21px] font-medium text-black">{t("Communities")}</h2>
                <Link href="/communities/onboarding">
                  <Button variant="outline" size="sm">
                    {t("Club Onboarding")}
                  </Button>
                </Link>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border-2 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-2 text-left text-xs text-grey">
                      <th className="px-5 py-3 font-medium">{t("Club")}</th>
                      <th className="px-5 py-3 font-medium">{t("Members")}</th>
                      <th className="px-5 py-3 font-medium">{t("Status")}</th>
                      <th className="px-5 py-3 font-medium">{t("Domain")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platform.communities.map((c) => (
                      <tr key={c.id} className="border-b border-border-2 last:border-0">
                        <td className="px-5 py-3">
                          <Link
                            href={`/communities/${c.id}`}
                            className="font-medium text-[var(--mvp-blue)] hover:underline"
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-grey">{c.memberCount}</td>
                        <td className="px-5 py-3">
                          <Badge variant={c.stagingMode ? "warning" : "success"}>
                            {c.stagingMode ? t("Staging") : t("Live")}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-grey">{c.customDomain ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        <h2 className="text-lg font-semibold text-black">
          <T>Community Analytics</T>
        </h2>
        <p className="mt-1 text-sm text-grey">
          {scopedCommunityName
            ? `${t("Showing data for")} ${scopedCommunityName}`
            : t("Live totals from bookings, requests, and access logs.")}
        </p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <AnalyticsCard
            title="User Engagement by Community"
            metric={String(avgEngagement)}
            subtitle="avg per month"
          >
            <BarChart points={engagement} />
          </AnalyticsCard>
          <AnalyticsCard
            title="Tab Usage by Community"
            metric={`${tabUsage.serviceBooking}%`}
            subtitle="Ratio of seen on map to clicked on"
          >
            <DonutChart serviceBooking={tabUsage.serviceBooking} mapViews={tabUsage.mapViews} />
          </AnalyticsCard>
        </div>
      </PageBody>
    </div>
  );
}
