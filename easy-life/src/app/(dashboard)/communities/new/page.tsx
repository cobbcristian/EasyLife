"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface OnboardResult {
  communityId: string;
  communityName: string;
  adminEmail: string;
  tempPassword: string;
  inviteCode: string;
  emailSent?: boolean;
  emailError?: string;
}

const fieldClass =
  "h-[57px] w-full rounded-lg border border-border-2 bg-white px-4 text-[15px] text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

/** Figma Super Admin Create Community modal (5462:8327). */
export default function NewCommunityPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    adminFirst: "",
    adminLast: "",
    adminAddress: "",
    adminPhone: "",
    adminEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canCreate =
    form.name.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.adminFirst.trim() &&
    form.adminEmail.trim();

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    try {
      const adminName = `${form.adminFirst} ${form.adminLast}`.trim();
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          city: form.city,
          state: form.state,
          adminName,
          adminEmail: form.adminEmail,
          street: form.street,
          zip: form.zip,
          adminPhone: form.adminPhone,
          adminAddress: form.adminAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: t("Could not create community"),
          description: data.error ?? t("Please try again."),
        });
        setLoading(false);
        return;
      }
      setResult({
        communityId: data.community?.id ?? "",
        communityName: form.name,
        adminEmail: data.adminEmail,
        tempPassword: data.tempPassword,
        inviteCode: data.inviteCode,
        emailSent: data.emailSent,
        emailError: data.emailError,
      });
      if (data.emailSent) {
        toast({ variant: "success", title: t("Welcome email sent") });
      } else if (data.emailError) {
        toast({
          variant: "warning",
          title: t("Email not configured — copy credentials below"),
        });
      }
      setLoading(false);
    } catch {
      toast({ variant: "warning", title: t("Something went wrong") });
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-[family-name:var(--font-poppins)]">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t("Close")}
        onClick={() => router.push("/communities")}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-community-title"
        className="relative flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="relative px-6 py-5">
          <h1
            id="create-community-title"
            className="text-center text-lg font-semibold text-black"
          >
            {t("Create Community")}
          </h1>
          <button
            type="button"
            onClick={() => router.push("/communities")}
            className="absolute right-5 top-5 rounded-md p-1 text-grey hover:bg-slate-100"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-4 overflow-y-auto px-8 py-6">
            <h2 className="text-xl font-bold text-ink">{result.communityName}</h2>
            <p className="text-sm text-grey">{t("Share these credentials with the club admin")}</p>
            <dl className="space-y-4 text-sm">
              {(
                [
                  ["email", t("Admin email"), result.adminEmail],
                  ["pw", t("Temporary password"), result.tempPassword],
                  ["code", t("Member invite code"), result.inviteCode],
                ] as const
              ).map(([key, label, value]) => (
                <div key={key}>
                  <dt className="font-medium text-grey">{label}</dt>
                  <dd className="mt-1 flex items-center gap-2 font-mono text-ink">
                    {value}
                    <button
                      type="button"
                      onClick={() => copy(value, key)}
                      className="text-[var(--mvp-blue)]"
                    >
                      {copied === key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-3 pt-4">
              <Link
                href="/communities"
                className="inline-flex h-11 items-center rounded-lg bg-[var(--mvp-blue)] px-5 text-sm font-semibold text-white"
              >
                {t("Communities")}
              </Link>
              {result.communityId ? (
                <Link
                  href={`/communities/onboarding?communityId=${result.communityId}`}
                  className="inline-flex h-11 items-center rounded-lg border border-border-2 px-5 text-sm font-semibold text-ink"
                >
                  {t("Club Onboarding guide")}
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto px-8 py-6">
              <section>
                <h2 className="mb-3 text-sm font-semibold text-black">{t("General Information")}</h2>
                <div className="space-y-3">
                  <input
                    className={fieldClass}
                    placeholder={t("Community Name")}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    required
                  />
                  <input
                    className={fieldClass}
                    placeholder={t("Office or Clubhouse Street Address")}
                    value={form.street}
                    onChange={(e) => update("street", e.target.value)}
                  />
                  <input
                    className={fieldClass}
                    placeholder={t("City")}
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className={fieldClass}
                      placeholder={t("State")}
                      value={form.state}
                      onChange={(e) => update("state", e.target.value)}
                      required
                    />
                    <input
                      className={fieldClass}
                      placeholder={t("Zip")}
                      value={form.zip}
                      onChange={(e) => update("zip", e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold text-black">
                  {t("Assign Community Admin")}
                </h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className={fieldClass}
                      placeholder={t("First name")}
                      value={form.adminFirst}
                      onChange={(e) => update("adminFirst", e.target.value)}
                      required
                    />
                    <input
                      className={fieldClass}
                      placeholder={t("Last name")}
                      value={form.adminLast}
                      onChange={(e) => update("adminLast", e.target.value)}
                    />
                  </div>
                  <input
                    className={fieldClass}
                    placeholder={t("Address")}
                    value={form.adminAddress}
                    onChange={(e) => update("adminAddress", e.target.value)}
                  />
                  <input
                    className={fieldClass}
                    placeholder={t("Phone Number")}
                    value={form.adminPhone}
                    onChange={(e) => update("adminPhone", e.target.value)}
                  />
                  <input
                    className={fieldClass}
                    type="email"
                    placeholder={t("Email")}
                    value={form.adminEmail}
                    onChange={(e) => update("adminEmail", e.target.value)}
                    required
                  />
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold text-black">
                  {t("Add Community Picture")}
                </h2>
                <div className="flex min-h-[140px] max-w-[200px] items-center justify-center rounded-xl border border-border-2 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                  <span className="text-sm font-semibold text-ink">{t("add picture")}</span>
                </div>
              </section>
            </div>

            <div className="flex items-center justify-between px-6 py-4">
              <button
                type="button"
                onClick={() => router.push("/communities")}
                className="h-[50px] px-4 text-base font-medium text-grey hover:text-ink"
              >
                {t("Delete")}
              </button>
              <button
                type="submit"
                disabled={loading || !canCreate}
                className={cn(
                  "h-[50px] min-w-[180px] rounded-lg px-8 text-base font-semibold text-white",
                  canCreate
                    ? "bg-[var(--mvp-blue)] hover:brightness-95"
                    : "bg-[#e5e5ea]",
                )}
              >
                {loading ? t("Creating...") : t("Create")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
