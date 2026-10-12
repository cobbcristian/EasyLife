"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, ChevronLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ProviderContentHeader } from "@/components/layout/provider-content-header";
import { PageBody } from "@/components/layout/content-header";
import { IssueRefundDialog } from "@/components/provider/issue-refund-dialog";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import type { ServiceBookingStatus } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface BookingDetail {
  id: string;
  resident: string;
  community: string;
  service: string;
  date: string;
  time: string;
  endTime?: string;
  status: ServiceBookingStatus;
  amount: number;
  address?: string;
  description?: string;
}

type InviteStatus = "Going" | "Not Going" | "Pending";

function statusPillClass(status: ServiceBookingStatus): string {
  switch (status) {
    case "pending":
    case "upcoming":
      return "bg-[#f99f25] text-white";
    case "accepted":
    case "completed":
      return "bg-[#34c759] text-white";
    case "cancelled":
      return "bg-[#c7c7cc] text-white";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusLabel(status: ServiceBookingStatus): string {
  switch (status) {
    case "pending":
    case "upcoming":
      return "Pending";
    case "accepted":
      return "Confirmed";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function invitePillClass(status: InviteStatus): string {
  switch (status) {
    case "Going":
      return "bg-[var(--mvp-blue)] text-white";
    case "Not Going":
      return "bg-[#c7c7cc] text-white";
    case "Pending":
      return "bg-[#f99f25] text-white";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function isActivityBooking(service: string) {
  return /court|tennis|pickle|activity|yoga|swim/i.test(service);
}

/** Figma Booking Details 4616:17925 + Individual Booking Details 5687:5886. */
export default function ProviderBookingDetailPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [avatarName, setAvatarName] = useState("");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [pendingRefundId, setPendingRefundId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/session").then((r) => r.json()),
      fetch("/api/provider/bookings").then((r) => r.json()),
    ])
      .then(([session, data]) => {
        setAvatarName(session.name ?? "");
        const found = (data.bookings ?? []).find((b: BookingDetail) => b.id === id);
        setBooking(found ?? null);
      })
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function setStatus(status: ServiceBookingStatus) {
    const res = await fetch("/api/provider/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not update booking") });
      return;
    }
    const data = await res.json();
    setBooking((prev) => (prev && data.booking ? { ...prev, ...data.booking } : prev));
    setMenuOpen(false);
    toast({ variant: "success", title: t("Booking updated") });
  }

  async function handleDelete() {
    await setStatus("cancelled");
    toast({ variant: "info", title: t("Booking deleted") });
    router.push("/provider/bookings");
  }

  async function openRefundAction() {
    if (!booking) return;
    setRefundLoading(true);
    try {
      const listRes = await fetch("/api/refunds");
      const listData = await listRes.json();
      const existing = (listData.refunds ?? []).find(
        (r: { bookingId: string; status: string }) =>
          r.bookingId === booking.id && r.status === "pending",
      );
      if (existing) {
        setPendingRefundId(existing.id);
        setRefundOpen(true);
        setRefundLoading(false);
        return;
      }

      const createRes = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          bookingType: isActivityBooking(booking.service) ? "activity" : "service",
          title: booking.service,
          amountCents: Math.round((booking.amount || 30) * 100),
          reason: "Provider reviewing refund",
          memberEmail: booking.resident.includes("@")
            ? booking.resident
            : undefined,
          memberName: booking.resident,
          dateLabel: formatDate(booking.date),
          timeLabel: booking.time,
          locationLine1: booking.address ?? "",
          rateLabel: formatCurrency(booking.amount || 30),
        }),
      });
      if (createRes.ok) {
        const created = await createRes.json();
        setPendingRefundId(created.refund?.id ?? null);
      } else {
        setPendingRefundId(null);
      }
      setRefundOpen(true);
    } catch {
      toast({ variant: "warning", title: t("Could not open refund") });
    }
    setRefundLoading(false);
  }

  async function resolveRefund(issueViaStripe: boolean) {
    setRefundLoading(true);
    try {
      if (pendingRefundId) {
        const res = await fetch("/api/refunds", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: pendingRefundId,
            status: issueViaStripe ? "approved" : "denied",
            issueViaStripe,
          }),
        });
        if (!res.ok) {
          toast({ variant: "warning", title: t("Could not update refund") });
          setRefundLoading(false);
          return;
        }
      }
      setRefundOpen(false);
      toast({
        variant: "success",
        title: issueViaStripe
          ? t("Refund issued")
          : t("Refund declined"),
        description: issueViaStripe
          ? t("Please allow 48-72hrs for this to process.")
          : undefined,
      });
    } catch {
      toast({ variant: "warning", title: t("Something went wrong") });
    }
    setRefundLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-[family-name:var(--font-poppins)]">
        <p className="text-sm text-grey">{t("Loading…")}</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="font-[family-name:var(--font-poppins)]">
        <ProviderContentHeader title={t("Booking Details")} avatarName={avatarName} />
        <PageBody>
          <p className="text-sm text-grey">{t("Booking not found.")}</p>
          <Link href="/provider/bookings" className="mt-4 inline-block text-sm text-[var(--mvp-blue)]">
            {t("Back to bookings")}
          </Link>
        </PageBody>
      </div>
    );
  }

  const activity = isActivityBooking(booking.service);
  const pill = statusPillClass(booking.status);
  const label = statusLabel(booking.status);

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ProviderContentHeader title={t("Booking Details")} avatarName={avatarName} />
      <PageBody>
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/provider/bookings")}
            className="text-[var(--mvp-blue)]"
            aria-label={t("Back")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold text-black">{t("Booking Details")}</h1>
        </div>

        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#262626]">
              <span>{formatDate(booking.date)}</span>
              <span className="text-grey">•</span>
              <span>
                {booking.time}
                {booking.endTime ? `–${booking.endTime}` : ""}
              </span>
              <span className="text-grey">•</span>
              {activity ? (
                <span>{booking.service}</span>
              ) : booking.address ? (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(booking.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--mvp-blue)] hover:underline"
                >
                  {booking.address}
                </a>
              ) : (
                <span className="text-grey">{booking.community || t("On-site")}</span>
              )}
            </div>
            <h2 className="mt-3 text-[25px] font-medium text-black">{booking.resident}</h2>
          </div>
          <div className="relative flex items-center gap-2" ref={menuRef}>
            <span
              className={cn(
                "inline-flex min-w-[101px] items-center justify-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
                pill,
              )}
            >
              {label === "Confirmed" ? <Check className="h-3.5 w-3.5" /> : null}
              {t(label)}
            </span>
            <button
              type="button"
              className="rounded p-1 text-grey hover:bg-slate-100"
              aria-label={t("Actions")}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-9 z-20 w-[160px] overflow-hidden rounded-xl border border-border-2 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(`/provider/bookings?menu=${encodeURIComponent(id)}`);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-[#f8f9fb]"
                >
                  <Pencil className="h-4 w-4" />
                  {t("Edit")}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#ff3b30] hover:bg-[#fdecea]"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("Delete")}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <hr className="mb-6 border-border-2" />

        {activity ? (
          <>
            <h3 className="mb-3 text-base font-semibold text-black">{t("Date Booked")}</h3>
            <div className="mb-8 overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-4 border-b border-border-2 pb-2 text-sm font-medium text-black">
                <span>{t("Date")}</span>
                <span>{t("Time")}</span>
                <span className="text-right">{t("Status")}</span>
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 py-3.5 text-sm">
                <span className="text-[#262626]">{formatDate(booking.date)}</span>
                <span className="text-[#262626]">{booking.time}</span>
                <span
                  className={cn(
                    "inline-flex min-w-[101px] items-center justify-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
                    pill,
                  )}
                >
                  {label === "Confirmed" ? <Check className="h-3.5 w-3.5" /> : null}
                  {t(label)}
                </span>
              </div>
            </div>

            <h3 className="mb-3 text-base font-semibold text-black">{t("Invited Members")}</h3>
            <div>
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border-2 pb-2 text-sm font-semibold text-black">
                <span>{t("Name")}</span>
                <span className="text-right">{t("Status")}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-2 py-3">
                <span className="text-sm text-black">{booking.resident}</span>
                <span
                  className={cn(
                    "inline-flex min-w-[80px] items-center justify-center rounded-md px-3 py-1 text-sm font-medium",
                    invitePillClass("Going"),
                  )}
                >
                  {t("Going")}
                </span>
              </div>
              <p className="mt-2 text-xs text-grey">
                {t("Guest roster updates when members RSVP.")}
              </p>
            </div>
          </>
        ) : (
          <>
            <h3 className="mb-3 text-base font-semibold text-black">{t("Booking Details")}</h3>
            <div className="mb-8 min-h-[120px] rounded-lg border border-border-2 bg-white px-7 py-5 text-sm text-[#262626]">
              {booking.description || booking.service}
            </div>

            <h3 className="mb-3 text-base font-semibold text-black">
              {t("Client Schedule Confirmation")}
            </h3>
            <div>
              <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border-2 pb-2 text-sm font-semibold text-black">
                <span>{t("Name")}</span>
                <span>{t("Status")}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-4 py-3.5">
                <span className="font-medium text-black">{booking.resident}</span>
                <span
                  className={cn(
                    "inline-flex min-w-[101px] items-center justify-center rounded-md px-3 py-1 text-sm font-medium",
                    pill,
                  )}
                >
                  {t(label === "Confirmed" ? "Accepted" : label)}
                </span>
              </div>
            </div>

            {(booking.status === "pending" || booking.status === "upcoming") && (
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStatus("accepted")}
                  className="h-[50px] min-w-[160px] rounded-lg bg-[var(--mvp-blue)] px-6 text-base font-semibold text-white hover:brightness-95"
                >
                  {t("Accept")}
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("cancelled")}
                  className="h-[50px] min-w-[160px] rounded-lg border border-border-2 px-6 text-base font-medium text-[#ff3b30] hover:bg-[#fdecea]"
                >
                  {t("Cancel")}
                </button>
              </div>
            )}
          </>
        )}

        {(booking.status === "accepted" ||
          booking.status === "completed" ||
          activity) && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-black">{t("Payment")}</span>
              <span className="text-[#34c759]">{t("Transaction Confirmed")}</span>
            </div>
            <div className="mb-6 flex items-center justify-between text-[15px] text-[#262626]">
              <span>{t("Amount charged")}</span>
              <span className="font-medium text-black">
                {formatCurrency(booking.amount || 0)}
              </span>
            </div>
            <button
              type="button"
              disabled={refundLoading}
              onClick={openRefundAction}
              className="flex h-[50px] w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-base font-semibold text-white disabled:opacity-60"
            >
              {t("Issue refund")}
            </button>
          </div>
        )}
      </PageBody>

      <IssueRefundDialog
        open={refundOpen}
        loading={refundLoading}
        onClose={() => setRefundOpen(false)}
        onYes={() => resolveRefund(true)}
        onNo={() => resolveRefund(false)}
      />
    </div>
  );
}
