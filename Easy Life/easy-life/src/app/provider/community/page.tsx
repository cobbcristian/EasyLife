"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import { brandAssets, imageForProviderCategory } from "@/lib/brand-assets";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
  duration?: string;
}

interface ProviderInfo {
  businessName: string;
  category: string;
  address: string;
}

function serviceThumb(category: string, name: string, providerCategory: string): string {
  // Prefer the service name so "Hedge Trimming" never falls through to a kitchen shot.
  return imageForProviderCategory(
    `${providerCategory} ${category}`,
    "service",
    name,
  );
}

/** Figma-aligned provider community listing. */
export default function ProviderCommunityPage() {
  const { t } = useI18n();
  const [avatarName, setAvatarName] = useState("");
  const [profile, setProfile] = useState<ProviderInfo>({
    businessName: "",
    category: "",
    address: "",
  });
  const [services, setServices] = useState<Service[]>([]);
  const [communityName, setCommunityName] = useState("");
  const [menuItemCount, setMenuItemCount] = useState(0);

  useEffect(() => {
    fetch("/api/provider/community")
      .then((r) => r.json())
      .then((d) => {
        setAvatarName(d.provider?.businessName ?? "");
        setProfile({
          businessName: d.provider?.businessName ?? "",
          category: d.provider?.category ?? "",
          address: d.provider?.address ?? "",
        });
        setCommunityName(d.community?.name ?? "");
        setServices(d.services ?? []);
        setMenuItemCount(d.menuItemCount ?? 0);
      })
      .catch(() => {});
  }, []);

  const isCleaning = profile.category.toLowerCase() === "cleaning";
  const isLawn = /lawn|landscape|garden|grounds/i.test(profile.category);

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Community")} avatarName={avatarName} />
      <PageBody>
        <div className="mb-8 flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              isLawn
                ? brandAssets.serviceLandscaping
                : imageForProviderCategory(profile.category, "service", profile.businessName)
            }
            alt=""
            className="h-[70px] w-[70px] shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <h2 className="text-[21px] font-medium text-black">
              {communityName || profile.businessName}
            </h2>
            <p className="mt-0.5 text-sm text-grey">{profile.category}</p>
            {profile.address ? (
              <p className="mt-0.5 text-xs text-grey">{profile.address}</p>
            ) : null}
          </div>
        </div>

        {isCleaning && menuItemCount > 0 ? (
          <p className="mb-6 text-sm text-grey">
            {t(
              "Your cleaning packages are listed below. The Menu page manages clubhouse dining items for member orders — separate from cleaning services.",
            )}
          </p>
        ) : null}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium text-black">
            {isCleaning ? t("Service packages") : t("Services")} {services.length}
          </h2>
          {!isCleaning ? (
            <Link
              href="/provider/menu"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-medium text-white hover:opacity-95"
            >
              {t("Add service")}
            </Link>
          ) : null}
        </div>

        <ul className="grid gap-6 md:grid-cols-2">
          {services.length === 0 ? (
            <li className="rounded-xl border border-border-2 bg-white px-5 py-8 text-center md:col-span-2">
              <p className="text-sm font-semibold text-ink">{t("No services listed yet.")}</p>
              <Link
                href={isCleaning ? "/provider/services" : "/provider/menu"}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
              >
                {isCleaning ? t("Add package") : t("Add service")}
              </Link>
            </li>
          ) : (
            services.map((service) => (
              <li
                key={service.id}
                className="flex gap-4 rounded-xl border border-border-2 bg-white p-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={serviceThumb(service.category, service.name, profile.category)}
                  alt=""
                  className="h-[70px] w-[70px] shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-black">{service.name}</p>
                    <p className="shrink-0 text-sm font-medium text-black">
                      {formatCurrency(service.price)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-grey">
                    {service.duration
                      ? `${service.category} · ${service.duration}`
                      : service.category}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </PageBody>
    </div>
  );
}
