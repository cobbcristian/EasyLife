"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

interface RewardsState {
  points: number;
  tier: string;
  nextTier: string;
  toNext: number;
  perks: { id: string; label: string; cost: number }[];
  history: { id: string; label: string; points: number; date: string }[];
}

export function RewardsClient({
  initial,
}: {
  userName: string;
  initial: RewardsState;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [state, setState] = useState(initial);

  const progress =
    state.toNext > 0
      ? Math.round((state.points / (state.points + state.toNext)) * 100)
      : 100;

  async function redeem(perkId: string, label: string, cost: number) {
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perkId }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Redemption failed") });
      return;
    }
    setState((prev) => ({
      ...prev,
      points: data.points,
      history: [
        {
          id: `r-${Date.now()}`,
          label: t(`Redeemed: ${label}`),
          points: -cost,
          date: new Date().toISOString().slice(0, 10),
        },
        ...prev.history,
      ],
    }));
    toast({ variant: "success", title: t("Perk redeemed"), description: label });
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
            {t("Member")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Rewards")}
          </h1>
        </header>

        <div className="space-y-5 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <section className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[12px] text-grey">{t("Your balance")}</p>
                <p className="text-3xl font-bold tracking-tight text-ink">
                  {state.points}{" "}
                  <span className="text-base font-semibold text-grey">pts</span>
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-700">
                {state.tier}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-grey">
                <span>{state.tier}</span>
                <span>
                  {state.toNext > 0
                    ? t(`${state.toNext} pts to ${state.nextTier}`)
                    : t("Top tier reached")}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#e8ebf0]">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-ink">{t("Redeem perks")}</h2>
            <ul className="mt-3 divide-y divide-[#eceff3]">
              {state.perks.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-sm font-medium text-ink">{p.label}</span>
                  <button
                    type="button"
                    disabled={state.points < p.cost}
                    onClick={() => redeem(p.id, p.label, p.cost)}
                    className="h-9 rounded-full bg-[#f2f4f7] px-3 text-[12px] font-semibold text-ink disabled:opacity-40"
                  >
                    {p.cost} pts
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-ink">{t("Recent activity")}</h2>
            <ul className="mt-3 divide-y divide-[#eceff3]">
              {state.history.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-ink">{h.label}</p>
                    <p className="text-[11px] text-grey">{formatDate(h.date)}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      h.points >= 0
                        ? "text-[var(--mvp-status-going)]"
                        : "text-[#c45c5c]"
                    }`}
                  >
                    {h.points >= 0 ? `+${h.points}` : h.points}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
