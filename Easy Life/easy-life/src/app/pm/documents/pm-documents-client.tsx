"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Upload, X } from "lucide-react";
import { ContentHeader, PageBody, PortalPageIntro } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page-header";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { formatDate } from "@/lib/utils";

export interface PmDocumentDTO {
  id: string;
  title: string;
  category: string;
  url: string;
  size: string;
  date: string;
}

const categoryVariant = {
  rules: "info",
  policy: "default",
  emergency: "danger",
  legal: "info",
  minutes: "default",
  financial: "warning",
} as const;

export function PmDocumentsClient({ documents }: { documents: PmDocumentDTO[] }) {
  const { t } = useI18n();
  const profile = useSessionProfile();
  const { toast } = useToast();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [viewDoc, setViewDoc] = useState<PmDocumentDTO | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("rules");
  const [busy, setBusy] = useState(false);

  async function postDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: "warning", title: t("Title required") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), category, audience: "member" }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not upload") });
      return;
    }
    toast({ variant: "success", title: t("Document posted") });
    setTitle("");
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Rules & Policies")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <PortalPageIntro
          eyebrow="Property manager workspace"
          title="Documents"
          description="Community rules, policies & emergency procedures"
          action={
            <Button onClick={() => setShowForm((s) => !s)}>
              <Upload className="h-4 w-4" />
              {t("Post document")}
            </Button>
          }
        />

        {showForm ? (
          <div className="mb-6 rounded-xl border border-border-2 bg-white p-5">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={postDocument}>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="doc-title">{t("Title")}</Label>
                <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-cat">{t("Category")}</Label>
                <Select
                  id="doc-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="rules">{t("Rules")}</option>
                  <option value="policy">{t("Policy")}</option>
                  <option value="emergency">{t("Emergency")}</option>
                  <option value="legal">{t("Legal")}</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={busy}>
                  {t("Post document")}
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="space-y-3">
          {documents.length === 0 ? (
            <EmptyState
              title={t("No documents yet.")}
              description={t("Post rules, policies, and emergency procedures for residents.")}
              action={
                <Button onClick={() => setShowForm(true)}>
                  <Upload className="h-4 w-4" />
                  {t("Post document")}
                </Button>
              }
            />
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 rounded-xl border border-border-2 bg-white p-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--mvp-blue)]/10 text-[var(--mvp-blue)]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-ink">{doc.title}</h3>
                    <Badge
                      variant={
                        categoryVariant[doc.category as keyof typeof categoryVariant] ?? "default"
                      }
                    >
                      {t(doc.category)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-grey">
                    {formatDate(doc.date)} · {doc.size}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewDoc(doc)}>
                  {t("View")}
                </Button>
              </div>
            ))
          )}
        </div>

        {viewDoc ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doc-view-title"
            onClick={() => setViewDoc(null)}
          >
            <div
              className="w-full max-w-lg rounded-xl border border-border-2 bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="doc-view-title" className="text-lg font-bold text-ink">
                    {viewDoc.title}
                  </h2>
                  <p className="mt-1 text-sm text-grey">
                    {t(viewDoc.category)} · {formatDate(viewDoc.date)} · {viewDoc.size}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewDoc(null)}
                  className="rounded-md p-1 text-grey hover:bg-slate-100"
                  aria-label={t("Close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-2">
                {t("Preview opens the document in a new tab (demo PDF).")}
              </p>
              <div className="mt-6 flex gap-3">
                <a
                  href={viewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-medium text-white hover:brightness-95"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("Open document")}
                </a>
                <Button variant="outline" onClick={() => setViewDoc(null)}>
                  {t("Close")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </PageBody>
    </div>
  );
}
