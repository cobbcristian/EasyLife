"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

interface DirectoryEntry {
  id: string;
  name: string;
  role: string;
  unit: string;
  visible: boolean;
  email: string;
}

interface StaffEntry {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string | null;
  phone: string | null;
  extension: string | null;
  category: string;
}

/** Figma-aligned resident + club staff directory. */
export function MemberMvpDirectory() {
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [tab, setTab] = useState<"members" | "staff">("members");
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  useEffect(() => {
    fetch("/api/directory")
      .then((r) => r.json())
      .then((d) => setDirectory(d.directory ?? []))
      .catch(() => {});
    fetch("/api/directory?type=staff")
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []))
      .catch(() => {});
  }, []);

  const memberResults = useMemo(() => {
    return directory.filter((d) => {
      if (!d.visible) return false;
      const matchesSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.unit.toLowerCase().includes(search.toLowerCase());
      const matchesRole =
        role === "all" || d.role.toLowerCase().includes(role.toLowerCase());
      return matchesSearch && matchesRole;
    });
  }, [search, role, directory]);

  const staffResults = useMemo(() => {
    const q = search.toLowerCase();
    return staff.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q),
    );
  }, [staff, search]);

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-3xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {t("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Directory")}
          </h1>
          <div className="mt-3 flex gap-2">
            {(
              [
                ["members", "Members"],
                ["staff", "Club staff"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                  tab === value
                    ? "bg-[var(--mvp-blue)] text-white"
                    : "bg-[#f2f4f7] text-ink"
                }`}
              >
                {t(label)}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "staff"
                ? t("Search staff by name or department...")
                : t("Search by name or unit...")
            }
            className="mt-3 h-11 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm outline-none focus:border-[var(--mvp-blue)]"
          />
          {tab === "members" ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {(
                [
                  ["all", "All"],
                  ["member", "Members"],
                  ["board", "Board"],
                  ["property", "Property Mgmt"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${
                    role === value
                      ? "bg-[var(--mvp-blue)] text-white"
                      : "bg-[#f2f4f7] text-ink"
                  }`}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        {tab === "members" ? (
          <ul className="divide-y divide-[#eceff3] px-4 py-2 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
            {memberResults.length === 0 ? (
              <li className="px-2 py-8 text-center">
                <p className="text-sm text-grey">{t("No residents found.")}</p>
                <Link
                  href="/member/messages"
                  className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
                >
                  {t("Message a neighbor")} →
                </Link>
              </li>
            ) : (
              memberResults.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3.5">
                  <Avatar name={d.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-ink">{d.name}</p>
                      <span className="shrink-0 rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-grey">
                        {d.role}
                      </span>
                    </div>
                    <p className="text-[12px] text-grey">{d.unit}</p>
                  </div>
                  {d.email && d.email !== profile.email ? (
                    <Link
                      href={`/member/messages?to=${encodeURIComponent(d.email)}&name=${encodeURIComponent(d.name)}`}
                      className="shrink-0 text-[12px] font-semibold text-[var(--mvp-blue)]"
                    >
                      {t("Message")}
                    </Link>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        ) : (
          <ul className="divide-y divide-[#eceff3] px-4 py-2 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
            {staffResults.length === 0 ? (
              <li className="px-2 py-8 text-center">
                <p className="text-sm text-grey">{t("No staff listed.")}</p>
                <Link
                  href="/member/contact"
                  className="mt-3 inline-flex text-sm font-semibold text-[var(--mvp-blue)]"
                >
                  {t("Contact front desk")} →
                </Link>
              </li>
            ) : (
              staffResults.map((s) => (
                <li key={s.id} className="py-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar name={s.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-ink">{s.name}</p>
                      <p className="text-[13px] text-ink">{s.title}</p>
                      <p className="text-[12px] text-grey">{s.department}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--mvp-blue)]">
                        {s.phone ? (
                          <a href={`tel:${s.phone}`}>
                            {s.phone}
                            {s.extension ? ` x${s.extension}` : ""}
                          </a>
                        ) : null}
                        {s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : null}
                      </div>
                    </div>
                    {s.email ? (
                      <Link
                        href={`/member/messages?to=${encodeURIComponent(s.email)}&name=${encodeURIComponent(s.name)}`}
                        className="shrink-0 text-[12px] font-semibold text-[var(--mvp-blue)]"
                      >
                        {t("Message")}
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
