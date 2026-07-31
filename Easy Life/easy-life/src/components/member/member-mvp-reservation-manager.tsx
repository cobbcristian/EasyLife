"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  MapPin,
  MessageCircle,
  UserPlus,
  X,
} from "lucide-react";
import {
  InviteMemberPicker,
  type InviteMember,
} from "@/components/ui/invite-member-picker";
import { imageForBookingRow, imageForEvent } from "@/lib/brand-assets";
import { useI18n } from "@/lib/i18n";
import { cn, getInitials } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export type ReservationGuestView = {
  email: string;
  name: string;
  status: "going" | "not_going" | "pending" | "full";
  isHost: boolean;
  isYou: boolean;
};

export type ReservationManagerData = {
  kind: "booking" | "event";
  id: string;
  title: string;
  date: string;
  timeLabel: string;
  locationLine1: string;
  locationLine2: string;
  description?: string;
  role: "host" | "invitee" | "member";
  canCancel: boolean;
  canLeave: boolean;
  canInviteMore: boolean;
  canRsvp?: boolean;
  canAcceptInvite?: boolean;
  inviteId?: string | null;
  userRsvped?: boolean;
  yourInviteStatus?: "going" | "not_going" | "pending" | "full" | null;
  hostName: string;
  guests: ReservationGuestView[];
  chatHref: string;
  inviteCapacity?: number | null;
  requirePayment?: boolean;
  feeCents?: number;
};

