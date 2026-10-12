"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

export function PosSyncButton() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    const res = await fetch("/api/pos/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("POS sync failed") });
      return;
    }
    toast({
      variant: "success",
      title: t("Menu synced"),
      description: `${data.mode}: ${data.imported} ${t("new")}, ${data.updated} ${t("updated")}`,
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={sync} disabled={busy}>
      {busy ? t("Syncing…") : t("Sync MICROS menu")}
    </Button>
  );
}
