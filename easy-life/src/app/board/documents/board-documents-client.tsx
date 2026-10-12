"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Upload } from "lucide-react";
import { ContentHeader, PageBody, PortalPageIntro } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page-header";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { formatDate } from "@/lib/utils";
import type { DocumentDTO } from "@/app/member/documents/documents-client";

export function BoardDocumentsClient({ documents }: { documents: DocumentDTO[] }) {
  const { t } = useI18n();
  const profile = useSessionProfile();
  const { toast } = useToast();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("legal");
  const [busy, setBusy] = useState(false);

  const categoryLabel = {
    legal: t("Legal"),
    minutes: t("Minutes"),
    financial: t("Financial"),
    policy: t("Policy"),
  } as const;

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!title) {
      toast({ variant: "warning", title: t("Title required") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, audience: "board" }),
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
      <ContentHeader title={t("Board Documents")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <PortalPageIntro
          eyebrow="Board workspace"
          title="Documents"
          description="Declarations, bylaws, budgets, financials & minutes"
          action={
            <Button onClick={() => setShowForm((s) => !s)}>
              <Upload className="h-4 w-4" />
              {t("Upload & post")}
            </Button>
          }
        />

        {showForm ? (
          <div className="mb-6 rounded-xl border border-border-2 bg-white p-5">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={upload}>
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
                  <option value="legal">{t("Legal")}</option>
                  <option value="minutes">{t("Minutes")}</option>
                  <option value="financial">{t("Financial")}</option>
                  <option value="policy">{t("Policy")}</option>
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
              description={t("Upload board packets, minutes, and financials for your community.")}
              action={
                <Button onClick={() => setShowForm(true)}>
                  <Upload className="h-4 w-4" />
                  {t("Upload & post")}
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
                    <Badge>
                      {categoryLabel[doc.category as keyof typeof categoryLabel] ?? doc.category}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-grey">
                    {formatDate(doc.date)} · {doc.size}
                  </p>
                </div>
                <a
                  href={doc.url}
                  download
                  className="inline-flex h-8 items-center gap-2 rounded-lg border border-border-1 bg-white px-3 text-xs font-medium text-gray-2 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  {t("Download")}
                </a>
              </div>
            ))
          )}
        </div>
      </PageBody>
    </div>
  );
}
