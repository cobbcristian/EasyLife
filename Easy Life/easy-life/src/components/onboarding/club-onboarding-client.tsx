"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Download } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type CommunityOption = { id: string; name: string };

type Phase = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  links?: Array<{ label: string; href: string }>;
  action?: "members" | "documents" | "amenities" | "pos";
};

const PHASES: Phase[] = [
  {
    id: "create",
    title: "Create the club",
    summary: "Super admin only — stand up the community and club admin login.",
    steps: [
      "Go to Communities → Add Community.",
      "Enter club name, city, state, and the primary club admin name and email.",
      "Copy the temporary admin password, invite code, and share them securely with the club.",
    ],
    links: [{ label: "Add Community", href: "/communities/new" }],
  },
  {
    id: "handoff",
    title: "Hand off to the club admin",
    summary: "Club admin logs in and changes their password.",
    steps: [
      "Send admin email + temporary password (welcome email sends automatically if email is configured).",
      "Share the member invite code and signup link: /signup → Join a club.",
      "Schedule a 30-minute kickoff call to walk through branding and amenities.",
    ],
    links: [{ label: "Login page", href: "/login" }],
  },
  {
    id: "branding",
    title: "Branding & settings",
    summary: "Make the app look like their club.",
    steps: [
      "Open the community → Settings tab.",
      "Set display name, primary color, logo URL, and cover gradient.",
      "Copy the member invite code for the rollout email.",
    ],
    links: [{ label: "Community settings", href: "/communities" }],
  },
  {
    id: "import-members",
    title: "Bulk import members",
    summary: "Upload a roster CSV instead of entering members one by one.",
    steps: [
      "Prepare CSV with columns: name, email, unit, phone.",
      "Upload below — each new member gets a temporary password.",
      "Download the credentials file and send securely (or ask members to use self-signup with the invite code).",
    ],
    action: "members",
  },
  {
    id: "import-docs",
    title: "Import documents (old site / PDFs)",
    summary: "Bring over bylaws, rules, and welcome packets from their old site.",
    steps: [
      "List each document as: title, url, category (one per line).",
      "URLs can point to existing PDFs on their website or Google Drive.",
      "Members will see these under Documents in the member portal.",
    ],
    action: "documents",
  },
  {
    id: "amenities",
    title: "Amenities & booking",
    summary: "Courts, pool, golf, fitness — capacity and surfaces for scheduling.",
    steps: [
      "Add each amenity with kind (court, pool, etc.), unit count, and surface where relevant.",
      "Set fees and booking rules.",
      "Test a member booking in a sandbox account.",
    ],
    action: "amenities",
  },
  {
    id: "providers",
    title: "Services & providers",
    summary: "Vendors, pros, and activity providers scoped to this club.",
    steps: [
      "Add service and activity providers under Services & Activities.",
      "Invite provider accounts (cleaning, tennis, golf shop, etc.).",
      "Providers connect Stripe for payouts when they accept paid bookings.",
    ],
    links: [{ label: "Services & Activities", href: "/services-activities" }],
  },
  {
    id: "payments",
    title: "Payments live",
    summary: "Dues, tournament entry, apparel, and dining checkout.",
    steps: [
      "Platform Stripe is configured on Vercel (STRIPE_SECRET_KEY).",
      "Club admin verifies checkout on a test charge (tournament entry or apparel).",
      "Each provider completes Stripe Connect from their provider account for payouts.",
    ],
    links: [{ label: "App Setup", href: "/app-setup" }],
  },
  {
    id: "rollout",
    title: "Member rollout",
    summary: "Communications and adoption.",
    steps: [
      "Email members with invite code + link to /signup.",
      "Post announcement in the member portal once a few accounts exist.",
      "Front desk / pro shop ready to help with first login.",
    ],
    links: [{ label: "Notifications", href: "/notifications" }, { label: "Templates", href: "/templates" }],
  },
  {
    id: "pos",
    title: "POS / MICROS (optional)",
    summary: "Restaurant and pro-shop POS integration — concierge setup.",
    steps: [
      "Collect MICROS / Oracle Symphony API credentials from the club.",
      "Submit a Help Desk ticket with club name and contact.",
      "Menu sync and dining orders go live after adapter install (typically 1–2 weeks).",
    ],
    action: "pos",
    links: [{ label: "Help Desk", href: "/help-desk" }],
  },
];

const MEMBER_CSV_SAMPLE = `name,email,unit,phone
Jane Smith,jane.smith@example.com,Unit 101,(555) 234-5678
John Doe,john.doe@example.com,Lot 12,(555) 987-6543`;

const DOC_SAMPLE = `title,url,category
Community Bylaws,https://example.com/bylaws.pdf,Governance
Pool Rules,https://example.com/pool-rules.pdf,Amenities`;

