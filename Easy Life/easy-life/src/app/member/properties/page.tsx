"use client";

import { useEffect, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

interface Property {
  id: string;
  address: string;
  type: string;
  owner: boolean;
}

const fieldClass =
  "h-12 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]";

export default function MemberPropertiesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ address: "", type: "" });

  useEffect(() => {
    let on = true;
    fetch("/api/properties")
      .then((r) => r.json())
      .then((propData) => {
        if (!on) return;
        setProperties(propData.properties ?? []);
      })
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  async function connectProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address || !form.type) {
      toast({ variant: "warning", title: t("Address and type required") });
      return;
    }
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: form.address, type: form.type, owner: true }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not connect property") });
      return;
    }
    const data = await res.json();
    setProperties((prev) => [...prev, data.property]);
    setForm({ address: "", type: "" });
    setShowForm(false);
    toast({ variant: "success", title: t("Property connected") });
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#eceff3] bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-4 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-grey">
              {t("Member")}
            </p>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
              {t("My Properties")}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((o) => !o)}
            className="inline-flex h-10 items-center gap-1 rounded-full bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {showForm ? t("Close") : t("Connect")}
          </button>
        </header>

        <div className="space-y-4 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <p className="text-[12px] text-grey">
            {t("Properties connected to your profile")}
          </p>

          {showForm ? (
            <form
              className="space-y-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4"
              onSubmit={connectProperty}
            >
              <h2 className="text-[15px] font-semibold text-ink">
                {t("Connect property")}
              </h2>
              <input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t("Address")}
                className={fieldClass}
              />
              <input
                id="type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder={t("Primary residence")}
                className={fieldClass}
              />
              <button
                type="submit"
                className="h-11 w-full rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white"
              >
                {t("Connect")}
              </button>
            </form>
          ) : null}

          {loading ? (
            <p className="py-6 text-center text-sm text-grey">{t("Loading…")}</p>
          ) : properties.length === 0 ? (
            <div className="rounded-xl bg-[#f7f8fa] px-5 py-8 text-center">
              <p className="text-sm font-semibold text-ink">{t("No properties connected yet.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Link your residence so gate access and HOA notices stay accurate.")}
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex h-10 items-center gap-1 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                {t("Connect property")}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#eceff3]">
              {properties.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f2f4f7] text-ink">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{p.address}</p>
                    <p className="mt-0.5 text-[12px] text-grey">{p.type}</p>
                  </div>
                  {p.owner ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mvp-blue)]">
                      {t("Owner")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
