"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

type DependentRow = {
  email: string;
  name: string;
  dateOfBirth: string | null;
  householdAddress: string | null;
  status: string;
  dueDate: string | null;
  age: number | null;
  daysUntilAgeOut: number | null;
  addressOk: boolean;
  reason: string;
};

type Snapshot = {
  policy: {
    ageOutYears: number;
    warnDaysBefore: number;
    requireSameAddress: boolean;
    actionOnBreach: string;
    notes: string;
  };
  sponsor: { email: string; name: string; address: string | null; role: string };
  me: {
    role: string;
    dateOfBirth: string | null;
    status: string;
    dueDate: string | null;
    address: string | null;
    sponsorEmail: string | null;
  } | null;
  dependents: DependentRow[];
  notices: Array<{
    id: string;
    level: string;
    reason: string;
    message: string;
    dueDate: string | null;
    createdAt: string;
    forDependent: string;
  }>;
};

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active dependent";
    case "warned":
      return "Warning sent";
    case "must_convert":
      return "Must get own membership";
    case "terminated":
      return "Dependents privileges ended";
    default:
      return status;
  }
}

function statusTone(status: string): string {
  switch (status) {
    case "active":
      return "text-emerald-700";
    case "warned":
      return "text-amber-700";
    case "must_convert":
    case "terminated":
      return "text-red-700";
    default:
      return "text-grey";
  }
}

export function HouseholdClient() {
  const { t } = useI18n();
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addressDraft, setAddressDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    fetch("/api/member/household")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load household");
        return r.json() as Promise<Snapshot>;
      })
      .then((snap) => {
        if (!on) return;
        setData(snap);
        setAddressDraft(snap.me?.address ?? snap.sponsor.address ?? "");
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

  async function saveAddress() {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/member/household", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdAddress: addressDraft }),
      });
      if (!res.ok) throw new Error("Could not update address");
      const snap = (await res.json()) as Snapshot;
      setData(snap);
      setAddressDraft(snap.me?.address ?? snap.sponsor.address ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
          {t("Member")}
        </p>
        <h1 className="text-[22px] font-semibold">{t("Household membership")}</h1>
        <p className="mt-1 text-sm text-grey">
          {t(
            "Dependents age out at a set birthday and must share the sponsor address — or get their own membership.",
          )}
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-grey">{t("Loading…")}</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {data ? (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-[#e8ebf0] px-4 py-3">
              <h2 className="text-[15px] font-semibold">{t("Club policy")}</h2>
              <p className="mt-1 text-sm text-grey">
                {t("Age out at")} {data.policy.ageOutYears}
                {data.policy.requireSameAddress
                  ? ` · ${t("same address required")}`
                  : ""}
                {" · "}
                {t("warn")} {data.policy.warnDaysBefore}{" "}
                {t("days ahead")}
              </p>
              {data.policy.notes ? (
                <p className="mt-2 text-xs text-grey">{data.policy.notes}</p>
              ) : null}
            </section>

            <section>
              <h2 className="text-[15px] font-semibold">{t("Sponsor household")}</h2>
              <p className="mt-1 text-sm font-medium">{data.sponsor.name}</p>
              <p className="text-xs text-grey">{data.sponsor.email}</p>
              <label className="mt-3 block text-xs font-medium text-grey">
                {t("Household address")}
                <input
                  className="mt-1 w-full rounded-xl border border-[#e8ebf0] px-3 py-2 text-sm text-ink"
                  value={addressDraft}
                  onChange={(e) => setAddressDraft(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveAddress()}
                className="mt-2 rounded-xl bg-[var(--mvp-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? t("Saving…") : t("Update address")}
              </button>
            </section>

            <section>
              <h2 className="text-[15px] font-semibold">{t("Dependents")}</h2>
              {data.dependents.length === 0 ? (
                <p className="mt-2 text-sm text-grey">
                  {t("No dependents linked to this membership.")}
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-[#eceff3] rounded-2xl border border-[#e8ebf0]">
                  {data.dependents.map((d) => (
                    <li key={d.email} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{d.name}</p>
                          <p className="text-xs text-grey">{d.email}</p>
                          <p className="mt-1 text-xs text-grey">
                            {d.dateOfBirth
                              ? `${t("DOB")} ${d.dateOfBirth}`
                              : t("DOB not on file")}
                            {d.age != null ? ` · ${t("Age")} ${d.age}` : ""}
                            {d.daysUntilAgeOut != null && d.daysUntilAgeOut >= 0
                              ? ` · ${d.daysUntilAgeOut} ${t("days to age-out")}`
                              : ""}
                          </p>
                          {!d.addressOk ? (
                            <p className="mt-1 text-xs text-amber-700">
                              {t("Address does not match sponsor household.")}
                            </p>
                          ) : null}
                        </div>
                        <p
                          className={`shrink-0 text-right text-xs font-semibold ${statusTone(d.status)}`}
                        >
                          {t(statusLabel(d.status))}
                        </p>
                      </div>
                      {d.dueDate ? (
                        <p className="mt-1 text-xs text-grey">
                          {t("Due")} {d.dueDate}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-[15px] font-semibold">{t("Notices")}</h2>
              {data.notices.length === 0 ? (
                <p className="mt-2 text-sm text-grey">{t("No warnings yet.")}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {data.notices.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-2xl border border-[#e8ebf0] px-4 py-3 text-sm"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wide text-grey">
                        {n.level.replaceAll("_", " ")} · {n.reason}
                      </p>
                      <p className="mt-1 text-ink">{n.message}</p>
                      <p className="mt-1 text-xs text-grey">
                        {new Date(n.createdAt).toLocaleDateString()}
                        {n.dueDate ? ` · ${t("Due")} ${n.dueDate}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-xs text-grey">
              {t("Need your own membership?")}{" "}
              <a
                href="/member/contact"
                className="font-semibold text-[var(--mvp-blue)]"
              >
                {t("Contact the club")} →
              </a>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
