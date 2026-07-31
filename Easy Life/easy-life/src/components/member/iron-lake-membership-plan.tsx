"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import {
  IRON_LAKE_CLUB_CONTACT,
  IRON_LAKE_EVENTS_NOTES,
  IRON_LAKE_MEMBERSHIP_SCHEDULE,
  IRON_LAKE_MEMBER_SERVICE_CHARGES,
  formatIronLakeCharge,
} from "@/lib/iron-lake-fees";
import {
  IRON_LAKE_CATEGORY_PRIVILEGES,
  IRON_LAKE_CLUB_FACILITIES,
  IRON_LAKE_FAMILY_GUEST_SUMMARY,
  IRON_LAKE_MANDATORY_MEMBERSHIP,
  IRON_LAKE_MEMBERSHIP_YEAR,
  IRON_LAKE_PLAN_NOTICES,
  IRON_LAKE_SPECIAL_BENEFITS,
  IRON_LAKE_UPGRADE_NOTE,
  IRON_LAKE_WAITING_LIST_FULL_GOLF,
} from "@/lib/iron-lake-plan";

function groupCharges() {
  const sections: string[] = [];
  for (const row of IRON_LAKE_MEMBER_SERVICE_CHARGES) {
    if (!sections.includes(row.section)) sections.push(row.section);
  }
  return sections.map((section) => ({
    section,
    rows: IRON_LAKE_MEMBER_SERVICE_CHARGES.filter((r) => r.section === section),
  }));
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e8ebf0] px-4 py-4">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function IronLakeMembershipPlan({
  currentTierSlug,
}: {
  currentTierSlug?: string | null;
}) {
  const { t } = useI18n();
  const groups = groupCharges();
  const activePrivileges = currentTierSlug
    ? IRON_LAKE_CATEGORY_PRIVILEGES.find((p) => p.slug === currentTierSlug)
    : null;

  return (
    <div className="space-y-6">
      <Section title={t("Membership Plan summary")}>
        <p className="mt-1 text-[12px] text-grey">
          {t("Information as of")} {IRON_LAKE_CLUB_CONTACT.ratesAsOf}.{" "}
          {t(
            "This is a member portal summary. The Membership Plan, Rules and Regulations, and Membership Agreement govern.",
          )}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink">
          {t(IRON_LAKE_MEMBERSHIP_YEAR.label)}:{" "}
          {t(IRON_LAKE_MEMBERSHIP_YEAR.description)}
        </p>
      </Section>

      <Section title={t("Special membership benefits")}>
        <ul className="mt-2 space-y-3">
          {IRON_LAKE_SPECIAL_BENEFITS.map((item) => (
            <li key={item.title}>
              <p className="text-[13px] font-semibold text-ink">{t(item.title)}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-grey">
                {t(item.body)}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t(IRON_LAKE_MANDATORY_MEMBERSHIP.title)}>
        <p className="mt-2 text-[13px] leading-relaxed text-grey">
          {t(IRON_LAKE_MANDATORY_MEMBERSHIP.body)}
        </p>
      </Section>

      <Section title={t("Club Facilities")}>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] text-grey">
          {IRON_LAKE_CLUB_FACILITIES.map((item) => (
            <li key={item}>{t(item)}</li>
          ))}
        </ul>
      </Section>

      {activePrivileges ? (
        <Section title={t("Your category privileges")}>
          <dl className="mt-2 space-y-2.5 text-[13px]">
            <div>
              <dt className="font-semibold text-ink">{t("Facility access")}</dt>
              <dd className="mt-0.5 text-grey">{t(activePrivileges.facilityAccess)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">{t("Golf")}</dt>
              <dd className="mt-0.5 text-grey">{t(activePrivileges.golfPrivileges)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">{t("Racquets")}</dt>
              <dd className="mt-0.5 text-grey">
                {t(activePrivileges.racquetPrivileges)}
              </dd>
            </div>
            {activePrivileges.otherNotes ? (
              <div>
                <dt className="font-semibold text-ink">{t("Notes")}</dt>
                <dd className="mt-0.5 text-grey">{t(activePrivileges.otherNotes)}</dd>
              </div>
            ) : null}
          </dl>
        </Section>
      ) : null}

      <Section title={t("Membership Plan — Initiation, Dues & F&B")}>
        <p className="mt-1 text-[12px] text-grey">
          {t("Rates as of")} {IRON_LAKE_CLUB_CONTACT.ratesAsOf}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b border-[#eceff3] text-grey">
                <th className="py-2 pr-3 font-semibold">{t("Category")}</th>
                <th className="py-2 pr-3 font-semibold">{t("Initiation")}</th>
                <th className="py-2 pr-3 font-semibold">{t("Monthly")}</th>
                <th className="py-2 pr-3 font-semibold">{t("Annual")}</th>
                <th className="py-2 font-semibold">{t("F&B Min.")}</th>
              </tr>
            </thead>
            <tbody>
              {IRON_LAKE_MEMBERSHIP_SCHEDULE.map((row) => {
                const active = currentTierSlug === row.slug;
                return (
                  <tr
                    key={row.slug}
                    className={`border-b border-[#f3f4f6] ${active ? "bg-[#eef6ff]" : ""}`}
                  >
                    <td className="py-2.5 pr-3 align-top">
                      <p className="font-semibold text-ink">
                        {row.name}
                        {active ? (
                          <span className="ml-2 rounded-full bg-[var(--mvp-blue)] px-2 py-0.5 text-[10px] font-semibold text-white">
                            {t("Yours")}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-grey">
                        {row.eligibility}
                      </p>
                    </td>
                    <td className="py-2.5 pr-3 align-top font-medium">
                      {row.bespoke || row.initiationFee == null
                        ? t("Bespoke")
                        : formatCurrency(row.initiationFee)}
                    </td>
                    <td className="py-2.5 pr-3 align-top font-medium">
                      {row.bespoke || row.monthlyDues == null
                        ? t("Bespoke")
                        : formatCurrency(row.monthlyDues)}
                    </td>
                    <td className="py-2.5 pr-3 align-top font-medium">
                      {row.bespoke || row.annualDues == null
                        ? t("Bespoke")
                        : formatCurrency(row.annualDues)}
                    </td>
                    <td className="py-2.5 align-top font-medium">
                      {row.bespoke || row.fbMinimumAnnual == null
                        ? t("Bespoke")
                        : formatCurrency(row.fbMinimumAnnual)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] leading-snug text-grey">
          {t(IRON_LAKE_UPGRADE_NOTE)}
        </p>
      </Section>

      <Section title={t("Category use privileges")}>
        <ul className="mt-2 divide-y divide-[#f3f4f6]">
          {IRON_LAKE_CATEGORY_PRIVILEGES.map((row) => {
            const active = currentTierSlug === row.slug;
            const schedule = IRON_LAKE_MEMBERSHIP_SCHEDULE.find(
              (s) => s.slug === row.slug,
            );
            return (
              <li
                key={row.slug}
                className={`py-3 ${active ? "rounded-xl bg-[#eef6ff] px-3" : ""}`}
              >
                <p className="text-[13px] font-semibold text-ink">
                  {schedule?.name ?? row.slug}
                  {active ? (
                    <span className="ml-2 rounded-full bg-[var(--mvp-blue)] px-2 py-0.5 text-[10px] font-semibold text-white">
                      {t("Yours")}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[12px] text-grey">
                  <span className="font-medium text-ink">{t("Access")}: </span>
                  {t(row.facilityAccess)}
                </p>
                <p className="mt-1 text-[12px] text-grey">
                  <span className="font-medium text-ink">{t("Golf")}: </span>
                  {t(row.golfPrivileges)}
                </p>
                <p className="mt-1 text-[12px] text-grey">
                  <span className="font-medium text-ink">{t("Racquets")}: </span>
                  {t(row.racquetPrivileges)}
                </p>
                {row.otherNotes ? (
                  <p className="mt-1 text-[12px] text-grey">{t(row.otherNotes)}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={t("Family & guest privileges")}>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] text-grey">
          {IRON_LAKE_FAMILY_GUEST_SUMMARY.map((item) => (
            <li key={item}>{t(item)}</li>
          ))}
        </ul>
      </Section>

      <Section title={t("Full Golf waiting list priority")}>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] text-grey">
          {IRON_LAKE_WAITING_LIST_FULL_GOLF.map((item) => (
            <li key={item}>{t(item)}</li>
          ))}
        </ol>
      </Section>

      {groups.map((group) => (
        <Section key={group.section} title={t(group.section)}>
          <ul className="mt-2 divide-y divide-[#f3f4f6]">
            {group.rows.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{t(row.name)}</p>
                  {row.note ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-grey">
                      {t(row.note)}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-[13px] font-semibold text-ink">
                  {formatIronLakeCharge(row.amount, row.billing, row.complimentary)}
                </p>
              </li>
            ))}
          </ul>
          {group.section === "Tower Lodging & Event Space" ? (
            <Link
              href="/member/rentals"
              className="mt-3 inline-flex text-[13px] font-semibold text-[var(--mvp-blue)]"
            >
              {t("Reserve tower lodging →")}
            </Link>
          ) : null}
        </Section>
      ))}

      <Section title={t("Events & Tournaments")}>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] text-grey">
          {IRON_LAKE_EVENTS_NOTES.map((note) => (
            <li key={note}>{t(note)}</li>
          ))}
        </ul>
      </Section>

      <Section title={t("Important notices")}>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] text-grey">
          {IRON_LAKE_PLAN_NOTICES.map((note) => (
            <li key={note}>{t(note)}</li>
          ))}
        </ul>
      </Section>

      <p className="text-[11px] leading-relaxed text-grey">
        {IRON_LAKE_CLUB_CONTACT.web} · {IRON_LAKE_CLUB_CONTACT.phone} ·{" "}
        {IRON_LAKE_CLUB_CONTACT.email}
        <br />
        {IRON_LAKE_CLUB_CONTACT.address}
        <br />
        {t("Club hours")}: {IRON_LAKE_CLUB_CONTACT.publishedHoursLabel}
        <br />
        {t("Rates and information as of")} {IRON_LAKE_CLUB_CONTACT.ratesAsOf}.
      </p>
    </div>
  );
}
