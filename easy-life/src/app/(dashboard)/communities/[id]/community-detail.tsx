"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AddProviderSheet } from "@/components/providers/add-provider-sheet";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { brandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";
import type { Community } from "@/lib/types";

type Tab = "residents" | "services" | "activities" | "settings";

const tabs: { id: Tab; label: string }[] = [
  { id: "residents", label: "Residents" },
  { id: "services", label: "Services" },
  { id: "activities", label: "Activities" },
  { id: "settings", label: "Settings" },
];

export function CommunityDetail({
  community,
  clubAdmin = false,
}: {
  community: Community;
  clubAdmin?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>("residents");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [branding, setBranding] = useState({
    appDisplayName: community.appDisplayName ?? community.name,
    primaryColor: community.primaryColor ?? "#6366f1",
    logoUrl: community.logoUrl ?? "",
    coverColor: community.coverColor,
    inviteCode: community.inviteCode ?? "",
    customDomain: (community as Community).customDomain ?? "",
    stagingMode: (community as Community).stagingMode ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/communities/${community.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appDisplayName: branding.appDisplayName,
        primaryColor: branding.primaryColor,
        logoUrl: branding.logoUrl || null,
        coverColor: branding.coverColor,
        customDomain: branding.customDomain || null,
        stagingMode: branding.stagingMode,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not save settings") });
      return;
    }
    toast({ variant: "success", title: t("Community settings saved") });
    router.refresh();
  }

  async function handleCreateProvider(data: {
    firstName: string;
    lastName: string;
    email: string;
    businessName: string;
  }) {
    const res = await fetch(`/api/communities/${community.id}/providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: data.businessName,
        type: activeTab === "activities" ? "activity" : "service",
        category: activeTab === "activities" ? "Activity" : "Service",
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Could not send invite");
    }
    router.refresh();
    return res.json();
  }

  const services = community.providers.filter((p) => p.type === "service");
  const activities = community.providers.filter((p) => p.type === "activity");

  const filteredResidents = useMemo(() => {
    if (!search) return community.residents;
    return community.residents.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, community.residents]);

  const searchPlaceholder =
    activeTab === "residents"
      ? `Search ${community.name} Residents`
      : `Search ${community.name} ${activeTab === "services" ? "Services" : "Activities"}`;

  return (
    <div>
      <ContentHeader
        title={clubAdmin ? "Residents & Services" : community.name}
        backHref={clubAdmin ? undefined : "/communities"}
        right="avatar"
        translateTitle={clubAdmin}
      />
      <PageBody>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-lg bg-[#f2f2f7] p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-white text-black shadow-sm"
                    : "text-grey hover:text-black",
                )}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-lg border-0 bg-[#f2f2f7] pl-9 pr-3 text-sm text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            />
          </div>

          {activeTab !== "residents" && activeTab !== "settings" ? (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--mvp-blue)]/10 px-3 text-sm font-semibold text-[var(--mvp-blue)]"
            >
              <Plus className="h-4 w-4" />
              {activeTab === "services" ? t("Service Provider") : t("Activity Provider")}
            </button>
          ) : null}
        </div>

        <AddProviderSheet
          type={activeTab === "activities" ? "activity" : "service"}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onCreate={handleCreateProvider}
        />

        {activeTab === "residents" ? (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-ink">{t("Community Management")}</h2>
            <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
              {community.management.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar name={member.name} size="md" />
                  <div>
                    <p className="text-sm font-bold text-ink">{member.name}</p>
                    <p
                      className={cn(
                        "text-xs",
                        member.role === "Community Admin"
                          ? "text-grey"
                          : "text-[var(--mvp-blue)]",
                      )}
                    >
                      {t(member.role)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mt-10 text-lg font-bold text-ink">
              {t("Residents")}:{" "}
              <span className="text-[var(--mvp-blue)]">{community.residentCount}</span>
            </h2>
            <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
              {filteredResidents.slice(0, 60).map((resident, i) => (
                <div key={`${resident.id}-${i}`} className="flex items-center gap-3">
                  <Avatar name={resident.name} size="md" />
                  <p className="text-sm font-semibold text-ink">{resident.name}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab !== "residents" && activeTab !== "settings" ? (
          <ProviderList
            label={activeTab === "services" ? t("Service Providers") : t("Activity Providers")}
            providers={activeTab === "services" ? services : activities}
            emptyLabel={t("No providers yet.")}
          />
        ) : null}

        {activeTab === "settings" ? (
          <form className="mt-8 max-w-xl space-y-4" onSubmit={saveBranding}>
            <h2 className="text-lg font-bold text-ink">{t("Branding & onboarding")}</h2>
            <p className="text-sm text-grey">
              {t("Customize how this club appears to members. Share the invite code for member signup.")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="inviteCode">{t("Member invite code")}</Label>
              <Input id="inviteCode" value={branding.inviteCode} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appDisplayName">{t("Display name")}</Label>
              <Input
                id="appDisplayName"
                value={branding.appDisplayName}
                onChange={(e) => setBranding({ ...branding, appDisplayName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryColor">{t("Primary color")}</Label>
              <Input
                id="primaryColor"
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="h-12 w-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">{t("Logo URL")}</Label>
              <Input
                id="logoUrl"
                placeholder="https://…"
                value={branding.logoUrl}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverColor">{t("Cover gradient (Tailwind classes)")}</Label>
              <Input
                id="coverColor"
                value={branding.coverColor}
                onChange={(e) => setBranding({ ...branding, coverColor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customDomain">{t("Custom domain")}</Label>
              <Input
                id="customDomain"
                placeholder="members.yourclub.com"
                value={branding.customDomain}
                onChange={(e) => setBranding({ ...branding, customDomain: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-grey">
              <input
                type="checkbox"
                checked={branding.stagingMode}
                onChange={(e) => setBranding({ ...branding, stagingMode: e.target.checked })}
              />
              {t("Staging mode — hide from member rollout until ready")}
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? t("Saving…") : t("Save settings")}
            </Button>
          </form>
        ) : null}
      </PageBody>
    </div>
  );
}

function ProviderList({
  label,
  providers,
  emptyLabel,
}: {
  label: string;
  providers: Community["providers"];
  emptyLabel: string;
}) {
  const { t } = useI18n();
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const visible = providers.filter((p) => !removed.has(p.id));

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-ink">
        {label} <span className="text-[var(--mvp-blue)]">{visible.length}</span>
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((provider) => (
          <div key={provider.id} className="relative">
            <div
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuFor(menuFor === provider.id ? null : provider.id);
              }}
              className="flex items-center gap-4 rounded-xl bg-white p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  provider.imageUrl ||
                  (provider.type === "activity"
                    ? brandAssets.serviceCourt
                    : brandAssets.serviceHero)
                }
                alt=""
                className="h-[70px] w-[70px] shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{provider.name}</p>
                <p className="mt-0.5 text-xs text-grey">{provider.category}</p>
              </div>
            </div>
            {menuFor === provider.id ? (
              <div className="absolute left-8 top-full z-20 mt-1 w-[120px] overflow-hidden rounded-lg bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
                <button
                  type="button"
                  onClick={() => {
                    setRemoved((prev) => new Set(prev).add(provider.id));
                    setMenuFor(null);
                  }}
                  className="w-full px-4 py-2.5 text-center text-sm font-medium text-[#ff3b30] hover:bg-[#fff5f5]"
                >
                  {t("Remove")}
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {visible.length === 0 ? (
          <p className="text-sm text-grey">{emptyLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
