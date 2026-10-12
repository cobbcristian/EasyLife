"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Navigation,
} from "lucide-react";

interface TramRequest {
  id: string;
  pickupLocation: string;
  destination: string;
  passengers: number;
  phone?: string;
  specialNeeds?: string;
  status: string;
  estimatedPickup?: string;
  driverName?: string;
  vehicleId?: string;
  requestedAt: string;
}

const PICKUP_LOCATIONS = [
  "Building A - Main Lobby",
  "Building B - Main Lobby",
  "Building C - Main Lobby",
  "Building D - Main Lobby",
  "Pool Area",
  "Tennis Courts",
  "Fitness Center",
  "Main Gate",
  "Other (specify in notes)",
];

const DESTINATIONS = [
  "Clubhouse",
  "Pool & Cabanas",
  "Tennis Courts",
  "Fitness Center",
  "Theatre",
  "Billiards Room",
  "Restaurant",
  "Main Gate",
  "Parking Garage",
  "Other (specify in notes)",
];

const statusConfig: Record<string, { label: string; variant: BadgeVariant; icon: React.ReactNode }> = {
  requested: { label: "Requested", variant: "info", icon: <Clock className="w-3 h-3" /> },
  dispatched: { label: "Dispatched", variant: "warning", icon: <Navigation className="w-3 h-3" /> },
  en_route: { label: "On The Way", variant: "warning", icon: <Bus className="w-3 h-3" /> },
  arrived: { label: "Arrived", variant: "success", icon: <CheckCircle className="w-3 h-3" /> },
  completed: { label: "Completed", variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", variant: "danger", icon: <X className="w-3 h-3" /> },
};

export default function TramRequestPage() {
  const { t } = useI18n();
  const [requests, setRequests] = useState<TramRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [phone, setPhone] = useState("");
  const [specialNeeds, setSpecialNeeds] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const res = await fetch("/api/tram?my=true");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch tram requests:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickupLocation || !destination) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/tram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupLocation,
          destination,
          passengers: parseInt(passengers),
          phone: phone || undefined,
          specialNeeds: specialNeeds || undefined,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setPickupLocation("");
        setDestination("");
        setPassengers("1");
        setPhone("");
        setSpecialNeeds("");
        fetchRequests();
      }
    } catch (error) {
      console.error("Failed to submit request:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this tram request?")) return;

    try {
      const res = await fetch(`/api/tram/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (res.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error("Failed to cancel request:", error);
    }
  }

  const activeRequests = requests.filter(
    (r) => !["completed", "cancelled"].includes(r.status)
  );
  const pastRequests = requests.filter((r) =>
    ["completed", "cancelled"].includes(r.status)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Bus className="w-6 h-6 text-brand" />
            {t("Tram Service")}
          </h1>
          <p className="text-grey mt-1">
            {t("Request a tram pickup to get around the community")}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="w-4 h-4 mr-2" />
          {t("Request Pickup")}
        </Button>
      </div>

      {/* Request Form */}
      {showForm && (
        <Card className="p-6 border-2 border-brand/20 bg-brand/5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-brand" />
            {t("Request Tram Pickup")}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup">{t("Pickup Location")} *</Label>
                <Select value={pickupLocation} onValueChange={setPickupLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select pickup location")} />
                  </SelectTrigger>
                  <SelectContent>
                    {PICKUP_LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">{t("Destination")} *</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select destination")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DESTINATIONS.map((dest) => (
                      <SelectItem key={dest} value={dest}>
                        {dest}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passengers">{t("Number of Passengers")}</Label>
                <Select value={passengers} onValueChange={setPassengers}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n === 1 ? "passenger" : "passengers"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("Phone Number")} ({t("optional")})</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialNeeds">
                {t("Special Needs / Notes")} ({t("optional")})
              </Label>
              <Textarea
                id="specialNeeds"
                value={specialNeeds}
                onChange={(e) => setSpecialNeeds(e.target.value)}
                placeholder={t("Wheelchair accessible, golf clubs, walker, etc.")}
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting || !pickupLocation || !destination}>
                {submitting ? t("Requesting...") : t("Request Tram")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                {t("Cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            {t("Active Requests")}
          </h2>
          <div className="grid gap-4">
            {activeRequests.map((request) => {
              const config = statusConfig[request.status] || statusConfig.requested;
              return (
                <Card key={request.id} className="p-4 border-l-4 border-l-brand">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant} className="flex items-center gap-1">
                          {config.icon}
                          {config.label}
                        </Badge>
                        {request.vehicleId && (
                          <Badge variant="outline">{request.vehicleId}</Badge>
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
                          {request.passengers} {request.passengers === 1 ? "passenger" : "passengers"}
                        </span>
                        {request.driverName && (
                          <span>Driver: {request.driverName}</span>
                        )}
                        {request.estimatedPickup && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            ETA: {new Date(request.estimatedPickup).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>

                      {request.specialNeeds && (
                        <p className="text-sm text-grey italic">
                          Note: {request.specialNeeds}
                        </p>
                      )}
                    </div>

                    {request.status === "requested" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCancel(request.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        {t("Cancel")}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No Active Requests */}
      {activeRequests.length === 0 && !showForm && (
        <Card className="p-8 text-center">
          <Bus className="w-12 h-12 text-grey mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t("No Active Requests")}</h3>
          <p className="text-grey mb-4">
            {t("Need a ride? Request a tram pickup and we'll come get you!")}
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("Request Pickup")}
          </Button>
        </Card>
      )}

      {/* Past Requests */}
      {pastRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-grey">
            {t("Past Requests")}
          </h2>
          <div className="grid gap-3">
            {pastRequests.slice(0, 5).map((request) => {
              const config = statusConfig[request.status] || statusConfig.completed;
              return (
                <Card key={request.id} className="p-4 opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <span className="text-sm">
                        {request.pickupLocation} → {request.destination}
                      </span>
                    </div>
                    <span className="text-sm text-grey">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
