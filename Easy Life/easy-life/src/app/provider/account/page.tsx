"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import { Avatar } from "@/components/ui/avatar";
import { ChangePhotoButton } from "@/components/account/change-photo-button";
import { ConnectPayoutsButton } from "@/components/payments/connect-payouts-button";
import { ManageSubscriptionButton } from "@/components/payments/manage-subscription-button";
import { PROVIDER_PLANS } from "@/lib/provider-plans";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { brandAssets, defaultAvatarForRole } from "@/lib/brand-assets";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn } from "@/lib/utils";

function FloatingField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative pt-2.5", className)}>
      <span className="absolute left-3 top-0 z-10 bg-white px-1 text-xs font-medium text-black">
        {label}
      </span>
      {children}
    </div>
  );
}

interface ProviderProfile {
  businessName: string;
  category: string;
  email: string;
  phone: string;
  address: string;
  about: string;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const TIME_OPTIONS = [
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
] as const;

function formatTimeLabel(value: string) {
  const [hRaw, m] = value.split(":");
  const h = Number(hRaw);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${suffix}`;
}

const DEFAULT_ABOUT = "";

const fieldClass =
  "h-[57px] w-full rounded-lg border border-[#bfbfbf] bg-white px-5 text-[15px] text-black placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

const timeSelectClass =
  "h-12 w-full rounded-lg border border-[#aeb4c2] bg-white px-3 text-sm text-black disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

/** Figma Service Account — Filled (4616:15401). */
export default function ProviderAccountPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const session = useSessionProfile();
  const [profile, setProfile] = useState<ProviderProfile>({
    businessName: "",
    category: "",
    email: "",
    phone: "",
    address: "",
    about: DEFAULT_ABOUT,
  });
  const [businessType, setBusinessType] = useState<"service" | "activity">("service");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [hours, setHours] = useState(
    DAYS.map((day) => ({
      day,
      open: day !== "Sunday" && day !== "Saturday",
      start: "09:00",
      end: "17:00",
    })),
  );

  useEffect(() => {
    if (window.location.hash === "#billing") {
      document.getElementById("billing")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (session) => {
        setAvatarUrl(session.avatarUrl ?? undefined);
        setProfile((prev) => ({
          ...prev,
          businessName: session.name ?? "",
          email: session.email ?? "",
        }));

        if (session.providerId) {
          const res = await fetch(`/api/providers/${session.providerId}`);
          if (!res.ok) return;
          const data = await res.json();
          setProfile((prev) => ({
            ...prev,
            businessName: data.provider.businessName,
            category: data.provider.category,
            email: data.provider.email,
            phone: data.provider.phone,
            address: data.provider.address,
            about: data.provider.about ?? data.provider.description ?? "",
          }));
          if (data.provider.type === "activity" || data.provider.type === "service") {
            setBusinessType(data.provider.type);
          }
          return;
        }

        const communityRes = await fetch("/api/provider/community");
        if (!communityRes.ok) return;
        const communityData = await communityRes.json();
        setProfile((prev) => ({
          ...prev,
          businessName: communityData.provider?.businessName ?? session.name ?? "",
          category: communityData.provider?.category ?? "",
          email: communityData.provider?.email ?? session.email ?? "",
          phone: communityData.provider?.phone ?? "",
          address: communityData.provider?.address ?? "",
          about: communityData.provider?.about ?? "",
        }));
        if (
          communityData.provider?.type === "activity" ||
          communityData.provider?.type === "service"
        ) {
          setBusinessType(communityData.provider.type);
        }
      })
      .catch(() => {});
  }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/provider/community", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: profile.businessName,
          category: profile.category,
          phone: profile.phone,
          email: profile.email,
          about: profile.about,
          type: businessType,
        }),
      });
      if (!res.ok) {
        toast({ variant: "warning", title: t("Could not save account") });
        return;
      }
      toast({ variant: "success", title: t("Account saved") });
    } catch {
      toast({ variant: "warning", title: t("Could not save account") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Account")} avatarName={profile.businessName} />
      <PageBody>
        <div className="relative mb-8 inline-block">
          <Avatar
            name={profile.businessName || session.name}
            src={
              defaultAvatarForRole(
                session.role || "provider",
                avatarUrl ?? session.avatarUrl,
                profile.businessName || session.name,
                profile.email || session.email,
              ) ?? brandAssets.providerAvatar
            }
            className="!h-[125px] !w-[125px] !text-3xl"
          />
          <div className="absolute bottom-1 right-1">
            <ChangePhotoButton
              variant="primary"
              size="sm"
              className="!h-[30px] !w-[30px] !min-w-0 !rounded-full !bg-[var(--mvp-blue)] !p-0 text-lg leading-none hover:!brightness-95"
              onPhotoChange={(url) => setAvatarUrl(url)}
            >
              +
            </ChangePhotoButton>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-medium text-black">{t("Vendor Info")}</h2>
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            <FloatingField label={t("Business Name")}>
              <input
                className={fieldClass}
                value={profile.businessName}
                onChange={(e) => setProfile((p) => ({ ...p, businessName: e.target.value }))}
              />
            </FloatingField>
            <FloatingField label={t("Business Address")}>
              <div className="relative">
                <input
                  className={`${fieldClass} pr-12 text-[var(--mvp-blue)]`}
                  value={profile.address}
                  onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                />
                <MapPin className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--mvp-blue)]" />
              </div>
            </FloatingField>
            <FloatingField label={t("Business Type")}>
              <select
                className={`${fieldClass} appearance-none`}
                value={businessType}
                onChange={(e) =>
                  setBusinessType(e.target.value === "activity" ? "activity" : "service")
                }
              >
                <option value="service">{t("Service Provider")}</option>
                <option value="activity">{t("Activity Provider")}</option>
              </select>
            </FloatingField>
            <FloatingField label={t("Phone Number")}>
              <input
                className={fieldClass}
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              />
            </FloatingField>
            <FloatingField label={t("Service Type")}>
              <input
                className={fieldClass}
                value={profile.category}
                onChange={(e) => setProfile((p) => ({ ...p, category: e.target.value }))}
              />
            </FloatingField>
            <FloatingField label={t("Help Email")}>
              <input
                className={fieldClass}
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              />
            </FloatingField>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-medium text-black">{t("About Your Business")}</h2>
          <textarea
            className="min-h-[173px] w-full resize-none rounded-lg border border-[#bfbfbf] px-5 py-4 text-[15px] leading-relaxed text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            value={profile.about}
            onChange={(e) => setProfile((p) => ({ ...p, about: e.target.value }))}
          />
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-medium text-black">{t("Business Hours")}</h2>
          <ul className="space-y-4">
            {hours.map((row, index) => (
              <li
                key={row.day}
                className="grid grid-cols-[100px_auto_1fr] items-center gap-3 lg:grid-cols-[120px_140px_minmax(0,240px)_auto_minmax(0,240px)]"
              >
                <span className="text-sm font-medium text-black">{t(row.day)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setHours((prev) =>
                        prev.map((h, i) => (i === index ? { ...h, open: !h.open } : h)),
                      )
                    }
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition",
                      row.open ? "bg-[#34c759]" : "bg-[#e5e5ea]",
                    )}
                    aria-label={row.open ? t("Open") : t("Closed")}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                        row.open ? "left-[22px]" : "left-0.5",
                      )}
                    />
                  </button>
                  <span className="text-sm text-black">{row.open ? t("Open") : t("Closed")}</span>
                </div>
                <select
                  disabled={!row.open}
                  value={row.start}
                  onChange={(e) =>
                    setHours((prev) =>
                      prev.map((h, i) => (i === index ? { ...h, start: e.target.value } : h)),
                    )
                  }
                  className={cn(timeSelectClass, "hidden lg:block")}
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {formatTimeLabel(opt)}
                    </option>
                  ))}
                </select>
                <span className="hidden text-sm text-grey lg:inline">{t("to")}</span>
                <select
                  disabled={!row.open}
                  value={row.end}
                  onChange={(e) =>
                    setHours((prev) =>
                      prev.map((h, i) => (i === index ? { ...h, end: e.target.value } : h)),
                    )
                  }
                  className={cn(timeSelectClass, "hidden lg:block")}
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {formatTimeLabel(opt)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10 max-w-[415px]">
          <h2 className="mb-4 text-xl font-medium text-black">{t("Password")}</h2>
          <input
            type="password"
            defaultValue="password"
            className={fieldClass}
            readOnly
            aria-label={t("Password")}
          />
        </section>

        <section className="mb-10 max-w-[415px]">
          <h2 className="mb-4 text-xl font-medium text-black">{t("Preferences")}</h2>
          <div className="flex h-12 items-center justify-between">
            <span className="text-sm text-black">{t("Language")}</span>
            <div className="flex items-center gap-2 text-sm text-grey">
              <LanguageSwitcher />
              <ChevronRight className="h-4 w-4 text-black" />
            </div>
          </div>
        </section>

        <div className="mb-10 max-w-[415px]">
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving || !profile.businessName.trim()}
            className="h-[50px] w-full rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white disabled:opacity-50"
          >
            {saving ? t("Saving…") : t("Save")}
          </button>
        </div>

        <section id="billing" className="mb-10 max-w-[415px] scroll-mt-8">
          <h2 className="mb-4 text-xl font-medium text-black">{t("Billing")}</h2>
          <ManageSubscriptionButton
            className="flex h-12 w-full items-center justify-between rounded-lg border border-[#bfbfbf] px-4 text-left text-sm text-black hover:bg-[#fafafa]"
            label={t("Subscription Management")}
            trailing={<ChevronRight className="h-4 w-4 text-grey" />}
          />
          <p className="mt-2 text-xs text-grey">
            {PROVIDER_PLANS.starter.name} · {PROVIDER_PLANS.starter.priceLabel}
            {PROVIDER_PLANS.starter.period}
          </p>
        </section>

        <section className="mb-8 max-w-[415px]">
          <h2 className="mb-3 text-xl font-medium text-black">{t("Payouts")}</h2>
          <p className="mb-3 text-sm text-grey">
            {t("Transfer earnings to your bank via Stripe Connect.")}
          </p>
          <ConnectPayoutsButton />
          <Link
            href="/provider/transactions"
            className="mt-3 inline-flex text-sm font-medium text-[var(--mvp-blue)]"
          >
            {t("View transactions")}
          </Link>
        </section>
      </PageBody>
    </div>
  );
}
