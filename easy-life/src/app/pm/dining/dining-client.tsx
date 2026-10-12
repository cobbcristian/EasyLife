"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { formatCurrency } from "@/lib/utils";

export interface MenuItemDTO {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
}

export function PmDiningClient({ initial }: { initial: MenuItemDTO[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Mains");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price) {
      toast({ variant: "warning", title: t("Name and price required") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Number(price), category }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not add item") });
      return;
    }
    toast({ variant: "success", title: t("Item added") });
    setName("");
    setPrice("");
    setCategory("Mains");
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Dining Menu")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border-2 bg-white p-5">
            <h2 className="mb-4 text-base font-medium text-black">{t("Add menu item")}</h2>
            <form className="space-y-4" onSubmit={add}>
              <div className="space-y-2">
                <Label htmlFor="name">{t("Name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">{t("Price ($)")}</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t("Category")}</Label>
                <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Starters">{t("Starters")}</option>
                  <option value="Mains">{t("Mains")}</option>
                  <option value="Desserts">{t("Desserts")}</option>
                  <option value="Drinks">{t("Drinks")}</option>
                </Select>
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? t("Adding...") : t("Add item")}
              </Button>
            </form>
          </div>

          <div className="rounded-xl border border-border-2 bg-white p-5 lg:col-span-2">
            <h2 className="mb-4 text-base font-medium text-black">
              {t("Menu")} ({initial.length})
            </h2>
            <div className="space-y-3">
              {initial.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-semibold text-ink">{t("No items yet.")}</p>
                  <p className="mt-1 text-sm text-grey">
                    {t("Add your first menu item with the form on the left.")}
                  </p>
                </div>
              ) : (
                initial.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 border-b border-border-2 py-3 last:border-0"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--mvp-blue)]/10 text-[var(--mvp-blue)]">
                      <UtensilsCrossed className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">{m.name}</p>
                        <Badge variant="info">{t(m.category)}</Badge>
                        {!m.available ? <Badge variant="warning">{t("86'd")}</Badge> : null}
                      </div>
                      <p className="text-sm text-gray-2">{formatCurrency(m.price)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
