"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MemberMvpServiceDetails } from "@/components/member/member-mvp-service-details";
import { figmaServiceDetailForVendor } from "@/lib/figma-service-detail";
import { useI18n } from "@/lib/i18n";

interface Vendor {
  id: string;
  name: string;
  category: string;
  type: string;
  rating: number | null;
  email: string | null;
}

export default function VendorDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const id = params.id as string;
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/directory?type=vendors")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.vendors ?? []).find((v: Vendor) => v.id === id);
        setVendor(found ?? null);
      })
      .catch(() => setVendor(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-[family-name:var(--font-poppins)]">
        <p className="text-sm text-grey">{t("Loading…")}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center font-[family-name:var(--font-poppins)]">
        <p className="text-sm text-grey">{t("Provider not found.")}</p>
        <Link
          href="/member/vendors"
          className="mt-4 inline-block text-sm font-medium text-[var(--mvp-blue)]"
        >
          {t("Back to services")}
        </Link>
      </div>
    );
  }

  const detail = figmaServiceDetailForVendor(vendor);
  const serviceLabel = detail.offerings[0]?.name ?? vendor.category;
  const offeringBlurb = detail.offerings[0]?.description
    ? `${serviceLabel} ${detail.offerings[0].description}`
    : serviceLabel;
  // Figma Message Conversation: Vendor Side (4703:9361)
  const draft = [
    "Hi! I'd like to request to book your service.",
    offeringBlurb,
  ].join("\n");
  const vendorEmail = vendor.email?.trim();
  const messageHref = vendorEmail
    ? `/member/messages?to=${encodeURIComponent(vendorEmail)}&name=${encodeURIComponent(vendor.name)}&draft=${encodeURIComponent(draft)}`
    : undefined;

  return (
    <MemberMvpServiceDetails
      detail={detail}
      messageHref={messageHref}
      bookHref={messageHref ? undefined : "/member/contact"}
      bookLabel={messageHref ? undefined : t("Contact club")}
    />
  );
}
