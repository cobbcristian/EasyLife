"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

type Snapshot = {
  policy: {
    enabled: boolean;
    waitDays: number;
    memberRemindDaysBefore: number;
    staffRemindDaysBefore: number;
    notes: string;
  };
  status: string;
  resignedAt: string | null;
  rejoinEligibleOn: string | null;
  daysRemaining: number | null;
  waiting: boolean;
  eligible: boolean;
  canEditPolicy?: boolean;
  waitlist?: Array<{
    email: string;
    name: string;
    resignedAt: string | null;
    eligibleOn: string | null;
    daysRemaining: number | null;
    waiting: boolean;
    eligible: boolean;
  }>;
  notices: Array<{
    id: string;
    level: string;
    message: string;
    daysRemaining: number | null;
    createdAt: string;
  }>;
  rejoinResult?: { ok: boolean; error?: string; daysRemaining?: number | null };
};

export function MembershipClient({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [policyEnabled, setPolicyEnabled] = useState(true);
  const [waitDays, setWaitDays] = useState(365);

  useEffect(() => {
    let on = true;
    fetch("/api/member/membership")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load membership");
        return r.json() as Promise<Snapshot>;
      })
      .then((snap) => {
        if (!on) return;
        setData(snap);
        setPolicyEnabled(snap.policy.enabled);
        setWaitDays(snap.policy.waitDays);
      })
      .catch((e: Error) => {
        if (on) setError(e.message);
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, []);

  async function resign() {
    if (!confirm(t("Resign membership? You may face a rejoin waiting period."))) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/member/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resign", reason }),
      });
      if (!res.ok) throw new Error("Could not resign");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejoin() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/member/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rejoin" }),
      });
      const snap = (await res.json()) as Snapshot;
      setData(snap);
      if (snap.rejoinResult && !snap.rejoinResult.ok) {
        setError(snap.rejoinResult.error ?? "Still waiting to rejoin");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function savePolicy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/member/membership", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: policyEnabled, waitDays }),
      });
      if (!res.ok) throw new Error("Could not update policy");
      const snap = (await res.json()) as Snapshot;
      setData(snap);
      setPolicyEnabled(snap.policy.enabled);
      setWaitDays(snap.policy.waitDays);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <>
        {!embedded ? (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
              {t("Member")}
            </p>
            <h1 className="text-[22px] font-semibold">{t("Membership")}</h1>
            <p className="mt-1 text-sm text-grey">
              {t(
                "Some clubs require a waiting period after you resign before you can rejoin.",
              )}
            </p>
            <p className="mt-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3 text-xs text-grey">
              {t(
                "Country clubs often have two kinds of people: on-property residents who pay HOA dues, and club-only members who use amenities without living (or paying HOA) on site. Your access follows that.",
              )}
            </p>
          </>
        ) : null}

        {loading ? (
          <p className={`${embedded ? "" : "mt-6"} text-sm text-grey`}>{t("Loading…")}</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {data ? (
          <div className={`${embedded ? "mt-0" : "mt-6"} space-y-6`}>
            <section className="rounded-2xl border border-[#e8ebf0] px-4 py-3">
              <h2 className="text-[15px] font-semibold">{t("Your status")}</h2>
              <p className="mt-1 text-sm">
                {data.status === "resigned" ? (
                  <span className="font-semibold text-amber-700">{t("Resigned")}</span>
                ) : (
                  <span className="font-semibold text-emerald-700">{t("Active")}</span>
                )}
              </p>
              {data.status === "resigned" ? (
                <div className="mt-2 space-y-1 text-sm text-grey">
                  {data.resignedAt ? (
                    <p>
                      {t("Resigned")}{" "}
                      {new Date(data.resignedAt).toLocaleDateString()}
                    </p>
                  ) : null}
                  {data.waiting && data.daysRemaining != null ? (
                    <p className="font-medium text-amber-800">
                      {data.daysRemaining} {t("days remaining before you may rejoin")}
                      {data.rejoinEligibleOn
                        ? ` (${t("eligible")} ${data.rejoinEligibleOn})`
                        : ""}
                    </p>
                  ) : null}
                  {data.eligible ? (
                    <p className="font-medium text-emerald-700">
                      {t("You may reapply for membership now.")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {data.status === "active" ? (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-grey">
                    {t("Reason (optional)")}
                    <input
                      className="mt-1 w-full rounded-xl border border-[#e8ebf0] px-3 py-2 text-sm"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void resign()}
                    className="mt-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                  >
                    {t("Resign membership")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void rejoin()}
                  className="mt-3 rounded-xl bg-[var(--mvp-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {data.eligible
                    ? t("Request reinstate")
                    : t("Check rejoin eligibility")}
                </button>
              )}
            </section>

            <section className="rounded-2xl border border-[#e8ebf0] px-4 py-3">
              <h2 className="text-[15px] font-semibold">{t("Club rejoin policy")}</h2>
              {data.policy.enabled ? (
                <p className="mt-1 text-sm text-grey">
                  {t("After resigning, wait")} {data.policy.waitDays}{" "}
                  {t("days before rejoining.")}
                </p>
              ) : (
                <p className="mt-1 text-sm text-grey">
                  {t("This club does not enforce a rejoin waiting period.")}
                </p>
              )}
              {data.policy.notes ? (
                <p className="mt-2 text-xs text-grey">{data.policy.notes}</p>
              ) : null}

              {data.canEditPolicy ? (
                <div className="mt-4 space-y-2 border-t border-[#eceff3] pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-grey">
                    {t("Club settings")}
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={policyEnabled}
                      onChange={(e) => setPolicyEnabled(e.target.checked)}
                    />
                    {t("Enforce rejoin waiting period")}
                  </label>
                  <label className="block text-xs font-medium text-grey">
                    {t("Wait days")}
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded-xl border border-[#e8ebf0] px-3 py-2 text-sm"
                      value={waitDays}
                      onChange={(e) => setWaitDays(Number(e.target.value) || 365)}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void savePolicy()}
                    className="rounded-xl bg-[var(--mvp-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {t("Save policy")}
                  </button>
                </div>
              ) : null}
            </section>

            {data.waitlist && data.waitlist.length > 0 ? (
              <section>
                <h2 className="text-[15px] font-semibold">
                  {t("Staff — members in wait period")}
                </h2>
                <ul className="mt-2 divide-y divide-[#eceff3] rounded-2xl border border-[#e8ebf0]">
                  {data.waitlist.map((m) => (
                    <li key={m.email} className="px-4 py-3">
                      <p className="text-sm font-semibold">{m.name}</p>
                      <p className="text-xs text-grey">{m.email}</p>
                      <p className="mt-1 text-xs font-medium text-amber-800">
                        {m.eligible
                          ? t("Eligible to rejoin now")
                          : `${m.daysRemaining ?? "—"} ${t("days remaining")}`}
                        {m.eligibleOn ? ` · ${m.eligibleOn}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h2 className="text-[15px] font-semibold">{t("Notices")}</h2>
              {data.notices.length === 0 ? (
                <p className="mt-2 text-sm text-grey">{t("No notices yet.")}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data.notices.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-2xl border border-[#e8ebf0] px-4 py-3 text-sm"
                    >
                      <p className="text-ink">{n.message}</p>
                      <p className="mt-1 text-xs text-grey">
                        {new Date(n.createdAt).toLocaleDateString()}
                        {n.daysRemaining != null
                          ? ` · ${n.daysRemaining} ${t("days left")}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
    </>
  );

  if (embedded) return <div className="w-full">{body}</div>;

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink">
      <div className="mx-auto w-full max-w-lg px-4 py-6">{body}</div>
    </div>
  );
}
