"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare, Plus, Smartphone } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

const channelIcon = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
};

export interface TemplateDTO {
  id: string;
  name: string;
  channel: string;
  subject: string;
}

export function TemplatesClient({ initial }: { initial: TemplateDTO[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "email", subject: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not create template") });
      return;
    }
    setForm({ name: "", channel: "email", subject: "" });
    setShowForm(false);
    toast({ variant: "success", title: t("Template created") });
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title="Content Templates" right="logo" />
      <PageBody>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-grey">{t("Onboarding & notification message templates")}</p>
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" />
            {showForm ? t("Close") : t("New template")}
          </Button>
        </div>

        {showForm ? (
          <div className="mb-6 rounded-xl border border-border-2 bg-white p-5">
            <h2 className="mb-4 text-base font-medium text-black">{t("New template")}</h2>
            <form className="grid gap-4 sm:grid-cols-3" onSubmit={add}>
              <div className="space-y-2">
                <Label htmlFor="name">{t("Name")}</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">{t("Channel")}</Label>
                <Select id="channel" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                  <option value="email">{t("Email")}</option>
                  <option value="sms">SMS</option>
                  <option value="push">Push</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">{t("Subject")}</Label>
                <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit">{t("Create template")}</Button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="space-y-3">
          {initial.map((tpl) => {
            const Icon = channelIcon[tpl.channel as keyof typeof channelIcon] ?? Mail;
            return (
              <div
                key={tpl.id}
                className="flex items-center gap-4 rounded-xl border border-border-2 bg-white p-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--mvp-blue)]/10 text-[var(--mvp-blue)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-ink">{t(tpl.name)}</h3>
                    <Badge>{t(tpl.channel)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-grey">{t(tpl.subject)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </PageBody>
    </div>
  );
}
