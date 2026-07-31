"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn } from "@/lib/utils";

interface Promo {
  id: string;
  title: string;
  type: string;
  detail: string;
  status: string;
  redemptions: number;
}

const fieldClass =
  "h-[57px] w-full rounded-lg border border-border-2 bg-white px-5 text-[15px] text-black placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

function statusStyles(status: string) {
  switch (status) {
    case "active":
      return "bg-[#e8f8ef] text-[#34c759]";
    case "scheduled":
      return "bg-[#eef4ff] text-[var(--mvp-blue)]";
    case "ended":
      return "bg-[#f2f2f7] text-grey";
    default:
      return "bg-[#f2f2f7] text-grey";
  }
}

export function PromotionsClient({ initial }: { initial: Promo[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [promos, setPromos] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "coupon",
    detail: "",
    status: "active",
    href: "/member/dining",
    subtitle: "",
    imageUrl: "",
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const payload =
      form.type === "featured"
        ? {
            ...form,
            detail: form.detail || "Paid featured placement on member home",
            subtitle: form.subtitle || form.detail,
            imageUrl: form.imageUrl || undefined,
            href: form.href || "/member/dining",
          }
        : form;
    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not create promotion") });
      return;
    }
    const data = await res.json();
    setPromos((prev) => [...prev, data.promotion]);
    setForm({
      title: "",
      type: "coupon",
      detail: "",
      status: "active",
      href: "/member/dining",
      subtitle: "",
      imageUrl: "",
    });
    setShowForm(false);
    toast({
      variant: "success",
      title:
        form.type === "featured"
          ? t("Featured placement purchased")
          : t("Promotion created"),
    });
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Promotions")} avatarName={profile.name} />
      <PageBody>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[21px] font-medium text-black">{t("Your promotions")}</h2>
            <p className="mt-1 text-sm text-grey">
              {t("Coupons, pay-per-click, and paid Featured home placements")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-medium text-white hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            {showForm ? t("Close") : t("New promotion")}
          </button>
        </div>

        {showForm ? (
          <section className="mb-8 rounded-xl border border-border-2 bg-white p-5">
            <h3 className="mb-4 text-base font-medium text-black">{t("New promotion")}</h3>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={add}>
              <div>
                <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-black">
                  {t("Title")}
                </label>
                <input
                  id="title"
                  className={fieldClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t("Title")}
                />
              </div>
              <div>
                <label htmlFor="type" className="mb-1.5 block text-sm font-medium text-black">
                  {t("Type")}
                </label>
                <select
                  id="type"
                  className={fieldClass}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="coupon">{t("Coupon")}</option>
                  <option value="ppc">{t("Pay-per-click")}</option>
                  <option value="featured">{t("Featured home (paid)")}</option>
                </select>
              </div>
              {form.type === "featured" ? (
                <>
                  <div className="sm:col-span-2 rounded-lg border border-[#e8ebf0] bg-[#f7f8fa] px-4 py-3 text-sm text-grey">
                    {t("Featured placements require payment ($49). Only paid spots appear on the member home Featured row.")}
                  </div>
                  <div>
                    <label htmlFor="subtitle" className="mb-1.5 block text-sm font-medium text-black">
                      {t("Subtitle")}
                    </label>
                    <input
                      id="subtitle"
                      className={fieldClass}
                      value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      placeholder={t("Fine Dining · Club")}
                    />
                  </div>
                  <div>
                    <label htmlFor="href" className="mb-1.5 block text-sm font-medium text-black">
                      {t("Link")}
                    </label>
                    <input
                      id="href"
                      className={fieldClass}
                      value={form.href}
                      onChange={(e) => setForm({ ...form, href: e.target.value })}
                      placeholder="/member/dining"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="imageUrl" className="mb-1.5 block text-sm font-medium text-black">
                      {t("Image URL")}
                    </label>
                    <input
                      id="imageUrl"
                      className={fieldClass}
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://…"
                    />
                  </div>
                </>
              ) : null}
              <div className="sm:col-span-2">
                <label htmlFor="detail" className="mb-1.5 block text-sm font-medium text-black">
                  {t("Detail")}
                </label>
                <input
                  id="detail"
                  className={fieldClass}
                  value={form.detail}
                  onChange={(e) => setForm({ ...form, detail: e.target.value })}
                  placeholder={t("Detail")}
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="h-[50px] min-w-[160px] rounded-lg bg-[var(--mvp-blue)] px-6 text-base font-semibold text-white hover:opacity-95"
                >
                  {t("Create promotion")}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {promos.length === 0 ? (
            <li className="rounded-xl border border-border-2 bg-white px-5 py-8 text-center sm:col-span-2 xl:col-span-3">
              <p className="text-sm font-semibold text-ink">{t("No promotions yet.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Create a discount or PPC offer members can redeem.")}
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                {t("Create promotion")}
              </button>
            </li>
          ) : (
            promos.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-border-2 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--mvp-blue)]/10 text-sm font-semibold text-[var(--mvp-blue)]">
                    {p.type === "ppc" ? "PPC" : "%"}
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                      statusStyles(p.status),
                    )}
                  >
                    {t(p.status)}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-medium text-black">{p.title}</h3>
                <p className="mt-1 text-sm text-grey">{p.detail}</p>
                <p className="mt-3 text-xs text-grey">
                  {p.type === "ppc" ? t("Clicks") : t("Redemptions")}: {p.redemptions}
                </p>
              </li>
            ))
          )}
        </ul>
      </PageBody>
    </div>
  );
}
