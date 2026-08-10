"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StaffBookForMember } from "@/components/admin/staff-book-for-member";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Tab = "bookings" | "members" | "providers";

type Overview = {
  stats: {
    bookings: number;
    members: number;
    providers: number;
    communities: number;
    unreadMessages: number;
  };
  bookings: Array<{
    id: string;
    amenity: string;
    memberName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    communityName: string;
  }>;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    communityName: string;
  }>;
  providers: Array<{
    id: string;
    name: string;
    email: string | null;
    category: string;
    status: string;
    communityName: string;
  }>;
};

/** Figma Super Admin View All Bookings / Members & Servicers. */
export function SuperAdminConsole({ initialTab = "bookings" }: { initialTab?: Tab }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [data, setData] = useState<Overview | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => {
        if (d.stats) setData(d as Overview);
      })
      .catch(() => {});
  }, []);

  const filteredBookings = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = data?.bookings ?? [];
    if (!q) return rows;
    return rows.filter(
      (b) =>
        b.amenity.toLowerCase().includes(q) ||
        b.memberName.toLowerCase().includes(q) ||
        b.communityName.toLowerCase().includes(q),
    );
  }, [data, query]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = data?.members ?? [];
    if (!q) return rows;
    return rows.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.communityName.toLowerCase().includes(q),
    );
  }, [data, query]);

  const filteredProviders = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = data?.providers ?? [];
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.communityName.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="space-y-6 font-[family-name:var(--font-poppins)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-grey">
          {t("Super Admin")}
        </p>
        <h1 className="text-2xl font-semibold text-ink">
          {t("Platform overview")}
        </h1>
        <p className="mt-1 text-sm text-grey">
          {t("View all bookings, community members, and service providers.")}
        </p>
        <p className="mt-3">
          <Link
            href="/super-admin/sales"
            className="text-sm font-semibold text-[var(--mvp-blue)] hover:underline"
          >
            Sales CRM &amp; commissions →
          </Link>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t("Communities"), value: data?.stats.communities ?? "—" },
          { label: t("Bookings"), value: data?.stats.bookings ?? "—" },
          { label: t("Members"), value: data?.stats.members ?? "—" },
          { label: t("Providers"), value: data?.stats.providers ?? "—" },
          {
            label: t("Unread messages"),
            value: data?.stats.unreadMessages ?? "—",
            href: "/help-desk",
          },
        ].map((card) => {
          const inner = (
            <>
              <p className="text-[12px] text-grey">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{card.value}</p>
            </>
          );
          return card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-[#e8ebf0] bg-white p-4 shadow-sm hover:border-[var(--mvp-blue)]"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={card.label}
              className="rounded-2xl border border-[#e8ebf0] bg-white p-4 shadow-sm"
            >
              {inner}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["bookings", "View all bookings"],
            ["members", "Community members"],
            ["providers", "Servicers"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              tab === key
                ? "bg-[var(--mvp-blue)] text-white"
                : "bg-[#f2f4f7] text-ink",
            )}
          >
            {t(label)}
          </button>
        ))}
        <Link
          href="/help-desk"
          className="rounded-full bg-[#f2f4f7] px-4 py-2 text-sm font-semibold text-ink"
        >
          {t("Messages")}
        </Link>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("Search…")}
        className="h-11 w-full max-w-md rounded-2xl border border-[#e4e8ee] bg-white px-4 text-sm outline-none focus:border-[var(--mvp-blue)]"
      />

      {tab === "bookings" ? (
        <div className="space-y-6">
          <StaffBookForMember
            showRecent={false}
            onCreated={() => {
              fetch("/api/admin/overview")
                .then((r) => r.json())
                .then((d) => {
                  if (d.stats) setData(d as Overview);
                })
                .catch(() => {});
            }}
          />
          <div className="overflow-hidden rounded-2xl border border-[#e8ebf0] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fafbfc] text-[12px] uppercase tracking-wide text-grey">
                <tr>
                  <th className="px-4 py-3">{t("Club")}</th>
                  <th className="px-4 py-3">{t("Amenity")}</th>
                  <th className="px-4 py-3">{t("Member")}</th>
                  <th className="px-4 py-3">{t("When")}</th>
                  <th className="px-4 py-3">{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="border-t border-[#eceff3]">
                    <td className="px-4 py-3">{b.communityName}</td>
                    <td className="px-4 py-3 font-medium">{b.amenity}</td>
                    <td className="px-4 py-3">{b.memberName}</td>
                    <td className="px-4 py-3 text-grey">
                      {b.date} · {b.startTime}–{b.endTime}
                    </td>
                    <td className="px-4 py-3 capitalize">{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBookings.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-grey">{t("No bookings found.")}</p>
                <a
                  href="/communities"
                  className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
                >
                  {t("Browse communities")} →
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "members" ? (
        <div className="overflow-hidden rounded-2xl border border-[#e8ebf0] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fafbfc] text-[12px] uppercase tracking-wide text-grey">
              <tr>
                <th className="px-4 py-3">{t("Name")}</th>
                <th className="px-4 py-3">{t("Email")}</th>
                <th className="px-4 py-3">{t("Role")}</th>
                <th className="px-4 py-3">{t("Club")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.id} className="border-t border-[#eceff3]">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-grey">{m.email}</td>
                  <td className="px-4 py-3 capitalize">{m.role}</td>
                  <td className="px-4 py-3">{m.communityName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "providers" ? (
        <div className="overflow-hidden rounded-2xl border border-[#e8ebf0] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fafbfc] text-[12px] uppercase tracking-wide text-grey">
              <tr>
                <th className="px-4 py-3">{t("Provider")}</th>
                <th className="px-4 py-3">{t("Category")}</th>
                <th className="px-4 py-3">{t("Email")}</th>
                <th className="px-4 py-3">{t("Club")}</th>
                <th className="px-4 py-3">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProviders.map((p) => (
                <tr key={p.id} className="border-t border-[#eceff3]">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3 text-grey">{p.email ?? "—"}</td>
                  <td className="px-4 py-3">{p.communityName}</td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
