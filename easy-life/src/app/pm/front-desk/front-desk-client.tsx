"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, UserPlus } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

interface CheckinEntry {
  id: string;
  name: string;
  type: "guest" | "vendor";
  host: string;
  unit: string;
  time: string;
  status: "expected" | "checked_in" | "checked_out";
  photo?: string;
  service?: string;
  fromBooking?: boolean;
  admitWithoutCall?: boolean;
}

const statusVariant = {
  expected: "warning",
  checked_in: "success",
  checked_out: "default",
} as const;

export function FrontDeskClient({ initial }: { initial: CheckinEntry[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [entries, setEntries] = useState(initial);
  const [name, setName] = useState("");
  const [type, setType] = useState<"guest" | "vendor">("guest");
  const [host, setHost] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, host, photoUrl: photo ?? undefined }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Check-in failed") });
      return;
    }
    const data = await res.json();
    setEntries((prev) => [
      {
        id: data.checkin.id,
        name,
        type,
        host,
        unit: "—",
        time: t("now"),
        status: "checked_in",
        photo: photo ?? undefined,
      },
      ...prev,
    ]);
    toast({
      variant: "success",
      title: t("Checked in"),
      description: `${name} ${t("checked in.")}`,
    });
    setName("");
    setHost("");
    setPhoto(null);
    router.refresh();
  }

  async function setStatus(id: string, status: CheckinEntry["status"]) {
    const res = await fetch("/api/checkins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not update check-in") });
      return;
    }
    const data = await res.json().catch(() => ({}));
    const next = data.checkin as
      | {
          id: string;
          name: string;
          type: string;
          host: string;
          unit: string;
          status: string;
          photo?: string | null;
          service?: string;
          fromBooking?: boolean;
          admitWithoutCall?: boolean;
        }
      | undefined;

    setEntries((prev) => {
      if (next && id.startsWith("booking:")) {
        return [
          {
            id: next.id,
            name: next.name,
            type: (next.type === "vendor" ? "vendor" : "guest") as "guest" | "vendor",
            host: next.host,
            unit: next.unit,
            time: t("now"),
            status: next.status as CheckinEntry["status"],
            photo: next.photo ?? undefined,
            service: next.service,
            fromBooking: next.fromBooking,
            admitWithoutCall: next.admitWithoutCall,
          },
          ...prev.filter((c) => c.id !== id),
        ];
      }
      return prev.map((c) => (c.id === id ? { ...c, status } : c));
    });

    if (status === "checked_in") {
      const wasApprovedVisit =
        id.startsWith("booking:") ||
        entries.find((c) => c.id === id)?.admitWithoutCall;
      toast({
        variant: "success",
        title: wasApprovedVisit ? t("Provider admitted") : t("Checked in"),
        description: wasApprovedVisit
          ? t("No need to call the member — booking was already approved.")
          : undefined,
      });
    }
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Front Desk")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border-2 bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-medium text-black">
              <UserPlus className="h-4 w-4 text-[var(--mvp-blue)]" /> {t("Check in")}
            </h2>
            <form className="space-y-4" onSubmit={add}>
              <div className="space-y-2">
                <Label htmlFor="name">{t("Name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">{t("Type")}</Label>
                <Select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as "guest" | "vendor")}
                >
                  <option value="guest">{t("Guest")}</option>
                  <option value="vendor">{t("Vendor")}</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="host">{t("Host / Unit")}</Label>
                <Input id="host" value={host} onChange={(e) => setHost(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("Photo")}</Label>
                <div className="flex items-center gap-3">
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={onPhoto}
                    />
                    <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border-1 px-3 text-sm font-medium text-gray-2 hover:bg-slate-50">
                      <Camera className="h-4 w-4" />
                      {t("Capture")}
                    </span>
                  </label>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt={t("Capture preview")}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : null}
                </div>
              </div>
              <Button type="submit">{t("Check in")}</Button>
            </form>
          </div>

          <div className="rounded-xl border border-border-2 bg-white p-5 lg:col-span-2">
            <h2 className="mb-1 text-base font-medium text-black">{t("Today's Log")}</h2>
            <p className="mb-4 text-xs text-grey">
              {t(
                "Guest and vendor check-ins for today. Approved provider visits from the member calendar appear as Expected.",
              )}
            </p>
            <div className="space-y-3">
              {entries.length === 0 ? (
                <div className="rounded-xl bg-[#f7f8fa] px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-ink">{t("No check-ins today.")}</p>
                  <p className="mt-1 text-sm text-grey">
                    {t("Expected provider visits from the member calendar will show here.")}
                  </p>
                </div>
              ) : (
                entries.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between border-b border-border-2 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {c.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.photo}
                          alt={c.name}
                          className="h-9 w-9 rounded-lg object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="text-sm font-medium text-ink">{c.name}</p>
                        <p className="text-xs text-grey">
                          {c.type}
                          {c.admitWithoutCall ? ` · ${t("approved visit")}` : ""} · {c.host} ·{" "}
                          {c.time}
                        </p>
                        {c.service ? (
                          <p className="text-xs text-[var(--mvp-blue)]">{c.service}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[c.status]}>
                        {t(c.status.replace("_", " "))}
                      </Badge>
                      {c.status === "expected" ? (
                        <Button size="sm" onClick={() => void setStatus(c.id, "checked_in")}>
                          {c.admitWithoutCall ? t("Admit") : t("Check in")}
                        </Button>
                      ) : c.status === "checked_in" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void setStatus(c.id, "checked_out")}
                        >
                          {t("Check out")}
                        </Button>
                      ) : null}
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
