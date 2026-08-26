"use client";

import { useEffect, useState } from "react";
import { HarborPageHeader } from "@/components/harbor/harbor-page-header";
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donating, setDonating] = useState<string | null>(null);
  const [amount, setAmount] = useState("25");

  useEffect(() => {
    fetch("/api/fundraising")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? []));
  }, []);

  async function donate(campaignId: string, title: string) {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    setDonating(campaignId);
    try {
      await fetch("/api/fundraising", {
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
      const res = await fetch("/api/fundraising");
      const d = await res.json();
      setCampaigns(d.campaigns ?? []);
    } finally {
      setDonating(null);
    }
  }

  return (
    <div className="min-h-screen bg-white pb-28">
      <HarborPageHeader
        eyebrow="Member"
        title="Fundraising"
        lead="Support club tournaments and charity golf events."
      />
      <div className="mx-auto max-w-lg px-4">
        <div className="mb-4">
          <label className="text-xs font-medium uppercase tracking-wide text-grey">
            Donation amount
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
                    className="h-full rounded-full bg-[var(--harbor-signal,#2d6cdf)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-grey">
                  {formatCurrency(c.raisedAmount)} of {formatCurrency(c.goalAmount)} raised
                </p>
                <button
                  type="button"
                  disabled={donating === c.id}
                  onClick={() => donate(c.id, c.title)}
                  className="mt-3 h-10 w-full rounded-xl bg-[var(--harbor-ink,#1a2332)] text-sm font-semibold text-white disabled:opacity-60"
                >
                  {donating === c.id ? "Processing…" : "Donate"}
                </button>
              </li>
            );
          })}
          {campaigns.length === 0 && (
            <p className="text-sm text-grey">No active campaigns.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
