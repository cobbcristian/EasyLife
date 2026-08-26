"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Config = {
  communityId: string;
  bundleId: string;
  appName: string;
  platform: string;
  enabled: boolean;
};

export default function PmNativeAppsPage() {
  const [configs, setConfigs] = useState<Config[]>([]);

  useEffect(() => {
    fetch("/api/native-apps")
      .then((r) => r.json())
      .then((d) => setConfigs(d.configs ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Native Apps</h1>
        <p className="text-sm text-muted-foreground">
          Per-club App Store / Play Store configuration — Oceanside is live; scaffold
          others from here.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {configs.map((c) => (
          <Card key={c.communityId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {c.appName}
                {c.enabled ? (
                  <Badge>Live</Badge>
                ) : (
                  <Badge variant="outline">Scaffold</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{c.bundleId}</p>
              <p className="mt-1">Community: {c.communityId}</p>
              <p className="mt-1">Platform: {c.platform}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
