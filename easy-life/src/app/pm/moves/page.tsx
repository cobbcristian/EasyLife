"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  memberName: string;
  unit: string;
  kind: string;
  date: string;
  window: string;
  company: string;
  status: string;
};

export default function PmMovesPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/pm/moves")
      .then((r) => r.json())
      .then((d) => setRows(d.notices ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function decide(id: string, status: string) {
    const res = await fetch("/api/pm/moves", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) return;
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Moves")}</h1>
      <p className="mt-1 text-sm text-grey">{t("Move-in and move-out notices for the elevator.")}</p>
      {loading ? <p className="mt-6 text-sm text-grey">{t("Loading…")}</p> : null}
      {!loading && rows.length === 0 ? <p className="mt-6 text-sm text-grey">{t("No move notices yet.")}</p> : null}
      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              {row.kind === "in" ? t("Move in") : t("Move out")} · {row.date} · {t(row.window)}
            </p>
            <p className="text-[12px] text-grey">
              {row.memberName}
              {row.unit ? ` · ${row.unit}` : ""}
              {row.company ? ` · ${row.company}` : ""} · {t(row.status)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="button" onClick={() => void decide(row.id, "confirmed")}>
                {t("Confirm")}
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
