"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type VisitorRow = {
  id: string;
  name: string;
  unit: string;
  status: string;
  createdAt: string;
};

const statusVariant = {
  expected: "warning",
  checked_in: "success",
  checked_out: "default",
} as const;

export default function MemberVisitorsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/member/visitors");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { visitors?: VisitorRow[] };
    setVisitors(data.visitors ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/member/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not register visitor") });
      return;
    }
    const data = (await res.json()) as { visitor?: VisitorRow };
    if (data.visitor) {
      setVisitors((prev) => [data.visitor!, ...prev]);
    }
    setName("");
    toast({
      variant: "success",
      title: t("Visitor registered"),
      description: t("Front desk will see them as expected."),
    });
  }

  return (
    <PageBody className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("Visitor")}</h1>
        <p className="mt-1 text-sm text-grey">
          {t(
            "Register a guest for the gate. Front desk will see them as expected when they arrive.",
          )}
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-xl border border-border-2 bg-white p-4"
      >
        <div>
          <Label htmlFor="visitor-name">{t("Visitor name")}</Label>
          <Input
            id="visitor-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Full name")}
            required
          />
        </div>
        <Button type="submit" disabled={saving || !name.trim()} className="w-full gap-2">
          <UserPlus className="h-4 w-4" />
          {saving ? t("Saving…") : t("Register visitor")}
        </Button>
      </form>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">{t("Your visitors")}</h2>
        {loading ? (
          <p className="text-sm text-grey">{t("Loading…")}</p>
        ) : visitors.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-2 p-4 text-center text-sm text-grey">
            {t("No visitors registered yet.")}
          </p>
        ) : (
          <ul className="space-y-2">
            {visitors.map((v) => {
              const status = v.status as keyof typeof statusVariant;
              return (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border-2 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{v.name}</p>
                    <p className="text-xs text-grey">
                      {v.unit !== "—" ? `${t("Unit")} ${v.unit} · ` : null}
                      {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={statusVariant[status] ?? "default"}>
                    {t(v.status.replace("_", " "))}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageBody>
  );
}
