"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

type Note = {
  id: string;
  memberName: string;
  unit: string;
  topic: string;
  note: string;
};

export default function PmDeskNotesPage() {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/pm/desk-notes")
      .then((r) => r.json())
      .then((d) => setNotes(d.notes ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Desk instructions")}</h1>
      <p className="mt-1 text-sm text-grey">{t("Standing notes residents left for the front desk.")}</p>
      {loading ? <p className="mt-6 text-sm text-grey">{t("Loading…")}</p> : null}
      {!loading && notes.length === 0 ? (
        <p className="mt-6 text-sm text-grey">{t("No instructions yet.")}</p>
      ) : null}
      <ul className="mt-5 space-y-2">
        {notes.map((row) => (
          <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              {row.memberName}
              {row.unit ? ` · ${row.unit}` : ""}
            </p>
            <p className="text-[12px] uppercase tracking-wide text-grey">{t(row.topic)}</p>
            <p className="mt-1 text-sm text-ink">{row.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
