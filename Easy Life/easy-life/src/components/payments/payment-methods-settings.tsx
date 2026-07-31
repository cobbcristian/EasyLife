"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

interface PaymentMethodDTO {
  id: string;
  label: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

type PaymentPreference = "always_prompt" | "store";

interface PaymentSettingsState {
  preference: PaymentPreference;
  methods: PaymentMethodDTO[];
  stripeEnabled: boolean;
  demoPaymentsAllowed: boolean;
}

export function PaymentMethodsSettings({
  returnPath = "/member/payments",
  compact = false,
}: {
  returnPath?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PaymentSettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [demoForm, setDemoForm] = useState({
    brand: "visa",
    last4: "",
    expMonth: "12",
    expYear: String(new Date().getFullYear() + 3),
    label: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/member/payment-settings")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          setSettings({
            preference: "always_prompt",
            methods: [],
            stripeEnabled: false,
            demoPaymentsAllowed: false,
          });
          return;
        }
        setSettings({
          preference: d.preference === "store" ? "store" : "always_prompt",
          methods: Array.isArray(d.methods) ? d.methods : [],
          stripeEnabled: Boolean(d.stripeEnabled),
          demoPaymentsAllowed: Boolean(d.demoPaymentsAllowed),
        });
      })
      .catch(() => {
        setSettings({
          preference: "always_prompt",
          methods: [],
          stripeEnabled: false,
          demoPaymentsAllowed: false,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment_setup") === "success") {
      fetch("/api/member/payment-methods", { method: "PUT" })
        .then((r) => r.json())
        .then((d) => {
          if (d.preference) {
            setSettings(d);
            toast({ variant: "success", title: t("Payment method saved") });
          }
        })
        .catch(() => {});
      window.history.replaceState({}, "", returnPath);
    }
  }, [returnPath, t, toast]);

  async function savePreference(preference: PaymentPreference) {
    setBusy(true);
    const res = await fetch("/api/member/payment-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preference }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not save preference") });
      return;
    }
    const data = await res.json();
    setSettings(data);
    toast({ variant: "success", title: t("Payment preference saved") });
  }

  async function addStripeCard() {
    setBusy(true);
    const res = await fetch("/api/member/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup_stripe", returnPath }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok || !data.url) {
      toast({
        variant: "warning",
        title: t("Could not add card"),
        description: data.error,
      });
      return;
    }
    window.location.href = data.url;
  }

  async function addDemoCard(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/member/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_demo",
        ...demoForm,
        expMonth: Number(demoForm.expMonth),
        expYear: Number(demoForm.expYear),
        setDefault: settings?.methods.length === 0,
      }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not add card"), description: data.error });
      return;
    }
    setSettings(data);
    setShowAdd(false);
    setDemoForm({
      brand: "visa",
      last4: "",
      expMonth: "12",
      expYear: String(new Date().getFullYear() + 3),
      label: "",
    });
    toast({ variant: "success", title: t("Payment method added") });
  }

  async function makeDefault(id: string) {
    const res = await fetch(`/api/member/payment-methods/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (!res.ok) return;
    setSettings(await res.json());
  }

  async function removeMethod(id: string) {
    const res = await fetch(`/api/member/payment-methods/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setSettings(await res.json());
    toast({ variant: "success", title: t("Payment method removed") });
  }

  if (loading || !settings) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border-2 bg-white px-5 py-6 text-sm text-grey",
          !compact && "mt-6",
        )}
      >
        {t("Loading…")}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border-2 bg-white p-5 font-[family-name:var(--font-poppins)]",
        !compact && "mt-6",
      )}
    >
      <h2 className="mb-5 flex items-center gap-2 text-base font-medium text-black">
        <CreditCard className="h-5 w-5 text-[var(--mvp-blue)]" />
        {t("Payment methods")}
      </h2>
      <div className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink">{t("When paying")}</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-2 p-3 has-[:checked]:border-[var(--mvp-blue)]/40 has-[:checked]:bg-[var(--mvp-blue)]/10">
            <input
              type="radio"
              name="payment-preference"
              checked={settings.preference === "always_prompt"}
              disabled={busy}
              onChange={() => savePreference("always_prompt")}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-ink">{t("Always prompt for payment")}</span>
              <span className="text-xs text-grey">
                {t("You'll enter card details each time you pay (Stripe Checkout).")}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-2 p-3 has-[:checked]:border-[var(--mvp-blue)]/40 has-[:checked]:bg-[var(--mvp-blue)]/10">
            <input
              type="radio"
              name="payment-preference"
              checked={settings.preference === "store"}
              disabled={busy}
              onChange={() => savePreference("store")}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-ink">{t("Store payment methods")}</span>
              <span className="text-xs text-grey">
                {t("Pay with your default card. Add multiple cards and choose a default.")}
              </span>
            </span>
          </label>
        </fieldset>

        {settings.preference === "store" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">{t("Saved cards")}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  if (settings.stripeEnabled) void addStripeCard();
                  else if (settings.demoPaymentsAllowed) setShowAdd((s) => !s);
                  else {
                    toast({
                      variant: "warning",
                      title: t("Could not add card"),
                      description: t("Stripe is not configured for this environment."),
                    });
                  }
                }}
              >
                <Plus className="h-4 w-4" />
                {settings.stripeEnabled
                  ? t("Add card (Stripe)")
                  : settings.demoPaymentsAllowed
                    ? t("Add card")
                    : t("Add card (Stripe)")}
              </Button>
            </div>

            {settings.methods.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border-2 p-4 text-sm text-grey">
                {t("No saved cards yet. Add one to use as your default.")}
              </p>
            ) : (
              <ul className="space-y-2">
                {settings.methods.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border-2 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{m.label}</p>
                      <p className="text-xs text-grey">
                        {t("Expires")} {String(m.expMonth).padStart(2, "0")}/{m.expYear}
                        {m.isDefault ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[var(--mvp-blue)]">
                            <Star className="h-3 w-3 fill-current" />
                            {t("Default")}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!m.isDefault ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => makeDefault(m.id)}>
                          {t("Make default")}
                        </Button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeMethod(m.id)}
                        className="rounded-md p-2 text-grey hover:bg-red-50 hover:text-danger"
                        aria-label={t("Remove payment method")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {showAdd && !settings.stripeEnabled && settings.demoPaymentsAllowed ? (
              <form onSubmit={addDemoCard} className="rounded-lg border border-border-2 bg-sidebar p-4 space-y-3">
                <p className="text-xs text-grey">
                  {t("Demo mode — card is saved locally for testing without Stripe.")}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="card-brand">{t("Card type")}</Label>
                    <Select
                      id="card-brand"
                      value={demoForm.brand}
                      onChange={(e) => setDemoForm({ ...demoForm, brand: e.target.value })}
                    >
                      <option value="visa">Visa</option>
                      <option value="mastercard">Mastercard</option>
                      <option value="amex">Amex</option>
                      <option value="discover">Discover</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="card-last4">{t("Last 4 digits")}</Label>
                    <Input
                      id="card-last4"
                      maxLength={4}
                      placeholder="4242"
                      value={demoForm.last4}
                      onChange={(e) => setDemoForm({ ...demoForm, last4: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="card-exp-m">{t("Exp. month")}</Label>
                    <Input
                      id="card-exp-m"
                      type="number"
                      min={1}
                      max={12}
                      value={demoForm.expMonth}
                      onChange={(e) => setDemoForm({ ...demoForm, expMonth: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="card-exp-y">{t("Exp. year")}</Label>
                    <Input
                      id="card-exp-y"
                      type="number"
                      min={new Date().getFullYear()}
                      value={demoForm.expYear}
                      onChange={(e) => setDemoForm({ ...demoForm, expYear: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="card-label">{t("Nickname (optional)")}</Label>
                    <Input
                      id="card-label"
                      placeholder={t("Personal Visa")}
                      value={demoForm.label}
                      onChange={(e) => setDemoForm({ ...demoForm, label: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy}>{t("Save card")}</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
                    {t("Cancel")}
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
