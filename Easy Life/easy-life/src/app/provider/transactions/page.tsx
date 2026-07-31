"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";

type RefundRow = {
  id: string;
  title: string;
  memberName: string;
  amountCents: number;
  status: string;
  createdAt: string;
  bookingId: string;
};

/** Provider transactions / refund history (PM Activity Vendor Transactions). */
export default function ProviderTransactionsPage() {
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/refunds")
      .then((r) => r.json())
      .then((d) => setRefunds(d.refunds ?? []))
      .catch(() => setRefunds([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Transactions")} avatarName={profile.name} />
      <PageBody>
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-base font-medium text-black">{t("Refunds & payments")}</h2>
          <Link
            href="/provider/account#billing"
            className="text-sm font-medium text-[var(--mvp-blue)]"
          >
            {t("Bank Management")}
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-grey">{t("Loading…")}</p>
        ) : refunds.length === 0 ? (
          <div className="rounded-xl bg-[#f6f9fc] px-5 py-10 text-center">
            <p className="text-sm text-grey">{t("No transactions yet.")}</p>
            <Link
              href="/provider/bookings"
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
            >
              {t("View Bookings")}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border-2 border-y border-border-2">
            {refunds.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-black">{r.title}</p>
                  <p className="text-xs text-grey">
                    {r.memberName} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-black">
                    {formatCurrency(r.amountCents / 100)}
                  </p>
                  <p className="text-xs capitalize text-grey">{t(r.status)}</p>
                  <Link
                    href={`/provider/bookings/${r.bookingId}`}
                    className="text-xs font-medium text-[var(--mvp-blue)]"
                  >
                    {t("Open booking")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </div>
  );
}
