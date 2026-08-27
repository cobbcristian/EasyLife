"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";

type Campaign = {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  eventDate: string | null;
  status: string;
};

export default function MemberFundraisingPage() {
  const { t } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donating, setDonating] = useState<string | null>(null);
  const [amount, setAmount] = useState("25");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/fundraising")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? []));
  }, []);

  async function donate(campaignId: string, title: string) {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    setDonating(campaignId);
    setError(null);
    try {
      const startRes = await fetch("/api/fundraising", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "donate",
          campaignId,
          amount: parsed,
          donorName: "Member",
          message: `Supporting ${title}`,
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok || !startData.charge?.id) {
        setError(startData.error ?? "Could not start donation");
        return;
      }

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargeId: startData.charge.id,
          amount: startData.charge.amount,
          description: startData.charge.description,
          returnPath: "/member/fundraising",
        }),
      });
      const checkoutData = await checkoutRes.json();
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
        return;
      }
      if (!checkoutRes.ok) {
        setError(checkoutData.error ?? "Payment failed");
        return;
      }

      const res = await fetch("/api/fundraising");
      const d = await res.json();
      setCampaigns(d.campaigns ?? []);
    } finally {
      setDonating(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("Fundraising")}</h1>
        <p className="mt-1 text-grey">
          {t("Support club tournaments and charity golf events.")}
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-grey">
          {t("Donation amount")}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[#e8ebf0] px-3 py-2 text-sm"
        />
      </div>
      <ul className="space-y-4">
        {campaigns.map((c) => {
          const pct = Math.min(100, (c.raisedAmount / c.goalAmount) * 100);
          return (
            <li key={c.id} className="rounded-2xl border border-[#e8ebf0] p-4">
              <p className="font-semibold text-ink">{c.title}</p>
              {c.description && (
                <p className="mt-1 text-sm text-grey">{c.description}</p>
              )}
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8ebf0]">
                <div
                  className="h-full rounded-full bg-[var(--mvp-blue)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-grey">
                {formatCurrency(c.raisedAmount)} {t("of")}{" "}
                {formatCurrency(c.goalAmount)} {t("raised")}
              </p>
              <button
                type="button"
                disabled={donating === c.id}
                onClick={() => donate(c.id, c.title)}
                className="mt-3 h-10 w-full rounded-xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-60"
              >
                {donating === c.id ? t("Processing…") : t("Donate")}
              </button>
            </li>
          );
        })}
        {campaigns.length === 0 && (
          <p className="text-sm text-grey">{t("No active campaigns.")}</p>
        )}
      </ul>
    </div>
  );
}
