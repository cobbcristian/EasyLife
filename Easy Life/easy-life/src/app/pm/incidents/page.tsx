"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  memberName: string;
  unit: string;
  category: string;
  description: string;
  status: string;
};

export default function PmIncidentsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/pm/incidents")
      .then((r) => r.json())
      .then((d) => setRows(d.incidents ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function setStatus(id: string, status: string) {
    const res = await fetch("/api/pm/incidents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) return;
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Incidents")}</h1>
      <p className="mt-1 text-sm text-grey">{t("Noise, leaks, damage, and parking reports from residents.")}</p>
      {loading ? <p className="mt-6 text-sm text-grey">{t("Loading…")}</p> : null}
      {!loading && rows.length === 0 ? <p className="mt-6 text-sm text-grey">{t("No incident reports yet.")}</p> : null}
      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              {t(row.category)} · {t(row.status)}
            </p>
            <p className="text-[12px] text-grey">
              {row.memberName}
              {row.unit ? ` · ${row.unit}` : ""}
            </p>
            <p className="mt-2 text-sm text-ink">{row.description}</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" onClick={() => void setStatus(row.id, "reviewing")}>
                {t("Reviewing")}
              </Button>
              <Button type="button" onClick={() => void setStatus(row.id, "closed")}>
                {t("Close")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
