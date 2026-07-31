"use client";

import { CheckCircle2, Circle, Globe, Mail, Server, CreditCard } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { PosSyncButton } from "@/components/pos/pos-sync-button";
import { useI18n } from "@/lib/i18n";

const setupItems = [
  {
    area: "Domain & Hosting",
    icon: Globe,
    status: "ready",
    detail: "Production deployed at easy-life-peach-two.vercel.app. Custom domain DNS can be pointed via Vercel project settings.",
  },
  {
    area: "Stripe Express",
    icon: CreditCard,
    status: "ready",
    detail: "Checkout integrated for HOA dues, tournament entry, apparel, and dining orders.",
  },
  {
    area: "Community Gallery",
    icon: Server,
    status: "ready",
    detail: "Members and admins can upload community photos via the Gallery module.",
  },
  {
    area: "Onboarding Templates",
    icon: Mail,
    status: "ready",
    detail: "Email/SMS templates for welcome, booking confirmation, dues notice, and reminders.",
  },
  {
    area: "Email Accounts (optional)",
    icon: Mail,
    status: "optional",
    detail: "Configure RESEND_API_KEY for transactional email. Dedicated community mailboxes available via concierge setup.",
  },
  {
    area: "Site Migration",
    icon: Server,
    status: "concierge",
    detail: "Import existing member lists, documents, and amenity schedules — contact support@easylife.com.",
  },
  {
    area: "MICROS / POS Integration",
    icon: Server,
    status: "adapter",
    detail: "Restaurant menu and order flow ready. Sync from MICROS when API credentials are configured, or run a demo sync.",
  },
  {
    area: "UAT & Deployment",
    icon: CheckCircle2,
    status: "ready",
    detail: "Staging and production environments configured. Personal onboarding concierge available on request.",
  },
] as const;

const statusVariant = {
  ready: "success",
  optional: "info",
  concierge: "warning",
  adapter: "default",
} as const;

export default function AppSetupPage() {
  const { t } = useI18n();

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("App Setup")} right="logo" />
      <PageBody>
        <p className="mb-6 text-sm text-grey">
          {t("Community launch checklist — domain, payments, onboarding, and integrations.")}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {setupItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.area} className="rounded-xl border border-border-2 bg-white p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--mvp-blue)]/10 text-[var(--mvp-blue)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h2 className="text-base font-medium text-black">{t(item.area)}</h2>
                  </div>
                  <Badge variant={statusVariant[item.status]}>{t(item.status)}</Badge>
                </div>
                <p className="text-sm text-gray-2">{t(item.detail)}</p>
                {item.area === "MICROS / POS Integration" ? (
                  <div className="mt-4">
                    <PosSyncButton />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-border-2 bg-white p-5">
          <h2 className="mb-3 text-base font-medium text-black">{t("Amenity configuration")}</h2>
          <div className="flex items-center gap-3 text-sm text-gray-2">
            <Circle className="h-4 w-4 text-[var(--mvp-blue)]" />
            {t("Configure courts, facilities, fees, and schedules under Amenities in the admin portal.")}
          </div>
        </div>
      </PageBody>
    </div>
  );
}
