"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { COURT_SURFACES } from "@/lib/court-surfaces";
import { useI18n } from "@/lib/i18n";
import { translateCapacityLabel } from "@/lib/scheduling";
import { formatCurrency } from "@/lib/utils";

export interface AmenityDTO {
  id: string;
  name: string;
  description: string;
  fee: number;
  schedule: string;
  kind: string;
  unitCount: number;
  holes: number | null;
  surface: string | null;
  ownership: string;
  partnerName: string | null;
  playable: boolean;
  unplayableReason: string | null;
  unplayableUntil: string | null;
}

export function AmenitiesClient({
  initial,
}: {
  initial: AmenityDTO[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: "",
    description: "",
    fee: "",
    schedule: "",
    kind: "facility",
    unitCount: "1",
    holes: "",
    surface: "hard_court",
    ownership: "club",
    partnerName: "",
  });
  const [statusReason, setStatusReason] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.schedule) {
      toast({ variant: "warning", title: t("Name and schedule required") });
      return;
    }
    const res = await fetch("/api/amenities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        fee: Number(form.fee) || 0,
        schedule: form.schedule,
        kind: form.kind,
        unitCount: Number(form.unitCount) || 1,
        holes: form.kind === "golf_course" && form.holes ? Number(form.holes) : null,
        surface: form.kind === "court" ? form.surface : null,
        ownership: form.ownership,
        partnerName: form.ownership === "external" ? form.partnerName || null : null,
      }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not add amenity") });
      return;
    }
    setForm({
      name: "",
      description: "",
      fee: "",
      schedule: "",
      kind: "facility",
      unitCount: "1",
      holes: "",
      surface: "hard_court",
      ownership: "club",
      partnerName: "",
    });
    toast({ variant: "success", title: t("Amenity added") });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/amenities/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function setPlayable(a: AmenityDTO, playable: boolean) {
    setBusyId(a.id);
    const reason =
      statusReason[a.id]?.trim() ||
      (playable ? null : "Wet conditions — not safe to play");
    const res = await fetch(`/api/amenities/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playable,
        reason,
        broadcast: true,
      }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not update status") });
      return;
    }
    toast({
      variant: "success",
      title: playable
        ? t("Marked playable — members notified")
        : t("Marked not playable — broadcast sent"),
    });
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title="Amenity Setup" right="logo" />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border-2 bg-white p-5">
            <h2 className="mb-4 text-base font-medium text-black">{t("Add Amenity")}</h2>
            <form className="space-y-4" onSubmit={add}>
              <div className="space-y-2">
                <Label htmlFor="name">{t("Name")}</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">{t("Description")}</Label>
                <Input id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fee">{t("Usage fee ($)")}</Label>
                <Input id="fee" type="number" min={0} value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownership">{t("Ownership")}</Label>
                <Select
                  id="ownership"
                  value={form.ownership}
                  onChange={(e) => setForm({ ...form, ownership: e.target.value })}
                >
                  <option value="club">{t("Club-owned (courts, clubhouse)")}</option>
                  <option value="external">{t("External / partner (jet skis, boats)")}</option>
                </Select>
              </div>
              {form.ownership === "external" ? (
                <div className="space-y-2">
                  <Label htmlFor="partner">{t("Partner name")}</Label>
                  <Input
                    id="partner"
                    value={form.partnerName}
                    onChange={(e) => setForm({ ...form, partnerName: e.target.value })}
                    placeholder={t("e.g. Lake Weir Watersports")}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="kind">{t("Type")}</Label>
                <Select
                  id="kind"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                >
                  <option value="facility">{t("General facility")}</option>
                  <option value="court">{t("Courts (tennis, pickleball, etc.)")}</option>
                  <option value="golf_course">{t("Golf course")}</option>
                  <option value="lodging">{t("Tower lodging / overnight")}</option>
                  <option value="event_space">{t("Event space")}</option>
                  <option value="dining">{t("Dining")}</option>
                  <option value="spa">{t("Spa")}</option>
                  <option value="gym">{t("Fitness")}</option>
                  <option value="store">{t("Pro shop / store")}</option>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="units">
                    {form.kind === "court"
                      ? t("Number of courts")
                      : form.kind === "golf_course"
                        ? t("Number of courses")
                        : t("Units")}
                  </Label>
                  <Input
                    id="units"
                    type="number"
                    min={1}
                    value={form.unitCount}
                    onChange={(e) => setForm({ ...form, unitCount: e.target.value })}
                  />
                </div>
                {form.kind === "golf_course" ? (
                  <div className="space-y-2">
                    <Label htmlFor="holes">{t("Holes per course")}</Label>
                    <Input
                      id="holes"
                      type="number"
                      min={1}
                      placeholder="18"
                      value={form.holes}
                      onChange={(e) => setForm({ ...form, holes: e.target.value })}
                    />
                  </div>
                ) : form.kind === "court" ? (
                  <div className="space-y-2">
                    <Label htmlFor="surface">{t("Court surface")}</Label>
                    <Select
                      id="surface"
                      value={form.surface}
                      onChange={(e) => setForm({ ...form, surface: e.target.value })}
                    >
                      {COURT_SURFACES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {t(s.label)}
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sched">{t("Schedule")}</Label>
                <Input id="sched" placeholder="Daily 7AM – 9PM" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
              </div>
              <Button type="submit">{t("Add amenity")}</Button>
            </form>
          </div>

          <div className="rounded-xl border border-border-2 bg-white p-5 lg:col-span-2">
            <h2 className="mb-4 text-base font-medium text-black">
              {t("Amenities")} ({initial.length})
            </h2>
            <p className="mb-4 text-sm text-grey">
              {t(
                "Mark courts or golf unplayable when wet — members get an inbox alert and announcement.",
              )}
            </p>
            <div className="space-y-3">
              {initial.length === 0 ? (
                <div className="rounded-xl bg-[#f7f8fa] px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-ink">
                    {t("No amenities yet for this club.")}
                  </p>
                  <p className="mt-1 text-sm text-grey">
                    {t("Add courts, golf, or pool with the form so members can book.")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById("name")?.focus();
                    }}
                    className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                  >
                    {t("Add amenity")}
                  </button>
                </div>
              ) : (
                initial.map((a) => (
                  <div key={a.id} className="rounded-lg border border-border-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{t(a.name)}</p>
                        <p className="text-sm text-grey">{t(a.description)}</p>
                        <p className="mt-1 text-xs text-grey-light">
                          {a.ownership === "external" ? t("Partner") : t("Club")}
                          {a.partnerName ? ` · ${a.partnerName}` : ""}
                          {` · ${formatCurrency(a.fee)} · ${t(a.schedule)}`}
                          {translateCapacityLabel(t, a.kind, a.unitCount, a.holes, a.surface)
                            ? ` · ${translateCapacityLabel(t, a.kind, a.unitCount, a.holes, a.surface)}`
                            : ""}
                        </p>
                        <p
                          className={`mt-1 text-xs font-semibold ${
                            a.playable ? "text-emerald-600" : "text-[#c45c5c]"
                          }`}
                        >
                          {a.playable
                            ? t("Playable")
                            : `${t("Not playable")}${a.unplayableReason ? ` — ${a.unplayableReason}` : ""}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(a.id)}
                        className="rounded-md p-2 text-grey-light hover:bg-red-50 hover:text-danger"
                        aria-label={t("Remove amenity")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      {!a.playable ? null : (
                        <Input
                          value={statusReason[a.id] ?? ""}
                          onChange={(e) =>
                            setStatusReason((prev) => ({ ...prev, [a.id]: e.target.value }))
                          }
                          placeholder={t("Reason (e.g. wet courts after rain)")}
                          className="max-w-xs"
                        />
                      )}
                      {a.playable ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busyId === a.id}
                          onClick={() => void setPlayable(a, false)}
                        >
                          {t("Mark not playable")}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => void setPlayable(a, true)}
                        >
                          {t("Mark playable again")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
