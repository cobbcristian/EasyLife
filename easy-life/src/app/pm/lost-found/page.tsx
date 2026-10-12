"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  reporterName: string;
  kind: string;
  title: string;
  detail: string;
  location: string;
  status: string;
};

export default function PmLostFoundPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/pm/lost-found")
      .then((r) => r.json())
      .then((d) => setRows(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function close(id: string) {
    const res = await fetch("/api/pm/lost-found", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status: "closed" } : row)));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Lost and found")}</h1>
      <p className="mt-1 text-sm text-grey">{t("Items residents lost or turned in.")}</p>
      {loading ? <p className="mt-6 text-sm text-grey">{t("Loading…")}</p> : null}
      {!loading && rows.length === 0 ? <p className="mt-6 text-sm text-grey">{t("Nothing reported yet.")}</p> : null}
      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white px-4 py-3">
            <p className="text-sm font-semibold text-ink">{row.title}</p>
            <p className="text-[12px] text-grey">
              {row.reporterName} · {row.kind === "lost" ? t("Lost") : t("Found")}
              {row.location ? ` · ${row.location}` : ""} · {t(row.status)}
            </p>
            <p className="mt-2 text-sm text-ink">{row.detail}</p>
            {row.status !== "closed" ? (
              <Button type="button" variant="outline" className="mt-3" onClick={() => void close(row.id)}>
                {t("Close")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
