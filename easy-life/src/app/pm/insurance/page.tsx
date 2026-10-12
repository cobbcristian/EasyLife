"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

type Row = {
  id: string;
  memberName: string;
  unit: string;
  kind: string;
  carrier: string;
  policyNumber: string;
  expiresOn: string;
};

export default function PmInsurancePage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/pm/insurance")
      .then((r) => r.json())
      .then((d) => setRows(d.policies ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Insurance")}</h1>
      <p className="mt-1 text-sm text-grey">{t("Policies on file, soonest expiration first.")}</p>
      {loading ? <p className="mt-6 text-sm text-grey">{t("Loading…")}</p> : null}
      {!loading && rows.length === 0 ? <p className="mt-6 text-sm text-grey">{t("No policies on file.")}</p> : null}
      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              {row.memberName}
              {row.unit ? ` · ${row.unit}` : ""}
            </p>
            <p className="text-[12px] text-grey">
              {row.kind === "renters" ? t("Renters") : t("Homeowner")} · {row.carrier} · {row.policyNumber} · {t("Expires")} {row.expiresOn}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
