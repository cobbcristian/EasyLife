"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { ChangePhotoButton } from "@/components/account/change-photo-button";
import { MemberMvpBottomNav } from "@/components/member/member-mvp-bottom-nav";
import {
  usePushNotifications,
  type PushSubscribeResult,
} from "@/components/pwa/pwa-register";
import { PaymentMethodsSettings } from "@/components/payments/payment-methods-settings";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { avatarForReviewer } from "@/lib/brand-assets";
import { communityIsResidentialHoa } from "@/lib/community-features";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { formatDate, cn } from "@/lib/utils";
import type { PetDTO, VehicleDTO } from "@/lib/member-dtos";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  unit: string;
  joined: string;
  directoryVisible: boolean;
  commsPush?: boolean;
  avatarUrl?: string | null;
  residencyStatus?: string;
  paysHoa?: boolean;
  membershipTier?: string;
}

const fieldClass =
  "h-12 w-full rounded-2xl border border-[#e4e8ee] bg-[#fafbfc] px-4 text-sm text-ink outline-none focus:border-[var(--mvp-blue)]";

/** Member Account — Figma-aligned mobile profile. */
export function MemberMvpProfile({
  vehicles,
  pets,
}: {
  vehicles: VehicleDTO[];
  pets: PetDTO[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const session = useSessionProfile();
  const hideHoaResidentLabels = communityIsResidentialHoa(session.communityId);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    unit: "",
    directoryVisible: true,
    commsPush: false,
  });
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [vehicle, setVehicle] = useState({
    make: "",
    model: "",
    color: "",
    plate: "",
    year: "",
    ownerName: "",
  });
  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [vehicleBusy, setVehicleBusy] = useState(false);
  const [pet, setPet] = useState({ name: "", type: "", breed: "" });
  const [pushHint, setPushHint] = useState("");
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    let on = true;
    fetch("/api/member/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!on || d.error) return;
        setProfile(d);
        setAvatarUrl(d.avatarUrl ?? avatarForReviewer(d.name ?? "Member"));
        setForm({
          name: d.name ?? "",
          email: d.email ?? "",
          phone: d.phone ?? "",
          unit: d.unit ?? "",
          directoryVisible: d.directoryVisible ?? true,
          commsPush: d.commsPush ?? false,
        });
      })
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  const onPushResult = useCallback(
    (result: PushSubscribeResult) => {
      if (result.ok) {
        setPushHint("");
        return;
      }
      const messages: Record<"unsupported" | "not_configured" | "denied" | "failed", string> = {
        unsupported: "Push is not supported in this browser.",
        not_configured: "Push is not set up on the server yet (VAPID keys missing).",
        denied: "Browser blocked notifications. Enable them in site settings.",
        failed: "Could not enable push notifications. Try again.",
      };
      setPushHint(messages[result.reason]);
      if (result.reason === "denied" || result.reason === "not_configured") {
        setForm((prev) => ({ ...prev, commsPush: false }));
      }
    },
    [],
  );

  usePushNotifications(form.commsPush, onPushResult);

  async function saveProfile() {
    setSaving(true);
    const res = await fetch("/api/member/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        unit: form.unit,
        directoryVisible: form.directoryVisible,
        commsPush: form.commsPush,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not save profile") });
      return;
    }
    const data = await res.json();
    setProfile(data);
    toast({ variant: "success", title: t("Profile saved") });
    router.refresh();
  }

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!registrationFile || !insuranceFile) {
      toast({
        variant: "warning",
        title: t("Documents required"),
        description: t("Upload registration and insurance. Government ID is recommended."),
      });
      return;
    }
    setVehicleBusy(true);
    const form = new FormData();
    form.set("make", vehicle.make);
    form.set("model", vehicle.model);
    form.set("color", vehicle.color);
    form.set("plate", vehicle.plate);
    form.set("year", vehicle.year);
    form.set("ownerName", vehicle.ownerName || profile?.name || "");
    form.set("registration", registrationFile);
    form.set("insurance", insuranceFile);
    if (govIdFile) form.set("govId", govIdFile);

    const res = await fetch("/api/vehicles", { method: "POST", body: form });
    const d = await res.json().catch(() => ({}));
    setVehicleBusy(false);
    if (!res.ok) {
      toast({
        variant: "warning",
        title: t("Could not add vehicle"),
        description: d.error ?? "",
      });
      return;
    }
    setVehicle({ make: "", model: "", color: "", plate: "", year: "", ownerName: "" });
    setRegistrationFile(null);
    setInsuranceFile(null);
    setGovIdFile(null);

    const status = d.verification?.status as string | undefined;
    toast({
      variant: status === "verified" ? "success" : "warning",
      title:
        status === "verified"
          ? t("Vehicle verified")
          : status === "needs_review"
            ? t("Submitted for review")
            : t("Verification could not confirm"),
      description: (d.verification?.notes as string[] | undefined)?.join(" ") ?? "",
    });
    router.refresh();
  }

  async function removeVehicle(id: string) {
    await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function addPet(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pet),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast({
        variant: "warning",
        title: t("Could not add pet"),
        description: d.error ?? "",
      });
      return;
    }
    setPet({ name: "", type: "", breed: "" });
    toast({ variant: "success", title: t("Pet added") });
    router.refresh();
  }

  async function removePet(id: string) {
    await fetch(`/api/pets/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-[family-name:var(--font-poppins)]">
        <p className="text-sm text-grey">{t("Loading…")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-poppins)] text-ink md:bg-[linear-gradient(180deg,#f7f8fa_0%,#ffffff_28%)]">
      <div className="mx-auto w-full max-w-lg pb-28 md:max-w-2xl md:px-6 md:pb-10 md:pt-8">
        <header className="sticky top-0 z-20 border-b border-[#eceff3] bg-white px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:static md:rounded-2xl md:border md:border-[#e8ebf0] md:px-5 md:py-5 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink md:text-[26px]">
            {t("Account")}
          </h1>
          {!hideHoaResidentLabels && profile.residencyStatus ? (
            <p className="mt-1 text-xs text-grey">
              {profile.residencyStatus === "resident"
                ? t("On-property resident (HOA)")
                : t("Club member only (no HOA)")}
              {profile.paysHoa ? ` · ${t("Pays HOA dues")}` : ` · ${t("No HOA dues")}`}
              {profile.membershipTier
                ? ` · ${t("Tier")}: ${profile.membershipTier.replace(/_/g, " ")}`
                : ""}
            </p>
          ) : profile.membershipTier ? (
            <p className="mt-1 text-xs text-grey">
              {t("Tier")}: {profile.membershipTier.replace(/_/g, " ")}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col items-center">
            <Avatar name={form.name} src={avatarUrl} size="lg" />
            <ChangePhotoButton
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--mvp-blue)]"
              onPhotoChange={(url) => setAvatarUrl(url)}
            >
              <Camera className="h-3.5 w-3.5" />
              {t("Upload photo")}
            </ChangePhotoButton>
            <p className="mt-2 text-lg font-semibold text-ink">{form.name}</p>
            <p className="text-[12px] text-grey">
              {form.unit}
              {formatDate(profile.joined)
                ? ` · ${t("Member since")} ${formatDate(profile.joined)}`
                : ""}
            </p>
          </div>
        </header>

        <div className="space-y-6 px-4 py-5 md:mt-5 md:rounded-2xl md:border md:border-[#e8ebf0] md:bg-white md:px-5 md:py-6 md:shadow-[0_10px_28px_rgba(16,24,40,0.05)]">
          <section className="space-y-3">
            <h2 className="text-[15px] font-semibold text-ink">{t("General Information")}</h2>
            <input
              className={fieldClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("Full name")}
            />
            <input
              className={fieldClass}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder={t("Unit")}
            />
            <input className={fieldClass} value={form.email} readOnly />
            <input
              className={fieldClass}
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t("Phone")}
            />
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3">
              <span className="text-sm text-ink">{t("Show in directory")}</span>
              <input
                type="checkbox"
                checked={form.directoryVisible}
                onChange={(e) =>
                  setForm({ ...form, directoryVisible: e.target.checked })
                }
                className="h-4 w-4 accent-[var(--mvp-blue)]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3">
              <span className="text-sm text-ink">{t("Push notifications")}</span>
              <input
                type="checkbox"
                checked={form.commsPush}
                onChange={(e) => {
                  setPushHint("");
                  setForm({ ...form, commsPush: e.target.checked });
                }}
                className="h-4 w-4 accent-[var(--mvp-blue)]"
              />
            </label>
            {pushHint ? (
              <p className="-mt-2 px-1 text-xs text-amber-700">{t(pushHint)}</p>
            ) : null}
            <div className="flex items-center justify-between rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3">
              <span className="text-sm text-ink">{t("Language")}</span>
              <LanguageSwitcher />
            </div>
            <Link
              href="/member/password"
              className="flex h-12 items-center justify-between rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 text-sm text-ink"
            >
              {t("Change Password")}
              <ChevronRight className="h-4 w-4 text-grey" />
            </Link>
            <Link
              href="/member/security"
              className="flex h-12 items-center justify-between rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 text-sm text-ink"
            >
              {t("Two-factor authentication")}
              <ChevronRight className="h-4 w-4 text-grey" />
            </Link>
            <Link
              href="/member/membership"
              className="flex h-12 items-center justify-between rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 text-sm text-ink"
            >
              {t("Membership")}
              <ChevronRight className="h-4 w-4 text-grey" />
            </Link>
            <Link
              href="/member/payments"
              className="flex h-12 items-center justify-between rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 text-sm text-ink"
            >
              {t("Payments")}
              <ChevronRight className="h-4 w-4 text-grey" />
            </Link>
          </section>

          <section>
            <button
              type="button"
              onClick={() => setGateOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] px-4 py-3 text-left"
              aria-expanded={gateOpen}
            >
              <div>
                <p className="text-[15px] font-semibold text-ink">{t("Gate & parking")}</p>
                <p className="mt-0.5 text-[12px] text-grey">
                  {t("Vehicles and pets for gate access")}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-grey transition",
                  gateOpen && "rotate-180",
                )}
              />
            </button>
            {gateOpen ? (
              <div className="mt-4 space-y-6">
          <section>
            <h2 className="text-[15px] font-semibold text-ink">{t("Vehicles")}</h2>
            <p className="mt-1 text-xs text-grey">
              {t(
                "Upload registration, insurance, and government ID. We verify year, make, model, plate, and that the owner is you (a club member).",
              )}
            </p>
            <ul className="mt-3 divide-y divide-[#eceff3]">
              {vehicles.map((v) => {
                const status = v.verificationStatus ?? "pending";
                const statusColor =
                  status === "verified"
                    ? "text-[var(--mvp-status-going)]"
                    : status === "needs_review"
                      ? "text-amber-600"
                      : status === "rejected"
                        ? "text-[#c45c5c]"
                        : "text-grey";
                return (
                  <li key={v.id} className="flex items-start justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {v.year ? `${v.year} ` : ""}
                        {v.make} {v.model}
                      </p>
                      <p className="text-[12px] text-grey">
                        {v.color} · {v.plate}
                        {v.ownerName ? ` · ${v.ownerName}` : ""}
                      </p>
                      <p className={`mt-1 text-[11px] font-semibold uppercase ${statusColor}`}>
                        {t(status.replace(/_/g, " "))}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--mvp-blue)]">
                        {v.registrationUrl ? (
                          <a href={v.registrationUrl} target="_blank" rel="noreferrer">
                            {t("Registration")}
                          </a>
                        ) : null}
                        {v.insuranceUrl ? (
                          <a href={v.insuranceUrl} target="_blank" rel="noreferrer">
                            {t("Insurance")}
                          </a>
                        ) : null}
                        {v.govIdUrl ? (
                          <a href={v.govIdUrl} target="_blank" rel="noreferrer">
                            {t("ID")}
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVehicle(v.id)}
                      className="rounded-lg p-2 text-grey hover:bg-red-50 hover:text-[#c45c5c]"
                      aria-label={t("Remove vehicle")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <form onSubmit={addVehicle} className="mt-3 grid grid-cols-2 gap-2">
              <input
                className={fieldClass}
                placeholder={t("Year")}
                inputMode="numeric"
                value={vehicle.year}
                onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })}
              />
              <input
                className={fieldClass}
                placeholder={t("Owner (must be you)")}
                value={vehicle.ownerName}
                onChange={(e) => setVehicle({ ...vehicle, ownerName: e.target.value })}
              />
              <input
                className={fieldClass}
                placeholder={t("Make")}
                value={vehicle.make}
                onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
                required
              />
              <input
                className={fieldClass}
                placeholder={t("Model")}
                value={vehicle.model}
                onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                required
              />
              <input
                className={fieldClass}
                placeholder={t("Color")}
                value={vehicle.color}
                onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
              />
              <input
                className={fieldClass}
                placeholder={t("Plate")}
                value={vehicle.plate}
                onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
                required
              />
              <label className="col-span-2 block text-[12px] text-grey">
                {t("Vehicle registration")} *
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => setRegistrationFile(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
              <label className="col-span-2 block text-[12px] text-grey">
                {t("Insurance card / policy")} *
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => setInsuranceFile(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
              <label className="col-span-2 block text-[12px] text-grey">
                {t("Driver’s license or passport")}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => setGovIdFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="submit"
                disabled={vehicleBusy}
                className="col-span-2 flex h-11 items-center justify-center gap-1 rounded-2xl bg-[#f2f4f7] text-sm font-semibold text-ink disabled:opacity-50"
              >
                {vehicleBusy ? t("Verifying…") : t("Submit for verification")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-ink">{t("Pets")}</h2>
            <ul className="mt-3 divide-y divide-[#eceff3]">
              {pets.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{p.name}</p>
                    <p className="text-[12px] text-grey">
                      {p.type} · {p.breed}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePet(p.id)}
                    className="rounded-lg p-2 text-grey hover:bg-red-50 hover:text-[#c45c5c]"
                    aria-label={t("Remove pet")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={addPet} className="mt-3 grid grid-cols-3 gap-2">
              <input
                className={fieldClass}
                placeholder={t("Name")}
                value={pet.name}
                onChange={(e) => setPet({ ...pet, name: e.target.value })}
              />
              <input
                className={fieldClass}
                placeholder={t("Type")}
                value={pet.type}
                onChange={(e) => setPet({ ...pet, type: e.target.value })}
              />
              <input
                className={fieldClass}
                placeholder={t("Breed")}
                value={pet.breed}
                onChange={(e) => setPet({ ...pet, breed: e.target.value })}
              />
              <button
                type="submit"
                className="col-span-3 flex h-11 items-center justify-center rounded-2xl bg-[#f2f4f7] text-sm font-semibold text-ink"
              >
                {t("Add pet")}
              </button>
            </form>
          </section>
              </div>
            ) : null}
          </section>

          <PaymentMethodsSettings returnPath="/member/profile" compact />

          <div className="flex flex-col gap-3 pb-8">
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="h-12 rounded-2xl bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? t("Saving...") : t("Save changes")}
            </button>
          </div>
        </div>
      </div>
      <MemberMvpBottomNav />
    </div>
  );
}
