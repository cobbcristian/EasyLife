"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  memberName: string;
  unit: string;
  title: string;
  description: string;
  status: string;
  decisionNote: string;
};

export default function PmAlterationsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/pm/alterations")
      .then((r) => r.json())
      .then((d) => setRows(d.requests ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function decide(id: string, status: string) {
    const res = await fetch("/api/pm/alterations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) return;
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Alterations")}</h1>
      <p className="mt-1 text-sm text-grey">{t("Resident requests to change their unit.")}</p>
      {loading ? <p className="mt-6 text-sm text-grey">{t("Loading…")}</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="mt-6 text-sm text-grey">{t("No alteration requests yet.")}</p>
      ) : null}
      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{row.title}</p>
                <p className="text-[12px] text-grey">
                  {row.memberName}
                  {row.unit ? ` · ${row.unit}` : ""} · {t(row.status.replace(/_/g, " "))}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm text-ink">{row.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void decide(row.id, "in_review")}>
                {t("In review")}
              </Button>
              <Button type="button" onClick={() => void decide(row.id, "approved")}>
                {t("Approve")}
              </Button>
              <Button type="button" variant="outline" onClick={() => void decide(row.id, "denied")}>
                {t("Deny")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