function statusLabel(
  status: ReservationGuestView["status"],
  t: (s: string) => string,
) {
  switch (status) {
    case "going":
      return t("Going");
    case "not_going":
      return t("Not Going");
    case "full":
      return t("Full");
    case "pending":
      return t("Pending");
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusClass(status: ReservationGuestView["status"]) {
  switch (status) {
    case "going":
      return "text-[#34c759]";
    case "not_going":
      return "text-[#ff3b30]";
    case "full":
      return "text-[#af52de]";
    case "pending":
      return "text-[#f99f25]";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Figma Reservation Manager (host 3276:47335 / invitee 3276:47794). */
export function MemberMvpReservationManager({
  reservation,
  added = false,
}: {
  reservation: ReservationManagerData;
  added?: boolean;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedInvitees, setSelectedInvitees] = useState<InviteMember[]>([]);

  const hero =
    reservation.kind === "booking"
      ? imageForBookingRow(reservation.title)
      : imageForEvent("social", reservation.title);

  const goingCount = useMemo(
    () => reservation.guests.filter((g) => g.status === "going").length,
    [reservation.guests],
  );

  async function cancelReservation() {
    if (!reservation.canCancel) return;
    setBusy(true);
    const path =
      reservation.kind === "booking"
        ? `/api/bookings/${reservation.id}/cancel`
        : `/api/events/${reservation.id}/cancel`;
    const res = await fetch(path, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({
        variant: "warning",
        title: t("Could not cancel"),
        description: data.error,
      });
      return;
    }
    toast({ variant: "success", title: t("Reservation cancelled") });
    router.push("/member/calendar");
    router.refresh();
  }

  async function leaveReservation() {
    if (!reservation.canLeave) {
      setBusy(false);
      return;
    }
    setBusy(true);
    if (reservation.kind === "booking") {
      const res = await fetch(`/api/bookings/${reservation.id}/leave`, {
        method: "POST",
      });
      setBusy(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          variant: "warning",
          title: t("Could not leave"),
          description: data.error,
        });
        return;
      }
    } else {
      const res = await fetch(`/api/events/${reservation.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decline: true }),
      });
      setBusy(false);
      if (!res.ok) {
        toast({ variant: "warning", title: t("Could not leave") });
        return;
      }
    }
    toast({ variant: "success", title: t("You left this reservation") });
    router.push("/member/calendar");
    router.refresh();
  }

  async function setGoing(going: boolean) {
    setBusy(true);
    if (reservation.kind === "event") {
      const res = await fetch(`/api/events/${reservation.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          going ? { acceptInvite: true } : { decline: true },
        ),
      });
      setBusy(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          variant: "warning",
          title: t("Could not update RSVP"),
          description: data.error,
        });
        return;
      }
      toast({
        variant: "success",
        title: going ? t("You're going!") : t("Marked not going"),
      });
      router.refresh();
      return;
    }

    if (going && reservation.inviteId) {
      const res = await fetch(`/api/booking-invites/${reservation.inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });
      setBusy(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          variant: "warning",
          title: t("Could not update RSVP"),
          description: data.error,
        });
        return;
      }
      toast({ variant: "success", title: t("You're going!") });
      router.refresh();
      return;
    }

    if (!going) {
      await leaveReservation();
      return;
    }
    setBusy(false);
  }

  async function sendMoreInvites() {
    if (selectedInvitees.length === 0) return;
    setBusy(true);
    const path =
      reservation.kind === "booking"
        ? `/api/bookings/${reservation.id}/invites`
        : `/api/events/${reservation.id}/invites`;
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invites: selectedInvitees.map((m) => ({
          email: m.email,
          name: m.name,
        })),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({
        variant: "warning",
        title: t("Could not send invites"),
        description: data.error,
      });
      return;
    }
    toast({
      variant: "success",
      title: t("Invites sent"),
      description: t("{{count}} member(s) invited").replace(
        "{{count}}",
        String(selectedInvitees.length),
      ),
    });
    setSelectedInvitees([]);
    setInviteOpen(false);
    router.refresh();
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-lg bg-white pb-28 font-[family-name:var(--font-poppins)]">
      {added ? (
        <div className="flex items-center gap-3 bg-[var(--mvp-blue)] px-4 py-3 text-[13px] font-medium leading-snug text-white">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/80 text-sm">
            <Check className="h-4 w-4" />
          </span>
          {t("This activity has been added to your calendar.")}
        </div>
      ) : null}

      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero} alt="" className="h-[220px] w-full object-cover" />
        <button
          type="button"
          onClick={() => router.push("/member/calendar")}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
          aria-label={t("Close")}
        >
          <X className="h-5 w-5 text-[var(--mvp-blue)]" strokeWidth={2.25} />
        </button>
      </div>

      <div className="px-4 pt-5">
        <p className="text-[13px] font-medium text-[#f99f25]">
          {reservation.kind === "booking" ? t("Reserved:") : t("Event:")}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight text-ink">
          {reservation.title}
        </h1>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-grey">
              {t("When")}
            </p>
            <p className="mt-1 text-[15px] text-ink">
              {reservation.date}
              {reservation.timeLabel ? ` · ${reservation.timeLabel}` : ""}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-grey">
              {t("Where")}
            </p>
            <p className="mt-1 flex items-start gap-2 text-[15px] text-ink">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mvp-blue)]" />
              <span>
                {reservation.locationLine1}
                {reservation.locationLine2 ? (
                  <>
                    <br />
                    {reservation.locationLine2}
                  </>
                ) : null}
              </span>
            </p>
          </div>
          {reservation.description?.trim() ? (
            <p className="text-[14px] leading-relaxed text-grey">
              {reservation.description.trim()}
            </p>
          ) : null}
          {reservation.inviteCapacity != null ? (
            <p className="text-[13px] text-grey">
              {t("Party spots")}: {goingCount}
              {" / "}
              {reservation.inviteCapacity + 1}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-ink">
            {t("Invited Members")} ({reservation.guests.length})
          </h2>
          <div className="flex items-center gap-2">
            {reservation.canInviteMore ? (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="inline-flex h-9 items-center gap-1 rounded-full bg-[#f2f4f7] px-3 text-[12px] font-semibold text-ink"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t("Invite")}
              </button>
            ) : null}
            <Link
              href={reservation.chatHref}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-[var(--mvp-blue)] px-3 text-[12px] font-semibold text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {t("Chat")}
            </Link>
          </div>
        </div>

        <ul className="mt-3 divide-y divide-[#ececec]">
          {reservation.guests.map((guest) => (
            <li
              key={`${guest.email || guest.name}-${guest.isHost ? "host" : "g"}`}
              className="flex items-center gap-3 py-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mvp-blue)]/10 text-[12px] font-semibold text-[var(--mvp-blue)]">
                {getInitials(guest.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">
                  {guest.isYou
                    ? guest.isHost
                      ? `${guest.name.split(" ")[0] ?? guest.name} (${t("Me")})`
                      : t("You")
                    : guest.name}
                  {guest.isHost && !guest.isYou ? (
                    <span className="ml-1 text-[12px] font-normal text-grey">
                      · {t("Organizer")}
                    </span>
                  ) : null}
                </p>
                <p
                  className={cn(
                    "text-[12px] font-semibold",
                    statusClass(guest.status),
                  )}
                >
                  {guest.isHost ? t("Organizer") : statusLabel(guest.status, t)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {reservation.role !== "host" &&
        (reservation.kind === "event" ||
          reservation.canAcceptInvite ||
          reservation.yourInviteStatus === "pending" ||
          reservation.yourInviteStatus === "going") ? (
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setGoing(true)}
              className={cn(
                "h-12 flex-1 rounded-xl text-[15px] font-semibold",
                reservation.userRsvped ||
                  reservation.yourInviteStatus === "going"
                  ? "bg-[#f2f4f7] text-ink"
                  : "bg-[var(--mvp-blue)] text-white",
              )}
            >
              {t("Going")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setGoing(false)}
              className="h-12 flex-1 rounded-xl bg-[#f2f4f7] text-[15px] font-semibold text-ink"
            >
              {t("Not Going")}
            </button>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {reservation.canCancel ? (
            <button
              type="button"
              disabled={busy}
              onClick={cancelReservation}
              className="h-12 w-full rounded-xl border border-[#ff3b30] text-[15px] font-semibold text-[#ff3b30]"
            >
              {t("Cancel Reservation")}
            </button>
          ) : null}
          {reservation.canLeave ? (
            <button
              type="button"
              disabled={busy}
              onClick={leaveReservation}
              className="h-12 w-full rounded-xl border border-[#ff3b30] text-[15px] font-semibold text-[#ff3b30]"
            >
              {t("Leave Reservation")}
            </button>
          ) : null}
        </div>
      </div>

      {inviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <button
            type="button"
            className="absolute inset-0"
            aria-label={t("Close")}
            onClick={() => setInviteOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-t-[24px] bg-white px-4 pb-6 pt-3 shadow-xl sm:rounded-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#d1d1d6]" />
            <h3 className="text-center text-base font-semibold text-ink">
              {t("Invite more people")}
            </h3>
            <div className="mt-4">
              <InviteMemberPicker
                selected={selectedInvitees}
                onChange={setSelectedInvitees}
                excludeEmail={
                  reservation.guests.find((g) => g.isHost)?.email || undefined
                }
              />
            </div>
            <button
              type="button"
              disabled={busy || selectedInvitees.length === 0}
              onClick={sendMoreInvites}
              className="mt-4 h-12 w-full rounded-xl bg-[var(--mvp-blue)] text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {t("Send invites")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
