"use client";

import { useEffect, useState } from "react";
import { PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type RequestRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  decisionNote: string;
};

export default function AlterationsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/member/alterations")
      .then((r) => r.json())
      .then((d) => setRows(d.requests ?? []))
      .catch(() => setRows([]));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/member/alterations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not submit that request") });
      return;
    }
    const data = (await res.json()) as { request?: RequestRow };
    if (data.request) setRows((prev) => [data.request!, ...prev]);
    setTitle("");
    setDescription("");
    toast({ variant: "success", title: t("Request sent for review") });
  }

  return (
    <PageBody className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("Alterations")}</h1>
        <p className="mt-1 text-sm text-grey">
          {t("Ask for approval before you change paint, flooring, windows, or anything outside the unit rules.")}
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border-2 bg-white p-4">
        <div>
          <Label htmlFor="alt-title">{t("What are you changing?")}</Label>
          <Input id="alt-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
        </div>
        <div>
          <Label htmlFor="alt-desc">{t("Details")}</Label>
          <textarea
            id="alt-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={8}
            maxLength={2000}
            rows={4}
            className="mt-1 w-full rounded-lg border border-border-2 px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? t("Sending...") : t("Submit for review")}
        </Button>
      </form>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border-2 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{row.title}</p>
              <p className="text-xs font-semibold uppercase text-grey">{t(row.status.replace(/_/g, " "))}</p>
            </div>
            <p className="mt-1 text-sm text-grey">{row.description}</p>
            {row.decisionNote ? <p className="mt-2 text-sm text-ink">{row.decisionNote}</p> : null}
          </li>
        ))}
      </ul>
    </PageBody>
  );
}
