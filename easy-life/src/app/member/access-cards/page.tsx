"use client";

import { useEffect, useState } from "react";
import { PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type CardRequest = { id: string; quantity: number; reason: string; status: string };

export default function AccessCardsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<CardRequest[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/member/access-cards")
      .then((r) => r.json())
      .then((d) => setRows(d.requests ?? []))
      .catch(() => setRows([]));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/member/access-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: Number(quantity), reason }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not request that card") });
      return;
    }
    const data = (await res.json()) as { request?: CardRequest };
    if (data.request) setRows((prev) => [data.request!, ...prev]);
    setReason("");
    toast({ variant: "success", title: t("Card request sent") });
  }

  return (
    <PageBody className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("Access cards")}</h1>
        <p className="mt-1 text-sm text-grey">{t("Ask the desk for a building card. The desk hands it to you. This does not unlock a door from the phone.")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border-2 bg-white p-4">
        <div>
          <Label htmlFor="qty">{t("How many")}</Label>
          <Input id="qty" type="number" min={1} max={5} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="reason">{t("Why")}</Label>
          <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={2} maxLength={300} rows={3} className="mt-1 w-full rounded-lg border border-border-2 px-3 py-2 text-sm" />
        </div>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? t("Sending...") : t("Request cards")}
        </Button>
      </form>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border-2 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">
                {row.quantity} {t("cards")}
              </p>
              <p className="text-xs font-semibold uppercase text-grey">{t(row.status)}</p>
            </div>
            <p className="mt-1 text-sm text-grey">{row.reason}</p>
          </li>
        ))}
      </ul>
    </PageBody>
  );
}
