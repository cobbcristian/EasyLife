"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

export function SendTestPush() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!to) {
      toast({ variant: "warning", title: t("Enter a recipient email") });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: to }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "warning",
          title: t("Could not send"),
          description: data.error ?? t("Try again."),
        });
        setLoading(false);
        return;
      }
      toast({
        variant: "success",
        title: t("Push sent"),
        description: `${t("Delivered to")} ${to}.`,
      });
      setLoading(false);
    } catch {
      toast({ variant: "warning", title: t("Something went wrong") });
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="testPushTo">{t("Send a test push")}</Label>
      <div className="flex gap-2">
        <Input
          id="testPushTo"
          type="email"
          placeholder="you@example.com"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Button onClick={send} disabled={loading}>
          {loading ? t("Sending...") : t("Send")}
        </Button>
      </div>
    </div>
  );
}
