"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  memberName: string;
  unit: string;
  guestName: string;
  plate: string;
  date: string;
  status: string;
};

export default function PmParkingPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/pm/parking")
      .then((r) => r.json())
      .then((d) => setRows(d.passes ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function decide(id: string, status: string) {
    const res = await fetch("/api/pm/parking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) return;
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Parking passes")}</h1>
      <p className="mt-1 text-sm text-grey">{t("Guest passes residents asked the desk to issue.")}</p>
      {loading ? <p className="mt-6 text-sm text-grey">{t("Loading…")}</p> : null}
      {!loading && rows.length === 0 ? <p className="mt-6 text-sm text-grey">{t("No parking passes yet.")}</p> : null}
      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              {row.guestName} · {row.plate}
            </p>
            <p className="text-[12px] text-grey">
              {row.memberName}
              {row.unit ? ` · ${row.unit}` : ""} · {row.date} · {t(row.status)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="button" onClick={() => void decide(row.id, "issued")}>
                {t("Issue")}
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
