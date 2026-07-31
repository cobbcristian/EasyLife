"use client";

import Link from "next/link";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/page-header";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";

const typeVariant = {
  revenue: "success",
  commission: "info",
  payout: "warning",
} as const;

interface LedgerRow {
  id: string;
  description: string;
  type: keyof typeof typeVariant;
  amount: number;
  date: string;
}

export function ReportsClient({
  revenue,
  commission,
  payouts,
  ledger,
}: {
  revenue: number;
  commission: number;
  payouts: number;
  ledger: LedgerRow[];
}) {
  const { t } = useI18n();

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title="Financial Reports" right="logo" />
      <PageBody>
        <p className="mb-4 text-sm text-grey">
          {t("Live totals from invoices, amenity bookings, and dining orders.")}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={t("Total Revenue")}
            value={formatCurrency(revenue)}
            icon={<span className="text-lg">$</span>}
          />
          <StatCard
            label={t("Commissions")}
            value={formatCurrency(commission)}
            icon={<span className="text-lg">%</span>}
          />
          <StatCard
            label={t("Provider Payouts")}
            value={formatCurrency(payouts)}
            icon={<span className="text-lg">$</span>}
          />
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-border-2 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-2 text-grey">
                  <th className="px-5 py-3 font-medium">{t("Description")}</th>
                  <th className="px-5 py-3 font-medium">{t("Type")}</th>
                  <th className="px-5 py-3 font-medium">{t("Amount")}</th>
                  <th className="px-5 py-3 font-medium">{t("Date")}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center">
                      <p className="text-sm font-semibold text-ink">
                        {t("No financial activity yet.")}
                      </p>
                      <p className="mt-1 text-sm text-grey">
                        {t("Charges and payouts will show here as the club runs.")}
                      </p>
                      <Link
                        href="/subscriptions"
                        className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                      >
                        {t("View subscriptions")}
                      </Link>
                    </td>
                  </tr>
                ) : (
                  ledger.map((l) => (
                    <tr key={l.id} className="border-b border-border-2 last:border-0">
                      <td className="px-5 py-3 font-medium text-ink">{t(l.description)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={typeVariant[l.type]}>{t(l.type)}</Badge>
                      </td>
                      <td className="px-5 py-3 text-gray-2">{formatCurrency(l.amount)}</td>
                      <td className="px-5 py-3 text-gray-2">{formatDate(l.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
