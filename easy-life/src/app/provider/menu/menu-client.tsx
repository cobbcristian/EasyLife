"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn, formatCurrency } from "@/lib/utils";

export interface MenuItemDTO {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
}

const fieldClass =
  "h-[57px] w-full rounded-lg border border-border-2 bg-white px-5 text-[15px] text-black placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

export function MenuClient({
  initial,
  isCleaningProvider = false,
}: {
  initial: MenuItemDTO[];
  isCleaningProvider?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [form, setForm] = useState({ name: "", price: "", category: "Mains" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.price) {
      toast({ variant: "warning", title: t("Name and price required") });
      return;
    }
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, price: Number(form.price), category: form.category }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not add item") });
      return;
    }
    setForm({ name: "", price: "", category: "Mains" });
    toast({ variant: "success", title: t("Item added") });
    router.refresh();
  }

  async function toggle(id: string) {
    await fetch(`/api/menu/${id}`, { method: "PATCH" });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/menu/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Menu Management")} avatarName={profile.name} />
      <PageBody>
        {isCleaningProvider ? (
          <p className="mb-6 text-sm text-grey">
            {t(
              "Clubhouse dining menu for member orders. Your cleaning packages are under Community → Service packages.",
            )}
          </p>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-3">
          <section>
            <h2 className="mb-4 text-xl font-medium text-black">{t("Add menu item")}</h2>
            <form className="space-y-4" onSubmit={add}>
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-black">
                  {t("Name")}
                </label>
                <input
                  id="name"
                  className={fieldClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("Name")}
                />
              </div>
              <div>
                <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-black">
                  {t("Price ($)")}
                </label>
                <input
                  id="price"
                  type="number"
                  min={0}
                  className={fieldClass}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="cat" className="mb-1.5 block text-sm font-medium text-black">
                  {t("Category")}
                </label>
                <select
                  id="cat"
                  className={fieldClass}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option>{t("Starters")}</option>
                  <option>{t("Mains")}</option>
                  <option>{t("Desserts")}</option>
                  <option>{t("Drinks")}</option>
                </select>
              </div>
              <button
                type="submit"
                className="h-[50px] w-full rounded-lg bg-[var(--mvp-blue)] px-6 text-base font-semibold text-white hover:opacity-95"
              >
                {t("Add item")}
              </button>
            </form>
          </section>

          <section className="lg:col-span-2">
            <h2 className="mb-4 text-xl font-medium text-black">
              {t("Menu")} {initial.length}
            </h2>
            <ul className="space-y-3">
              {initial.length === 0 ? (
                <li className="rounded-xl border border-border-2 bg-white px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-ink">{t("No items yet.")}</p>
                  <p className="mt-1 text-sm text-grey">
                    {t("Use the form to add your first menu item for member orders.")}
                  </p>
                </li>
              ) : (
                initial.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-2 bg-white p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-black">{m.name}</p>
                        <span className="rounded-md bg-[#f2f2f7] px-2 py-0.5 text-xs font-medium text-grey">
                          {m.category}
                        </span>
                        {!m.available ? (
                          <span className="rounded-md bg-[#fff4e5] px-2 py-0.5 text-xs font-medium text-[#f99f25]">
                            {t("86'd")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-sm text-grey">{formatCurrency(m.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(m.id)}
                        className={cn(
                          "h-9 rounded-lg border border-border-2 px-3 text-xs font-medium text-black hover:bg-[#f2f2f7]",
                          !m.available && "border-[var(--mvp-blue)] text-[var(--mvp-blue)]",
                        )}
                      >
                        {m.available ? t("Mark unavailable") : t("Mark available")}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(m.id)}
                        className="rounded-md p-2 text-grey hover:bg-[#fdecea] hover:text-[#ff3b30]"
                        aria-label={t("Remove item")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </PageBody>
    </div>
  );
}
