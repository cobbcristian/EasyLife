"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

export function MemberInviteForm({ avatarName }: { avatarName: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastJoinUrl, setLastJoinUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/invites/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: t("Invite failed"),
          description: data.error,
        });
        return;
      }
      setLastJoinUrl(data.joinUrl ?? null);
      if (data.emailed) {
        toast({
          variant: "success",
          title: t("Invite sent"),
          description: `${t("An invite was emailed to")} ${email.trim()}.`,
        });
      } else {
        toast({
          variant: "info",
          title: t("Invite created"),
          description:
            data.warning ??
            data.error ??
            t("Share the join link below with the member."),
        });
      }
      setName("");
      setEmail("");
    } catch {
      toast({ variant: "warning", title: t("Invite failed") });
    } finally {
      setLoading(false);
    }
  }

  async function copyJoinLink() {
    if (!lastJoinUrl) return;
    try {
      await navigator.clipboard.writeText(lastJoinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Invite Member")} right="avatar" avatarName={avatarName} />
      <PageBody>
        <div className="mx-auto max-w-xl rounded-xl border border-border-2 bg-white p-6">
          <h2 className="mb-1 flex items-center gap-2 text-base font-medium text-black">
            <Mail className="h-4 w-4 text-[var(--mvp-blue)]" /> {t("Invite a member")}
          </h2>
          <p className="mb-5 text-sm text-grey">
            {t("Send a join link pre-filled with your community's invite code.")}
          </p>
          <form className="space-y-4" onSubmit={sendInvite}>
            <div className="space-y-2">
              <Label htmlFor="invite-name">{t("Name (optional)")}</Label>
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Jane Doe")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t("Email")}</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? t("Sending...") : t("Send invite")}
            </Button>
          </form>

          {lastJoinUrl ? (
            <div className="mt-6 rounded-lg border border-border-1 bg-[#f8fafb] p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-grey">
                  {t("Join link")}
                </p>
                <button
                  type="button"
                  onClick={copyJoinLink}
                  className="text-xs font-medium text-[var(--mvp-blue)] hover:underline"
                >
                  {copied ? t("Copied") : t("Copy link")}
                </button>
              </div>
              <p className="break-all text-sm text-ink">{lastJoinUrl}</p>
            </div>
          ) : null}
        </div>
      </PageBody>
    </div>
  );
}
