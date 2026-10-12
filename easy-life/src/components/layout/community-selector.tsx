"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export interface CommunityOption {
  id: string;
  name: string;
  logoUrl?: string | null;
  appDisplayName?: string | null;
}

interface CommunitySelectorProps {
  communities: CommunityOption[];
  activeCommunityId: string | null;
  onCommunityChange?: (communityId: string) => void;
}

export function CommunitySelector({
  communities,
  activeCommunityId,
  onCommunityChange,
}: CommunitySelectorProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  async function onChange(communityId: string) {
    setLoading(true);
    onCommunityChange?.(communityId);
    await fetch("/api/admin/active-community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId }),
    });
    router.refresh();
    setLoading(false);
  }

  if (communities.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-border-2 bg-white/80 p-3">
      <label
        htmlFor="active-community"
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-grey"
      >
        {t("Managing club")}
      </label>
      <select
        id="active-community"
        value={activeCommunityId ?? communities[0]?.id ?? ""}
        disabled={loading}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-border-1 bg-white px-2 text-sm text-ink"
      >
        {communities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
