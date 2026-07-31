"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, KeyRound, Radio, ScanLine, UserPlus } from "lucide-react";
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

type GateLane = "main" | "member" | "side";

interface GateEvent {
  id: string;
  lane: GateLane;
  direction: "entry" | "exit";
  name: string;
  detail: string;
  plate: string;
  time: string;
  status: "admitted" | "denied" | "review";
}

const statusVariant = {
  expected: "warning",
  checked_in: "success",
  checked_out: "default",
} as const;

const gateStatusVariant = {
  admitted: "success",
  denied: "danger",
  review: "warning",
} as const;

const ACCESS_LANES = [
  {
    id: "main" as const,
    title: "Main entrance",
    body: "Front desk lane — driver’s license scan + license-plate camera for guests and vendors.",
    icon: ScanLine,
  },
  {
    id: "member" as const,
    title: "Member gate",
    body: "Transponder reader + plate cameras at entry and exit populate who is on property.",
    icon: Radio,
  },
  {
    id: "side" as const,
    title: "Side gate",
    body: "Gate PIN keypad + license-plate camera. PIN and plate must match an authorized visit.",
    icon: KeyRound,
  },
];

/** Demo live feed for club gate hardware (PIN / transponder / LPR). */
const DEMO_GATE_EVENTS: GateEvent[] = [
  {
    id: "ge1",
    lane: "side",
    direction: "entry",
    name: "Elena Vargas",
    detail: "Side gate · PIN ****4821 verified",
    plate: "FL-4EV918",
    time: "7:42 AM",
    status: "admitted",
  },
  {
    id: "ge2",
    lane: "member",
    direction: "entry",
    name: "Jordan Blake",
    detail: "Member gate · transponder M-4201",
    plate: "FL-7JB042",
    time: "8:05 AM",
    status: "admitted",
  },
  {
    id: "ge3",
    lane: "side",
    direction: "entry",
    name: "Lawn crew",
    detail: "Side gate · vendor PIN ****9104",
    plate: "FL-LC204",
    time: "8:18 AM",
    status: "admitted",
  },
  {
    id: "ge4",
    lane: "main",
    direction: "entry",
    name: "Alex (guest)",
    detail: "Main · DL scan + host Lot 42",
    plate: "FL-7KRP42",
    time: "9:12 AM",
    status: "admitted",
  },
  {
    id: "ge5",
    lane: "side",
    direction: "entry",
    name: "Unknown vehicle",
    detail: "Side gate · PIN entered, plate not on list",
    plate: "FL-UNK331",
    time: "9:40 AM",
    status: "review",
  },
  {
    id: "ge6",
    lane: "member",
    direction: "exit",
    name: "Marcus Hale",
    detail: "Member gate exit · transponder M-0707",
    plate: "FL-MH007",
    time: "10:03 AM",
    status: "admitted",
  },
];

function laneLabel(lane: GateLane): string {
  switch (lane) {
    case "main":
      return "Main";
    case "member":
      return "Member";
    case "side":
      return "Side";
    default: {
      const _exhaustive: never = lane;
      return _exhaustive;
    }
  }
}

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
    toast({ variant: "success", title: t("Checked in"), description: `${name} ${t("checked in.")}` });
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
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {ACCESS_LANES.map((lane) => {
            const Icon = lane.icon;
            return (
              <div
                key={lane.id}
                className="rounded-xl border border-border-2 bg-white p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--mvp-blue)]" />
                  <h2 className="text-sm font-semibold text-ink">{t(lane.title)}</h2>
                </div>
                <p className="text-xs leading-relaxed text-grey">{t(lane.body)}</p>
              </div>
            );
          })}
        </div>

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
                    <img src={photo} alt={t("Capture preview")} className="h-10 w-10 rounded-lg object-cover" />
                  ) : null}
                </div>
              </div>
              <Button type="submit">{t("Check in")}</Button>
            </form>
          </div>

          <div className="rounded-xl border border-border-2 bg-white p-5 lg:col-span-2">
            <h2 className="mb-1 text-base font-medium text-black">{t("Gate activity")}</h2>
            <p className="mb-4 text-xs text-grey">
              {t("Live reads from main, member, and side gates — PIN, transponder, and plate camera.")}
            </p>
            <div className="space-y-3">
              {DEMO_GATE_EVENTS.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between gap-3 border-b border-border-2 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="default">{t(laneLabel(ev.lane))}</Badge>
                      <span className="text-[11px] uppercase tracking-wide text-grey">
                        {t(ev.direction)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-ink">{ev.name}</p>
                    <p className="text-xs text-grey">
                      {ev.detail} · {ev.plate} · {ev.time}
                    </p>
                  </div>
                  <Badge variant={gateStatusVariant[ev.status] ?? "default"}>
                    {t(ev.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border-2 bg-white p-5">
          <h2 className="mb-1 text-base font-medium text-black">{t("Today's Log")}</h2>
          <p className="mb-4 text-xs text-grey">
            {t(
              "Approved provider visits from the member calendar appear as Expected — admit at the gate without calling the host.",
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
                      <img src={c.photo} alt={c.name} className="h-9 w-9 rounded-lg object-cover" />
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
      </PageBody>
    </div>
  );
}
