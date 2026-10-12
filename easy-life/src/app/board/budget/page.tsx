"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn, formatCurrency } from "@/lib/utils";

interface BudgetLine {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
}

export default function BoardBudgetPage() {
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    fetch("/api/budget")
      .then((r) => r.json())
      .then((d) => {
        if (!on) return;
        setBudgetLines(d.lines ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, []);

  const totalBudget = budgetLines.reduce((s, b) => s + b.budgeted, 0);
  const totalSpent = budgetLines.reduce((s, b) => s + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const utilization =
    totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const stats = [
    { label: t("Annual Budget"), value: formatCurrency(totalBudget) },
    { label: t("Spent YTD"), value: formatCurrency(totalSpent) },
    { label: t("Remaining"), value: formatCurrency(remaining) },
  ];

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Budget & Reserves")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[var(--mvp-blue)]">{t("FY 2026")}</p>
            <p className="mt-0.5 text-sm text-grey">
              {t("Operating categories and capital reserves for")}{" "}
              {profile.communityName ?? profile.appDisplayName ?? t("your community")}.
            </p>
          </div>
          {!loading && budgetLines.length > 0 ? (
            <p className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[var(--mvp-blue)]">
              {utilization}% {t("utilized YTD")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border-2 bg-white p-5"
            >
              <p className="text-sm text-grey">{stat.label}</p>
              <p className="mt-3 text-2xl font-semibold text-black">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-border-2 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-2 bg-[#f8fafb] text-grey">
                  <th className="px-5 py-3 font-medium">{t("Category")}</th>
                  <th className="px-5 py-3 font-medium">{t("Budgeted")}</th>
                  <th className="px-5 py-3 font-medium">{t("Spent")}</th>
                  <th className="px-5 py-3 font-medium">{t("Utilization")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-grey">
                      {t("Loading…")}
                    </td>
                  </tr>
                ) : budgetLines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center">
                      <p className="text-sm font-semibold text-ink">{t("No budget lines yet.")}</p>
                      <p className="mt-1 text-sm text-grey">
                        {t("Budget categories appear here once finance sets them up.")}
                      </p>
                      <Link
                        href="/board/invoices"
                        className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                      >
                        {t("Review invoices")}
                      </Link>
                    </td>
                  </tr>
                ) : (
                  budgetLines.map((b, idx) => {
                    const pct = b.budgeted > 0 ? Math.round((b.spent / b.budgeted) * 100) : 0;
                    return (
                      <tr
                        key={b.id}
                        className={cn(
                          "border-b border-border-2 last:border-0",
                          idx % 2 === 1 && "bg-[#fafbfc]",
                        )}
                      >
                        <td className="px-5 py-3 font-medium text-ink">{b.category}</td>
                        <td className="px-5 py-3 text-gray-2">{formatCurrency(b.budgeted)}</td>
                        <td className="px-5 py-3 text-gray-2">{formatCurrency(b.spent)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-border-2">
                              <div
                                className={`h-full rounded-full ${pct >= 100 ? "bg-danger" : "bg-[var(--mvp-blue)]"}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-grey">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
