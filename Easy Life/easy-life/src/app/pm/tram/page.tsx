"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import {
  Bus,
  MapPin,
  Clock,
  Users,
  Phone,
  CheckCircle,
  Navigation,
  Play,
  User,
  RefreshCw,
} from "lucide-react";

interface TramRequest {
  id: string;
  memberEmail: string;
  memberName: string;
  phone?: string;
  pickupLocation: string;
  destination: string;
  passengers: number;
  specialNeeds?: string;
  status: string;
  estimatedPickup?: string;
  actualPickup?: string;
  completedAt?: string;
  driverName?: string;
  driverNotes?: string;
  vehicleId?: string;
  requestedAt: string;
}

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  requested: { label: "Requested", variant: "info" },
  dispatched: { label: "Dispatched", variant: "warning" },
  en_route: { label: "En Route", variant: "warning" },
  arrived: { label: "Arrived", variant: "success" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

interface TramDriver {
  id: string;
  name: string;
  phone: string;
  status: string;
}

const VEHICLES = [
  "Tram 1",
  "Tram 2",
  "Golf Cart A",
  "Golf Cart B",
  "Golf Cart C",
  "Shuttle Van",
];

export default function TramDispatchPage() {
  const { t } = useI18n();
  const [requests, setRequests] = useState<TramRequest[]>([]);
  const [drivers, setDrivers] = useState<TramDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddDriver, setShowAddDriver] = useState(false);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const [reqRes, driverRes] = await Promise.all([
        fetch("/api/tram"),
        fetch("/api/tram/drivers"),
      ]);
      
      if (reqRes.ok) {
        setRequests(await reqRes.json());
      }
      if (driverRes.ok) {
        setDrivers(await driverRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addDriver(name: string, phone: string) {
    try {
      const res = await fetch("/api/tram/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (res.ok) {
        setShowAddDriver(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add driver:", error);
    }
  }

  async function updateRequest(id: string, updates: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/tram/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update request:", error);
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (filter === "active") return !["completed", "cancelled"].includes(r.status);
    if (filter === "completed") return r.status === "completed";
    if (filter === "cancelled") return r.status === "cancelled";
    return true;
  });

  const activeCount = requests.filter(
    (r) => !["completed", "cancelled"].includes(r.status)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Driver Modal */}
      {showAddDriver && (
        <AddDriverModal
          onAdd={addDriver}
          onClose={() => setShowAddDriver(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Bus className="w-6 h-6 text-brand" />
            {t("Tram Dispatch")}
          </h1>
          <p className="text-grey mt-1">
            {activeCount > 0 
              ? `${activeCount} active request${activeCount === 1 ? "" : "s"}`
              : "No active requests"
            }
            {drivers.length > 0 && ` • ${drivers.length} driver${drivers.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setShowAddDriver(true)}>
            <User className="w-4 h-4 mr-2" />
            {t("Add Driver")}
          </Button>
          <Button variant="secondary" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("Refresh")}
          </Button>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests Queue */}
      {filteredRequests.length === 0 ? (
        <Card className="p-8 text-center">
          <Bus className="w-12 h-12 text-grey mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t("No Requests")}</h3>
          <p className="text-grey">
            {filter === "active"
              ? t("No active tram requests at this time.")
              : t("No requests match the current filter.")}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const config = statusConfig[request.status] || statusConfig.requested;
            const isExpanded = expandedId === request.id;
            const isActive = !["completed", "cancelled"].includes(request.status);

            return (
              <Card
                key={request.id}
                className={`p-4 ${
                  request.status === "requested"
                    ? "border-l-4 border-l-info bg-info/5"
                    : request.status === "en_route"
                    ? "border-l-4 border-l-warning"
                    : ""
                }`}
              >
                <div className="space-y-4">
                  {/* Main Info Row */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant}>{config.label}</Badge>
                        <span className="font-medium">{request.memberName}</span>
                        {request.phone && (
                          <a
                            href={`tel:${request.phone}`}
                            className="text-brand hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {request.phone}
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-grey" />
                          <span className="font-medium">{request.pickupLocation}</span>
                        </span>
                        <span className="text-grey">→</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-brand" />
                          <span className="font-medium">{request.destination}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-grey">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {request.passengers}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(request.requestedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {request.vehicleId && (
                          <span className="flex items-center gap-1">
                            <Bus className="w-4 h-4" />
                            {request.vehicleId}
                          </span>
                        )}
                        {request.driverName && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {request.driverName}
                          </span>
                        )}
                      </div>

                      {request.specialNeeds && (
                        <p className="text-sm bg-warning/10 text-warning-dark px-2 py-1 rounded inline-block">
                          ⚠️ {request.specialNeeds}
                        </p>
                      )}
                    </div>

                    {/* Quick Actions */}
                    {isActive && (
                      <div className="flex items-center gap-2">
                        {request.status === "requested" && (
                          <Button
                            size="sm"
                            onClick={() => setExpandedId(isExpanded ? null : request.id)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            {t("Dispatch")}
                          </Button>
                        )}
                        {request.status === "dispatched" && (
                          <Button
                            size="sm"
                            onClick={() => updateRequest(request.id, { status: "en_route" })}
                          >
                            <Navigation className="w-4 h-4 mr-1" />
                            {t("En Route")}
                          </Button>
                        )}
                        {request.status === "en_route" && (
                          <Button
                            size="sm"
                            onClick={() => updateRequest(request.id, { status: "arrived" })}
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            {t("Arrived")}
                          </Button>
                        )}
                        {request.status === "arrived" && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => updateRequest(request.id, { status: "completed" })}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t("Complete")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded Dispatch Form */}
                  {isExpanded && request.status === "requested" && (
                    <div className="border-t pt-4 mt-4">
                      <DispatchForm
                        request={request}
                        drivers={drivers}
                        onDispatch={(data) => {
                          updateRequest(request.id, { ...data, status: "dispatched" });
                          setExpandedId(null);
                        }}
                        onCancel={() => setExpandedId(null)}
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-info">
            {requests.filter((r) => r.status === "requested").length}
          </div>
          <div className="text-sm text-grey">Waiting</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-warning">
            {requests.filter((r) => ["dispatched", "en_route"].includes(r.status)).length}
          </div>
          <div className="text-sm text-grey">In Transit</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-success">
            {requests.filter((r) => r.status === "completed").length}
          </div>
          <div className="text-sm text-grey">Completed Today</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">
            {Math.round(
              requests.filter((r) => r.status === "completed" && r.actualPickup).length > 0
                ? requests
                    .filter((r) => r.status === "completed" && r.actualPickup)
                    .reduce((sum, r) => {
                      const wait = new Date(r.actualPickup!).getTime() - new Date(r.requestedAt).getTime();
                      return sum + wait / 60000;
                    }, 0) /
                    requests.filter((r) => r.status === "completed" && r.actualPickup).length
                : 0
            )}
            <span className="text-sm font-normal text-grey">min</span>
          </div>
          <div className="text-sm text-grey">Avg Wait Time</div>
        </Card>
      </div>
    </div>
  );
}

function DispatchForm({
  request,
  drivers,
  onDispatch,
  onCancel,
}: {
  request: TramRequest;
  drivers: TramDriver[];
  onDispatch: (data: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [vehicleId, setVehicleId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("5");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const estimatedPickup = new Date(
      Date.now() + parseInt(estimatedMinutes) * 60000
    ).toISOString();
    onDispatch({ vehicleId, driverName, estimatedPickup });
  }

  const driverOptions = drivers.length > 0 
    ? drivers.map(d => d.name)
    : ["Carlos M.", "Maria S.", "James T.", "David R.", "Linda P."];

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="space-y-2">
        <Label>{t("Vehicle")}</Label>
        <Select value={vehicleId} onValueChange={setVehicleId}>
          <SelectTrigger>
            <SelectValue placeholder={t("Select vehicle")} />
          </SelectTrigger>
          <SelectContent>
            {VEHICLES.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("Driver")} 📱</Label>
        <Select value={driverName} onValueChange={setDriverName}>
          <SelectTrigger>
            <SelectValue placeholder={t("Select driver")} />
          </SelectTrigger>
          <SelectContent>
            {driverOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {drivers.length > 0 && (
          <p className="text-xs text-grey">SMS will be sent to driver</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("ETA (minutes)")}</Label>
        <Input
          type="number"
          min="1"
          max="60"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
        />
      </div>

      <div className="flex items-end gap-2">
        <Button type="submit" disabled={!vehicleId || !driverName}>
          {t("Dispatch")}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("Cancel")}
        </Button>
      </div>
    </form>
  );
}

function AddDriverModal({
  onAdd,
  onClose,
}: {
  onAdd: (name: string, phone: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name && phone) {
      onAdd(name, phone);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-brand" />
          {t("Add Tram Driver")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Driver Name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Carlos Martinez"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("Phone Number")}</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              required
            />
            <p className="text-xs text-grey">
              Driver will receive SMS notifications for pickups
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={!name || !phone}>
              {t("Add Driver")}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("Cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
