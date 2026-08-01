"use client";

import { useState, useEffect } from "react";
import { Package, Clock, CheckCircle, RotateCcw, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

type PackageItem = {
  id: string;
  carrier: string;
  trackingNumber: string | null;
  description: string;
  status: string;
  location: string;
  arrivedAt: string;
  notifiedAt: string | null;
  pickedUpAt: string | null;
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Package }> = {
  arrived: { label: "Ready for Pickup", color: "bg-blue-100 text-blue-800", icon: Package },
  notified: { label: "Notified", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  picked_up: { label: "Picked Up", color: "bg-green-100 text-green-800", icon: CheckCircle },
  returned: { label: "Returned", color: "bg-red-100 text-red-800", icon: RotateCcw },
};

export default function MemberPackagesPage() {
  const { t } = useI18n();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((data) => {
        setPackages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePickUp = async (id: string) => {
    const res = await fetch(`/api/packages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "picked_up" }),
    });
    if (res.ok) {
      setPackages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "picked_up", pickedUpAt: new Date().toISOString() } : p))
      );
    }
  };

  const filtered = filter === "all" ? packages : packages.filter((p) => p.status === filter);
  const pendingCount = packages.filter((p) => p.status === "arrived" || p.status === "notified").length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-grey-200 rounded w-48" />
          <div className="h-32 bg-grey-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("My Packages")}</h1>
          <p className="text-grey mt-1">
            {pendingCount > 0
              ? t(`You have ${pendingCount} package(s) waiting for pickup`)
              : t("No packages waiting")}
          </p>
        </div>
        <Package className="h-8 w-8 text-brand" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "arrived", "notified", "picked_up"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === "all" ? t("All") : statusConfig[status]?.label ?? status}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-grey">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{t("No packages found")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((pkg) => {
            const config = statusConfig[pkg.status] ?? statusConfig.arrived;
            const Icon = config.icon;
            return (
              <Card key={pkg.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-grey-100 rounded-lg">
                        <Icon className="h-5 w-5 text-grey-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pkg.carrier}</span>
                          <Badge className={config.color}>{config.label}</Badge>
                        </div>
                        {pkg.trackingNumber && (
                          <p className="text-sm text-grey mt-1">
                            {t("Tracking")}: {pkg.trackingNumber}
                          </p>
                        )}
                        {pkg.description && (
                          <p className="text-sm text-grey mt-1">{pkg.description}</p>
                        )}
                        <div className="flex items-center gap-1 text-sm text-grey mt-2">
                          <MapPin className="h-3 w-3" />
                          <span>{pkg.location}</span>
                        </div>
                        <p className="text-xs text-grey mt-1">
                          {t("Arrived")}: {new Date(pkg.arrivedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {(pkg.status === "arrived" || pkg.status === "notified") && (
                      <Button size="sm" onClick={() => handlePickUp(pkg.id)}>
                        {t("Mark Picked Up")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
