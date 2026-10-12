"use client";

import { useEffect, useState } from "react";
import { PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type Item = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  location: string;
  status: string;
  mine: boolean;
};

export default function LostFoundPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Item[]>([]);
  const [kind, setKind] = useState("lost");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/member/lost-found")
      .then((r) => r.json())
      .then((d) => setRows(d.items ?? []))
      .catch(() => setRows([]));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/member/lost-found", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, title, detail, location }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not save that item") });
      return;
    }
    const data = (await res.json()) as { item?: Item };
    if (data.item) setRows((prev) => [data.item!, ...prev]);
    setTitle("");
    setDetail("");
    setLocation("");
    toast({ variant: "success", title: t("Saved for the desk") });
  }

  async function claim(id: string) {
    const res = await fetch("/api/member/lost-found", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not claim that item") });
      return;
    }
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status: "claimed" } : row)));
  }

  return (
    <PageBody className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("Lost and found")}</h1>
        <p className="mt-1 text-sm text-grey">{t("Report something you lost, or see what the desk is holding.")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border-2 bg-white p-4">
        <div>
          <Label htmlFor="kind">{t("This item is")}</Label>
          <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border-2 bg-white px-3 text-sm">
            <option value="lost">{t("Lost")}</option>
            <option value="found">{t("Found")}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="title">{t("Item")}</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
        </div>
        <div>
          <Label htmlFor="detail">{t("Details")}</Label>
          <textarea id="detail" value={detail} onChange={(e) => setDetail(e.target.value)} required minLength={2} maxLength={500} rows={3} className="mt-1 w-full rounded-lg border border-border-2 px-3 py-2 text-sm" />
        </div>
        <div>
          <Label htmlFor="location">{t("Where")}</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} />
        </div>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? t("Sending...") : t("Submit")}
        </Button>
      </form>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border-2 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{row.title}</p>
              <p className="text-xs font-semibold uppercase text-grey">{t(row.status)}</p>
            </div>
            <p className="mt-1 text-sm text-grey">
              {row.kind === "lost" ? t("Lost") : t("Found")}
              {row.location ? ` · ${row.location}` : ""}
            </p>
            <p className="mt-1 text-sm text-ink">{row.detail}</p>
            {row.kind === "found" && row.status === "open" && !row.mine ? (
              <Button type="button" className="mt-3" onClick={() => void claim(row.id)}>
                {t("This is mine")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </PageBody>
  );
}
