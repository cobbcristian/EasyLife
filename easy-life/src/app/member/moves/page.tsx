"use client";

import { useEffect, useState } from "react";
import { PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type Notice = {
  id: string;
  kind: string;
  date: string;
  window: string;
  company: string;
  status: string;
};

export default function MovesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Notice[]>([]);
  const [kind, setKind] = useState("in");
  const [date, setDate] = useState("");
  const [windowName, setWindowName] = useState("morning");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/member/moves")
      .then((r) => r.json())
      .then((d) => setRows(d.notices ?? []))
      .catch(() => setRows([]));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/member/moves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, date, window: windowName, company }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not schedule that move") });
      return;
    }
    const data = (await res.json()) as { notice?: Notice };
    if (data.notice) setRows((prev) => [data.notice!, ...prev]);
    setCompany("");
    toast({ variant: "success", title: t("Move notice sent") });
  }

  return (
    <PageBody className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("Moves")}</h1>
        <p className="mt-1 text-sm text-grey">{t("Tell the desk when you are moving in or out so the elevator can be reserved.")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border-2 bg-white p-4">
        <div>
          <Label htmlFor="kind">{t("Move")}</Label>
          <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border-2 bg-white px-3 text-sm">
            <option value="in">{t("Move in")}</option>
            <option value="out">{t("Move out")}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="date">{t("Date")}</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="window">{t("Time of day")}</Label>
          <select id="window" value={windowName} onChange={(e) => setWindowName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border-2 bg-white px-3 text-sm">
            <option value="morning">{t("Morning")}</option>
            <option value="afternoon">{t("Afternoon")}</option>
            <option value="evening">{t("Evening")}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="company">{t("Moving company")}</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} />
        </div>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? t("Sending...") : t("Send notice")}
        </Button>
      </form>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border-2 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">
                {row.kind === "in" ? t("Move in") : t("Move out")} · {row.date}
              </p>
              <p className="text-xs font-semibold uppercase text-grey">{t(row.status)}</p>
            </div>
            <p className="mt-1 text-sm text-grey">
              {t(row.window)}
              {row.company ? ` · ${row.company}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </PageBody>
  );
}
