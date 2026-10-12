"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type AmenityOption = {
  id: string;
  name: string;
  kind: string;
  playable: boolean;
  unitCount: number;
};

type MemberOption = {
  id: string;
  name: string;
  email: string;
};

type CommunityOption = {
  id: string;
  name: string;
};

type BookingRow = {
  id: string;
  amenity: string;
  memberName: string;
  memberEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  unitNumber: number | null;
};

type FormState = {
  memberEmail: string;
  amenityId: string;
  date: string;
  startTime: string;
  endTime: string;
  unitNumber: string;
};

const emptyForm: FormState = {
  memberEmail: "",
  amenityId: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  unitNumber: "",
};

export function StaffBookForMember({
  showRecent = true,
  preferredCommunityId,
  className,
  onCreated,
}: {
  showRecent?: boolean;
  /** Prefill / lock club when opened from a community page. */
  preferredCommunityId?: string;
  className?: string;
  onCreated?: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [communityId, setCommunityId] = useState(preferredCommunityId ?? "");
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [amenities, setAmenities] = useState<AmenityOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextCommunityId?: string) => {
    setLoading(true);
    const target = nextCommunityId || preferredCommunityId;
    const qs = target ? `?communityId=${encodeURIComponent(target)}` : "";
    try {
      const res = await fetch(`/api/admin/bookings${qs}`);
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: t("Could not load booking tools"),
          description: data.error,
        });
        return;
      }
      setCommunityId(data.communityId ?? "");
      setCommunities(data.communities ?? []);
      setAmenities(
        (data.amenities ?? []).filter((a: AmenityOption) => a.playable !== false),
      );
      setMembers(data.members ?? []);
      setBookings(data.bookings ?? []);
      setForm((prev) => ({
        ...prev,
        amenityId:
          prev.amenityId &&
          (data.amenities ?? []).some((a: AmenityOption) => a.id === prev.amenityId)
            ? prev.amenityId
            : "",
        memberEmail:
          prev.memberEmail &&
          (data.members ?? []).some(
            (m: MemberOption) => m.email === prev.memberEmail,
          )
            ? prev.memberEmail
            : "",
      }));
    } catch {
      toast({ variant: "warning", title: t("Could not load booking tools") });
    } finally {
      setLoading(false);
    }
  }, [preferredCommunityId, t, toast]);

  useEffect(() => {
    void load(preferredCommunityId);
  }, [load, preferredCommunityId]);

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members.slice(0, 40);
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [members, memberQuery]);

  const selectedAmenity = amenities.find((a) => a.id === form.amenityId);
  const selectedMember = members.find((m) => m.email === form.memberEmail);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.memberEmail || !form.amenityId || !form.date) {
      toast({
        variant: "warning",
        title: t("Member, amenity, and date are required"),
      });
      return;
    }
    if (form.endTime <= form.startTime) {
      toast({ variant: "warning", title: t("End must be after start") });
      return;
    }

    setBusy(true);
    try {
      const unit =
        form.unitNumber.trim() === ""
          ? undefined
          : Number.parseInt(form.unitNumber, 10);
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: communityId || undefined,
          memberEmail: form.memberEmail,
          memberName: selectedMember?.name,
          amenityId: form.amenityId,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          unitNumber:
            unit != null && Number.isFinite(unit) ? unit : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: t("Could not create booking"),
          description: data.error,
        });
        return;
      }
      toast({
        variant: "success",
        title: t("Booking created"),
        description: `${selectedMember?.name ?? form.memberEmail} · ${selectedAmenity?.name ?? ""}`,
      });
      setForm((prev) => ({
        ...emptyForm,
        startTime: prev.startTime,
        endTime: prev.endTime,
        date: prev.date,
      }));
      setMemberQuery("");
      await load(communityId || undefined);
      onCreated?.();
    } catch {
      toast({ variant: "warning", title: t("Could not create booking") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border border-[#e8ebf0] bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-ink">
            {t("Book for a member")}
          </h2>
          <p className="mt-1 text-sm text-grey">
            {t("Create an amenity reservation under a resident's account.")}
          </p>
        </div>

        {communities.length > 0 ? (
          <div className="mb-4 max-w-md">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {t("Club")}
            </label>
            <select
              value={communityId}
              onChange={(e) => {
                const next = e.target.value;
                setCommunityId(next);
                void load(next);
              }}
              className="flex h-10 w-full rounded-lg border border-border-1 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-grey">{t("Loading…")}</p>
        ) : (
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                {t("Member")}
              </label>
              <input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder={t("Search name or email…")}
                className="flex h-10 w-full rounded-lg border border-border-1 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
              />
              <select
                value={form.memberEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, memberEmail: e.target.value }))
                }
                required
                className="flex h-10 w-full rounded-lg border border-border-1 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
              >
                <option value="">{t("Select member")}</option>
                {filteredMembers.map((m) => (
                  <option key={m.id} value={m.email}>
                    {m.name} · {m.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                {t("Amenity")}
              </label>
              <select
                value={form.amenityId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amenityId: e.target.value, unitNumber: "" }))
                }
                required
                className="flex h-10 w-full rounded-lg border border-border-1 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
              >
                <option value="">{t("Select amenity")}</option>
                {amenities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                {t("Date")}
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                required
                className="flex h-10 w-full rounded-lg border border-border-1 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  {t("Start")}
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startTime: e.target.value }))
                  }
                  required
                  className="flex h-10 w-full rounded-lg border border-border-1 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  {t("End")}
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endTime: e.target.value }))
                  }
                  required
                  className="flex h-10 w-full rounded-lg border border-border-1 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
                />
              </div>
            </div>

            {selectedAmenity && selectedAmenity.unitCount > 1 ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  {t("Unit # (optional)")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedAmenity.unitCount}
                  value={form.unitNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unitNumber: e.target.value }))
                  }
                  placeholder={`1–${selectedAmenity.unitCount}`}
                  className="flex h-10 w-full rounded-lg border border-border-1 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]"
                />
              </div>
            ) : null}

            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[var(--mvp-blue)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? t("Creating…") : t("Create booking")}
              </button>
            </div>
          </form>
        )}
      </div>

      {showRecent ? (
        <div className="overflow-hidden rounded-2xl border border-[#e8ebf0] bg-white">
          <div className="border-b border-[#eceff3] px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">
              {t("Recent amenity bookings")}
            </h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fafbfc] text-[12px] uppercase tracking-wide text-grey">
              <tr>
                <th className="px-4 py-3">{t("Amenity")}</th>
                <th className="px-4 py-3">{t("Member")}</th>
                <th className="px-4 py-3">{t("When")}</th>
                <th className="px-4 py-3">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-[#eceff3]">
                  <td className="px-4 py-3 font-medium">
                    {b.amenity}
                    {b.unitNumber != null ? ` #${b.unitNumber}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <div>{b.memberName}</div>
                    <div className="text-xs text-grey">{b.memberEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-grey">
                    {b.date} · {b.startTime}–{b.endTime}
                  </td>
                  <td className="px-4 py-3 capitalize">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookings.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-grey">
              {t("No amenity bookings yet.")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
