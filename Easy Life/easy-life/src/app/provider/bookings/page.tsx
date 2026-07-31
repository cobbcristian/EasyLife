"use client";

import { useEffect, useState } from "react";
import {
  ProviderMvpBookingList,
  type ProviderBookingRow,
} from "@/components/provider/provider-mvp-booking-list";
import { useI18n } from "@/lib/i18n";

export default function ProviderBookingsPage() {
  const { t } = useI18n();
  const [avatarName, setAvatarName] = useState("");
  const [bookings, setBookings] = useState<ProviderBookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/session").then((r) => r.json()),
      fetch("/api/provider/bookings").then((r) => r.json()),
    ])
      .then(([session, data]) => {
        setAvatarName(session.name ?? "");
        setBookings(data.bookings ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-[family-name:var(--font-poppins)]">
        <p className="text-sm text-grey">{t("Loading…")}</p>
      </div>
    );
  }

  return <ProviderMvpBookingList bookings={bookings} avatarName={avatarName} />;
}
