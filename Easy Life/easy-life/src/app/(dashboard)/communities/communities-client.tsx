"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { useI18n } from "@/lib/i18n";
import { logoForCommunity } from "@/lib/brand-assets";

interface CommunityCard {
  id: string;
  name: string;
  location: string;
  coverColor: string;
  logoUrl?: string;
  residentCount: number;
  serviceCount: number;
  activityCount: number;
  adminName?: string;
}

/** Figma Super Admin View All Communities (5462:6304). */
export function CommunitiesClient({
  communities,
  superAdmin,
}: {
  communities: CommunityCard[];
  superAdmin: boolean;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        (c.adminName ?? "").toLowerCase().includes(q),
    );
  }, [communities, query]);

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title="Communities" right="logo" />
      <PageBody>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search Communities")}
              className="h-12 w-full rounded-lg bg-[#f2f2f7] py-2 pl-10 pr-3 text-sm placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />
          </div>
          {superAdmin ? (
            <Link
              href="/communities/new"
              className="inline-flex h-12 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)]/10 px-4 text-sm font-semibold text-[var(--mvp-blue)] hover:bg-[var(--mvp-blue)]/15"
            >
              <Plus className="h-4 w-4" />
              {t("Create Community")}
            </Link>
          ) : null}
        </div>

        <p className="mb-4 text-base font-medium text-black">
          {t("Communities")}{" "}
          <span className="text-[var(--mvp-blue)]">{filtered.length}</span>
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((community) => {
            const logo = logoForCommunity(community.id, community.logoUrl);
            return (
              <Link
                key={community.id}
                href={`/communities/${community.id}`}
                className="flex items-center gap-4 rounded-xl border border-border-2 bg-white p-4 shadow-[0_4px_16px_rgba(16,24,40,0.06)] transition hover:shadow-md"
              >
                <div className="relative flex h-[70px] w-[70px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-ink">{community.name}</h3>
                  <p className="mt-0.5 truncate text-sm text-grey">
                    {t("Comm. Admin")}: {community.adminName ?? t("Assigned")}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-black">{community.location}</p>
              </Link>
            );
          })}
        </div>
      </PageBody>
    </div>
  );
}
