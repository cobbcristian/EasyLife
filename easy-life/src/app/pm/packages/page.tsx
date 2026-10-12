"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Search, Bell } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";

type PackageItem = {
  id: string;
  memberEmail: string;
  memberName: string;
  unit: string;
  carrier: string;
  trackingNumber: string | null;
  description: string;
  status: string;
  location: string;
  receivedBy: string | null;
  arrivedAt: string;
};

const carriers = ["UPS", "FedEx", "USPS", "Amazon", "DHL", "Other"];
const locations = ["Front Desk", "Mailroom", "Package Locker", "Loading Dock", "Concierge"];

export default function PmPackagesPage() {
  const { t } = useI18n();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("pending");

  const [form, setForm] = useState({
    memberEmail: "",
    memberName: "",
    unit: "",
    carrier: "UPS",
    trackingNumber: "",
    description: "",
    location: "Front Desk",
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = () => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then((data) => {
        setPackages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({
        memberEmail: "",
        memberName: "",
        unit: "",
        carrier: "UPS",
        trackingNumber: "",
        description: "",
        location: "Front Desk",
      });
      fetchPackages();
    }
  };

  const handleNotify = async (id: string) => {
    const res = await fetch(`/api/packages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "notified" }),
    });
    if (res.ok) {
      fetchPackages();
    }
  };

  const filtered = packages.filter((p) => {
    const matchesSearch =
      !search ||
      p.memberName.toLowerCase().includes(search.toLowerCase()) ||
      p.unit.toLowerCase().includes(search.toLowerCase()) ||
      p.trackingNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && (p.status === "arrived" || p.status === "notified")) ||
      p.status === filter;

    return matchesSearch && matchesFilter;
  });

  const pendingCount = packages.filter((p) => p.status === "arrived" || p.status === "notified").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Package Management")}</h1>
          <p className="text-grey mt-1">
            {t(`${pendingCount} packages awaiting pickup`)}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t("Log Package")}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Log New Package")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("Resident Name")}</Label>
                <Input
                  required
                  value={form.memberName}
                  onChange={(e) => setForm({ ...form, memberName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Resident Email")}</Label>
                <Input
                  type="email"
                  required
                  value={form.memberEmail}
                  onChange={(e) => setForm({ ...form, memberEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Unit")}</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Carrier")}</Label>
                <Select value={form.carrier} onValueChange={(v) => setForm({ ...form, carrier: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("Tracking Number")}</Label>
                <Input
                  value={form.trackingNumber}
                  onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Storage Location")}</Label>
                <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("Description")}</Label>
                <Input
                  placeholder="e.g., Large box, fragile"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">{t("Log Package")}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  {t("Cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey" />
          <Input
            placeholder={t("Search by name, unit, or tracking...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t("Pending")}</SelectItem>
            <SelectItem value="arrived">{t("Arrived")}</SelectItem>
            <SelectItem value="notified">{t("Notified")}</SelectItem>
            <SelectItem value="picked_up">{t("Picked Up")}</SelectItem>
            <SelectItem value="all">{t("All")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-grey-200 rounded" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-grey">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{t("No packages found")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-grey">
                <th className="p-3">{t("Resident")}</th>
                <th className="p-3">{t("Carrier")}</th>
                <th className="p-3">{t("Location")}</th>
                <th className="p-3">{t("Status")}</th>
                <th className="p-3">{t("Arrived")}</th>
                <th className="p-3">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pkg) => (
                <tr key={pkg.id} className="border-b hover:bg-grey-50">
                  <td className="p-3">
                    <div className="font-medium">{pkg.memberName}</div>
                    <div className="text-grey text-xs">{pkg.unit}</div>
                  </td>
                  <td className="p-3">
                    <div>{pkg.carrier}</div>
                    {pkg.trackingNumber && (
                      <div className="text-grey text-xs truncate max-w-32">{pkg.trackingNumber}</div>
                    )}
                  </td>
                  <td className="p-3">{pkg.location}</td>
                  <td className="p-3">
                    <Badge
                      className={
                        pkg.status === "picked_up"
                          ? "bg-green-100 text-green-800"
                          : pkg.status === "notified"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                      }
                    >
                      {pkg.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="p-3 text-grey">
                    {new Date(pkg.arrivedAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    {pkg.status === "arrived" && (
                      <Button size="sm" variant="outline" onClick={() => handleNotify(pkg.id)}>
                        <Bell className="h-3 w-3 mr-1" />
                        {t("Notify")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
