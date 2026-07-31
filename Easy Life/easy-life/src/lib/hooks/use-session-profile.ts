"use client";

import { useEffect, useState } from "react";

export function useSessionProfile() {
  const [profile, setProfile] = useState({
    name: "Member",
    email: "",
    communityId: "" as string | null,
    communityName: null as string | null,
    appDisplayName: null as string | null,
    logoUrl: null as string | null,
    unit: "—",
    role: "",
    avatarUrl: null as string | null,
  });

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.name) {
          setProfile({
            name: d.name,
            email: d.email ?? "",
            communityId: d.communityId ?? null,
            communityName: d.communityName ?? null,
            appDisplayName: d.appDisplayName ?? null,
            logoUrl: d.logoUrl ?? null,
            unit: d.unit ?? "—",
            role: d.role ?? "",
            avatarUrl: d.avatarUrl ?? null,
          });
        }
      })
      .catch(() => {});
  }, []);

  return profile;
}
