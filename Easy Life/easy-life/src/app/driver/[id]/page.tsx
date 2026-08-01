"use client";

import { useState, useEffect, use } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bus,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  Navigation,
  Phone,
  RefreshCw,
  Lock,
} from "lucide-react";

interface TramRequest {
  id: string;
  memberName: string;
  phone?: string;
  pickupLocation: string;
  destination: string;
  passengers: number;
  specialNeeds?: string;
  status: string;
  estimatedPickup?: string;
  vehicleId?: string;
  requestedAt: string;
}

interface Driver {
  id: string;
  name: string;
  status: string;
  vehicleId?: string;
}

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  dispatched: { label: "Assigned", variant: "info" },
  en_route: { label: "En Route", variant: "warning" },
  arrived: { label: "Arrived", variant: "success" },
  completed: { label: "Completed", variant: "default" },
};

export default function DriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignments, setAssignments] = useState<TramRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    // Check if already authenticated (session storage)
    const storedAuth = sessionStorage.getItem(`driver_auth_${id}`);
    if (storedAuth === "true") {
      setAuthenticated(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authenticated) return;
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [authenticated]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/driver/${id}/assignments`);
      if (res.ok) {
        const data = await res.json();
        setDriver(data.driver);
        setAssignments(data.assignments);
      }
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");

    try {
      const res = await fetch(`/api/driver/${id}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        sessionStorage.setItem(`driver_auth_${id}`, "true");
        setAuthenticated(true);
        fetchData();
      } else {
        setPinError("Invalid PIN");
      }
    } catch {
      setPinError("Connection error");
    }
  }

  async function updateStatus(requestId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/driver/${id}/assignments/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update:", error);
    }
  }

  // PIN entry screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bus className="w-8 h-8 text-brand" />
            </div>
            <h1 className="text-xl font-semibold">Driver Portal</h1>
            <p className="text-grey text-sm mt-1">Enter your PIN to continue</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-grey" />
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="pl-10 text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>
            {pinError && (
              <p className="text-red-500 text-sm text-center">{pinError}</p>
            )}
            <Button type="submit" className="w-full" disabled={pin.length < 4}>
              Enter
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  const activeAssignments = assignments.filter(
    (a) => !["completed", "cancelled"].includes(a.status)
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-brand text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bus className="w-6 h-6" />
            <div>
              <div className="font-semibold">{driver?.name || "Driver"}</div>
              <div className="text-sm opacity-80">
                {driver?.vehicleId || "No vehicle assigned"}
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeAssignments.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Active Pickups</h2>
            <p className="text-grey">
              You&apos;ll receive an SMS when a new pickup is assigned.
            </p>
          </Card>
        ) : (
          activeAssignments.map((request) => {
            const config = statusConfig[request.status] || statusConfig.dispatched;

            return (
              <Card key={request.id} className="p-4 space-y-4">
                {/* Status & Passenger */}
                <div className="flex items-center justify-between">
                  <Badge variant={config.variant} className="text-sm px-3 py-1">
                    {config.label}
                  </Badge>
                  <div className="flex items-center gap-1 text-grey">
                    <Users className="w-4 h-4" />
                    <span>{request.passengers}</span>
                  </div>
                </div>

                {/* Route */}
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-grey">Pickup</div>
                      <div className="font-medium">{request.pickupLocation}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-brand" />
                    </div>
                    <div>
                      <div className="text-sm text-grey">Drop-off</div>
                      <div className="font-medium">{request.destination}</div>
                    </div>
                  </div>
                </div>

                {/* Passenger Info */}
                <div className="flex items-center justify-between py-2 border-t border-b">
                  <div>
                    <div className="text-sm text-grey">Passenger</div>
                    <div className="font-medium">{request.memberName}</div>
                  </div>
                  {request.phone && (
                    <a
                      href={`tel:${request.phone}`}
                      className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                  )}
                </div>

                {/* Special Needs */}
                {request.specialNeeds && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                    <span className="font-medium">⚠️ Note:</span> {request.specialNeeds}
                  </div>
                )}

                {/* ETA */}
                {request.estimatedPickup && (
                  <div className="flex items-center gap-2 text-sm text-grey">
                    <Clock className="w-4 h-4" />
                    ETA: {new Date(request.estimatedPickup).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {request.status === "dispatched" && (
                    <Button
                      className="col-span-2"
                      onClick={() => updateStatus(request.id, "en_route")}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Start Trip
                    </Button>
                  )}

                  {request.status === "en_route" && (
                    <Button
                      className="col-span-2"
                      onClick={() => updateStatus(request.id, "arrived")}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Arrived at Pickup
                    </Button>
                  )}

                  {request.status === "arrived" && (
                    <Button
                      className="col-span-2 bg-green-600 hover:bg-green-700"
                      onClick={() => updateStatus(request.id, "completed")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Trip
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}

        {/* Completed Today */}
        {assignments.filter((a) => a.status === "completed").length > 0 && (
          <div className="pt-4">
            <h3 className="text-sm font-medium text-grey mb-2">
              Completed Today ({assignments.filter((a) => a.status === "completed").length})
            </h3>
            <div className="space-y-2">
              {assignments
                .filter((a) => a.status === "completed")
                .slice(0, 5)
                .map((request) => (
                  <Card key={request.id} className="p-3 opacity-60">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {request.pickupLocation} → {request.destination}
                      </span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
