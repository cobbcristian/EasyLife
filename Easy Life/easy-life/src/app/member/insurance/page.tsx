"use client";

import { useEffect, useState } from "react";
import { PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type Policy = {
  id: string;
  kind: string;
  carrier: string;
  policyNumber: string;
  expiresOn: string;
};

export default function InsurancePage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Policy[]>([]);
  const [kind, setKind] = useState("homeowner");
  const [carrier, setCarrier] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/member/insurance")
      .then((r) => r.json())
      .then((d) => setRows(d.policies ?? []))
      .catch(() => setRows([]));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/member/insurance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, carrier, policyNumber, expiresOn }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not save that policy") });
      return;
    }
    const data = (await res.json()) as { policy?: Policy };
    if (data.policy) setRows((prev) => [...prev, data.policy!].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn)));
    setCarrier("");
    setPolicyNumber("");
    setExpiresOn("");
    toast({ variant: "success", title: t("Policy saved") });
  }

  return (
    <PageBody className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("Insurance")}</h1>
        <p className="mt-1 text-sm text-grey">{t("Keep your homeowner or renters policy on file for the association.")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border-2 bg-white p-4">
        <div>
          <Label htmlFor="kind">{t("Policy")}</Label>
          <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border-2 bg-white px-3 text-sm">
            <option value="homeowner">{t("Homeowner")}</option>
            <option value="renters">{t("Renters")}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="carrier">{t("Carrier")}</Label>
          <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} required maxLength={80} />
        </div>
        <div>
          <Label htmlFor="policy">{t("Policy number")}</Label>
          <Input id="policy" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} required maxLength={40} />
        </div>
        <div>
          <Label htmlFor="expires">{t("Expires")}</Label>
          <Input id="expires" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} required />
        </div>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? t("Saving...") : t("Save policy")}
        </Button>
      </form>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-border-2 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-ink">
              {row.kind === "renters" ? t("Renters") : t("Homeowner")} · {row.carrier}
            </p>
            <p className="mt-1 text-sm text-grey">
              {row.policyNumber} · {t("Expires")} {row.expiresOn}
            </p>
          </li>
        ))}
      </ul>
    </PageBody>
  );
}