export function ClubOnboardingClient({
  communities,
  initialCommunityId,
  isSuperAdmin,
}: {
  communities: CommunityOption[];
  initialCommunityId?: string | null;
  isSuperAdmin: boolean;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [communityId, setCommunityId] = useState(
    initialCommunityId ?? communities[0]?.id ?? "",
  );
  const [openPhase, setOpenPhase] = useState<string>("create");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [memberCsv, setMemberCsv] = useState(MEMBER_CSV_SAMPLE);
  const [docText, setDocText] = useState(DOC_SAMPLE);
  const [importBusy, setImportBusy] = useState(false);
  const [lastImport, setLastImport] = useState<
    Array<{ name: string; email: string; tempPassword: string }> | null
  >(null);
  const [readiness, setReadiness] = useState<{
    percent: number;
    checks: Array<{ id: string; label: string; done: boolean }>;
  } | null>(null);
  const [amenityCsv, setAmenityCsv] = useState(
    "name,kind,fee,schedule,units,surface\nTennis Court 1,court,0,Daily 7am-9pm,4,hard\nPool,pool,0,Daily 6am-10pm,1,",
  );

  const storageKey = useMemo(
    () => (communityId ? `el-onboarding-${communityId}` : ""),
    [communityId],
  );

  const [doneStorageKey, setDoneStorageKey] = useState("");
  if (storageKey !== doneStorageKey) {
    setDoneStorageKey(storageKey);
    if (storageKey && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(storageKey);
        setDone(raw ? (JSON.parse(raw) as Record<string, boolean>) : {});
      } catch {
        setDone({});
      }
    } else {
      setDone({});
    }
  }

  useEffect(() => {
    if (!communityId) return;
    fetch(`/api/communities/${communityId}/onboarding-status`)
      .then((r) => r.json())
      .then((d) => {
        if (d.percent != null) setReadiness(d);
      })
      .catch(() => {});
  }, [communityId]);

  const toggleDone = useCallback(
    (phaseId: string) => {
      setDone((prev) => {
        const next = { ...prev, [phaseId]: !prev[phaseId] };
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  const completedCount = PHASES.filter((p) => done[p.id]).length;
  const settingsHref = communityId ? `/communities/${communityId}?tab=settings` : "/communities";

  async function importMembers() {
    if (!communityId) return;
    setImportBusy(true);
    const res = await fetch(`/api/communities/${communityId}/import/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: memberCsv }),
    });
    setImportBusy(false);
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Import failed") });
      return;
    }
    setLastImport(data.created ?? []);
    toast({
      variant: "success",
      title: t("Members imported"),
      description: `${data.created?.length ?? 0} created, ${data.skipped?.length ?? 0} skipped`,
    });
    toggleDone("import-members");
  }

  async function importDocuments() {
    if (!communityId) return;
    setImportBusy(true);
    const res = await fetch(`/api/communities/${communityId}/import/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: docText }),
    });
    setImportBusy(false);
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Import failed") });
      return;
    }
    toast({
      variant: "success",
      title: t("Documents imported"),
      description: `${data.imported} ${t("documents added")}`,
    });
    toggleDone("import-docs");
  }

  async function importAmenities() {
    if (!communityId) return;
    setImportBusy(true);
    const res = await fetch(`/api/communities/${communityId}/import/amenities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: amenityCsv }),
    });
    setImportBusy(false);
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Import failed") });
      return;
    }
    toast({
      variant: "success",
      title: t("Amenities imported"),
      description: `${data.imported} ${t("added")}`,
    });
    toggleDone("amenities");
  }

  function downloadCredentials() {
    if (!lastImport?.length) return;
    const header = "name,email,temporary_password\n";
    const body = lastImport
      .map((r) => `"${r.name}",${r.email},${r.tempPassword}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "member-credentials.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Club Onboarding")} right="logo" />
      <PageBody>
        <p className="mb-4 text-sm text-grey">
          {t("Step-by-step guide after a club is sold. Check off each phase as you complete it.")}
        </p>

        <div className="mb-6 flex flex-wrap items-end gap-4">
          {isSuperAdmin && communities.length > 1 ? (
            <div className="space-y-1">
              <Label htmlFor="club-select">{t("Club")}</Label>
              <Select
                id="club-select"
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                className="min-w-[220px]"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : communities[0] ? (
            <p className="text-sm font-medium text-ink">{communities[0].name}</p>
          ) : null}
          <Badge variant="info">
            {completedCount} / {PHASES.length} {t("phases complete")}
          </Badge>
          {readiness ? (
            <Badge variant={readiness.percent >= 80 ? "success" : "warning"}>
              {readiness.percent}% {t("launch ready")}
            </Badge>
          ) : null}
        </div>

        {readiness ? (
          <div className="mb-6 rounded-xl border border-border-2 bg-white p-5">
            <h2 className="mb-3 text-base font-medium text-black">{t("Launch readiness")}</h2>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[var(--mvp-blue)] transition-all"
                style={{ width: `${readiness.percent}%` }}
              />
            </div>
            <ul className="grid gap-1 sm:grid-cols-2">
              {readiness.checks.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm text-gray-2">
                  {c.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--mvp-blue)]" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-grey-light" />
                  )}
                  {t(c.label)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-4">
          {PHASES.map((phase, index) => {
            if (phase.id === "create" && !isSuperAdmin) return null;
            const isOpen = openPhase === phase.id;
            const isDone = done[phase.id];
            return (
              <div
                key={phase.id}
                className="rounded-xl border border-border-2 bg-white"
              >
                <div className="p-5 pb-2">
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => setOpenPhase(isOpen ? "" : phase.id)}
                  >
                    <span className="mt-0.5 shrink-0 text-[var(--mvp-blue)]">
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5 text-grey-light" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-medium text-black">
                        {index + 1}. {t(phase.title)}
                      </h2>
                      <p className="mt-1 text-sm font-normal text-grey">{t(phase.summary)}</p>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 shrink-0 text-grey" />
                    ) : (
                      <ChevronDown className="h-5 w-5 shrink-0 text-grey" />
                    )}
                  </button>
                </div>
                {isOpen ? (
                  <div className="space-y-4 border-t border-border-2 p-5 pt-4">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-2">
                      {phase.steps.map((step) => (
                        <li key={step}>{t(step)}</li>
                      ))}
                    </ol>
                    {phase.links?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {phase.links.map((link) => {
                          const href =
                            phase.id === "branding" && communityId
                              ? settingsHref
                              : link.href;
                          return (
                            <Link key={link.href + link.label} href={href}>
                              <Button variant="outline" size="sm">
                                {t(link.label)}
                              </Button>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}

                    {phase.action === "members" ? (
                      <div className="space-y-3 rounded-xl border border-border-2 bg-slate-50 p-4">
                        <Label htmlFor="member-csv">{t("Member roster CSV")}</Label>
                        <p className="text-xs text-grey">
                          {t("Columns: name, email, unit, phone — paste below or upload a .csv file.")}
                        </p>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="block text-sm text-grey file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--mvp-blue)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) setMemberCsv(await file.text());
                          }}
                        />
                        <Textarea
                          id="member-csv"
                          rows={6}
                          value={memberCsv}
                          onChange={(e) => setMemberCsv(e.target.value)}
                          className="font-mono text-xs"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={importMembers} disabled={importBusy || !communityId}>
                            {importBusy ? t("Importing…") : t("Import members")}
                          </Button>
                          {lastImport?.length ? (
                            <Button variant="outline" onClick={downloadCredentials}>
                              <Download className="h-4 w-4" />
                              {t("Download credentials CSV")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {phase.action === "documents" ? (
                      <div className="space-y-3 rounded-xl border border-border-2 bg-slate-50 p-4">
                        <Label htmlFor="doc-import">{t("Documents (title, url, category)")}</Label>
                        <Textarea
                          id="doc-import"
                          rows={5}
                          value={docText}
                          onChange={(e) => setDocText(e.target.value)}
                          className="font-mono text-xs"
                        />
                        <Button onClick={importDocuments} disabled={importBusy || !communityId}>
                          {importBusy ? t("Importing…") : t("Import documents")}
                        </Button>
                      </div>
                    ) : null}

                    {phase.action === "amenities" ? (
                      <div className="space-y-3 rounded-xl border border-border-2 bg-slate-50 p-4">
                        <Label htmlFor="amenity-csv">{t("Amenity roster CSV")}</Label>
                        <p className="text-xs text-grey">
                          {t("Columns: name, kind, fee, schedule, units, surface")}
                        </p>
                        <Textarea
                          id="amenity-csv"
                          rows={5}
                          value={amenityCsv}
                          onChange={(e) => setAmenityCsv(e.target.value)}
                          className="font-mono text-xs"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={importAmenities} disabled={importBusy || !communityId}>
                            {importBusy ? t("Importing…") : t("Import amenities")}
                          </Button>
                          <Link href="/amenities">
                            <Button variant="outline">{t("Amenity Setup")}</Button>
                          </Link>
                        </div>
                      </div>
                    ) : null}

                    {phase.action === "pos" ? (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {t("POS integration requires Help Desk setup — submit API credentials and we will schedule adapter install.")}
                      </p>
                    ) : null}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleDone(phase.id)}
                    >
                      {isDone ? t("Mark incomplete") : t("Mark phase complete")}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </PageBody>
    </div>
  );
}
