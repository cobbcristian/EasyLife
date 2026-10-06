"use client";

import { useEffect, useState } from "react";
import { PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type Pass = { id: string; guestName: string; plate: string; date: string; status: string };

export default function ParkingPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Pass[]>([]);
  const [guestName, setGuestName] = useState("");
  const [plate, setPlate] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/member/parking")
      .then((r) => r.json())
      .then((d) => setRows(d.passes ?? []))
      .catch(() => setRows([]));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/member/parking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestName, plate, date }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not request that pass") });
      return;
    }
    const data = (await res.json()) as { pass?: Pass };
    if (data.pass) setRows((prev) => [data.pass!, ...prev]);
    setGuestName("");
    setPlate("");
    setDate("");
    toast({ variant: "success", title: t("Parking pass requested") });
  }

  return (
    <PageBody className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("Parking")}</h1>
        <p className="mt-1 text-sm text-grey">{t("Ask the desk for a guest parking pass.")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border-2 bg-white p-4">
        <div>
          <Label htmlFor="guest">{t("Guest")}</Label>
          <Input id="guest" value={guestName} onChange={(e) => setGuestName(e.target.value)} required maxLength={80} />
        </div>
        <div>
          <Label htmlFor="plate">{t("License plate")}</Label>
          <Input id="plate" value={plate} onChange={(e) => setPlate(e.target.value)} required maxLength={12} />
        </div>
        <div>
          <Label htmlFor="date">{t("Date")}</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? t("Sending...") : t("Request pass")}
        </Button>
      </form>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border-2 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">
                {row.guestName} · {row.plate}
              </p>
              <p className="text-xs font-semibold uppercase text-grey">{t(row.status)}</p>
            </div>
            <p className="mt-1 text-sm text-grey">{row.date}</p>
          </li>
        ))}
      </ul>
    </PageBody>
  );
}
