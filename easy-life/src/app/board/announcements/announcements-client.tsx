"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

export interface AnnouncementDTO {
  id: string;
  title: string;
  body: string;
  author: string;
  priority: string;
  createdAt: string;
}

export function AnnouncementsClient({ initial }: { initial: AnnouncementDTO[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const profile = useSessionProfile();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [broadcast, setBroadcast] = useState(false);
  const [busy, setBusy] = useState(false);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !body) {
      toast({ variant: "warning", title: t("Title and message required") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, priority, broadcast }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not post") });
      return;
    }
    toast({
      variant: "success",
      title: t("Announcement posted"),
      description: t("Residents will see it now."),
    });
    setTitle("");
    setBody("");
    setPriority("normal");
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Announcements")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          <div id="announce-form" className="rounded-xl border border-border-2 bg-white p-5">
            <h2 className="mb-4 text-base font-medium text-black">{t("Post an announcement")}</h2>
            <form className="space-y-4" onSubmit={post}>
              <div className="space-y-2">
                <Label htmlFor="title">{t("Title")}</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">{t("Message")}</Label>
                <Textarea id="body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">{t("Priority")}</Label>
                <Select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="normal">{t("Normal")}</option>
                  <option value="important">{t("Important")}</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-2">
                <input
                  type="checkbox"
                  checked={broadcast}
                  onChange={(e) => setBroadcast(e.target.checked)}
                />
                {t("Mass message — email all community members")}
              </label>
              <Button type="submit" disabled={busy}>
                {busy ? t("Posting...") : t("Post announcement")}
              </Button>
            </form>
          </div>

          <div className="rounded-xl border border-border-2 bg-white p-5 lg:col-span-2">
            <h2 className="mb-4 text-base font-medium text-black">
              {t("Posted")} ({initial.length})
            </h2>
            <div className="space-y-3">
              {initial.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-semibold text-ink">{t("No announcements yet.")}</p>
                  <p className="mt-1 text-sm text-grey">
                    {t("Use the form to post your first club announcement.")}
                  </p>
                  <a
                    href="#announce-form"
                    className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                  >
                    {t("Write announcement")}
                  </a>
                </div>
              ) : (
                initial.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 border-b border-border-2 py-3 last:border-0"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        a.priority === "important"
                          ? "bg-red-50 text-danger"
                          : "bg-[var(--mvp-blue)]/10 text-[var(--mvp-blue)]"
                      }`}
                    >
                      <Megaphone className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">{a.title}</p>
                        {a.priority === "important" ? (
                          <Badge variant="danger">{t("Important")}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-2">{a.body}</p>
                      <p className="mt-1 text-xs text-grey-light">
                        {a.author} · {a.createdAt}
                      </p>
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
