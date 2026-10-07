"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";

export default function PmTournamentsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/pm/tournaments")
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.enabled)))
      .finally(() => setLoading(false));
  }, []);

  async function save(next: boolean) {
    setSaving(true);
    const res = await fetch("/api/pm/tournaments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not update tournaments") });
      return;
    }
    setEnabled(next);
    toast({
      variant: "success",
      title: next ? t("Tournaments are on for residents") : t("Tournaments are hidden"),
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-[22px] font-semibold text-ink">{t("Tournaments")}</h1>
      <p className="mt-1 text-sm text-grey">
        {t("Turn this on when the community is running a tournament. Residents then see it under More.")}
      </p>
      {loading ? <p className="mt-6 text-sm text-grey">{t("Loading…")}</p> : null}
      {!loading ? (
        <label className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-[#e8ebf0] bg-white px-4 py-4">
          <span className="text-sm font-semibold text-ink">{t("Show tournaments to residents")}</span>
          <input
            type="checkbox"
            checked={enabled}
            disabled={saving}
            onChange={(e) => void save(e.target.checked)}
            className="h-5 w-5"
          />
        </label>
      ) : null}
    </div>
  );
}
