"use client";

import { useEffect, useState } from "react";
import { PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type Incident = { id: string; category: string; description: string; status: string };

const CATEGORIES = [
  { id: "noise", label: "Noise" },
  { id: "leak", label: "Leak" },
  { id: "damage", label: "Damage" },
  { id: "parking", label: "Parking" },
  { id: "other", label: "Other" },
];

export default function IncidentsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Incident[]>([]);
  const [category, setCategory] = useState("noise");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/member/incidents")
      .then((r) => r.json())
      .then((d) => setRows(d.incidents ?? []))
      .catch(() => setRows([]));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/member/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, description }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not file that report") });
      return;
    }
    const data = (await res.json()) as { incident?: Incident };
    if (data.incident) setRows((prev) => [data.incident!, ...prev]);
    setDescription("");
    toast({ variant: "success", title: t("Report sent to the desk") });
  }

  return (
    <PageBody className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("Incidents")}</h1>
        <p className="mt-1 text-sm text-grey">{t("Report noise, a leak, damage, or a parking problem to the desk.")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border-2 bg-white p-4">
        <div>
          <Label htmlFor="category">{t("What happened")}</Label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border-2 bg-white px-3 text-sm">
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {t(item.label)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="description">{t("Details")}</Label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required minLength={8} maxLength={2000} rows={4} className="mt-1 w-full rounded-lg border border-border-2 px-3 py-2 text-sm" />
        </div>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? t("Sending...") : t("File report")}
        </Button>
      </form>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border-2 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{t(row.category)}</p>
              <p className="text-xs font-semibold uppercase text-grey">{t(row.status)}</p>
            </div>
            <p className="mt-1 text-sm text-grey">{row.description}</p>
          </li>
        ))}
      </ul>
    </PageBody>
  );
}
