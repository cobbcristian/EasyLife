"use client";

import { useEffect, useState } from "react";
import { PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type Note = { id: string; topic: string; note: string; active: boolean };

const TOPICS = [
  { id: "packages", label: "Packages" },
  { id: "access", label: "Access" },
  { id: "pets", label: "Pets" },
  { id: "other", label: "Other" },
];

export default function DeskNotesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [topic, setTopic] = useState("packages");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/member/desk-notes")
      .then((r) => r.json())
      .then((d) => setNotes(d.notes ?? []))
      .catch(() => setNotes([]));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/member/desk-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, note }),
    });
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not save that instruction") });
      return;
    }
    const data = (await res.json()) as { note?: Note };
    if (data.note) setNotes((prev) => [data.note!, ...prev]);
    setNote("");
    toast({ variant: "success", title: t("Front desk can see this") });
  }

  return (
    <PageBody className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("Front desk")}</h1>
        <p className="mt-1 text-sm text-grey">
          {t("Leave a standing instruction for packages, guests, pets, or anything the desk should know.")}
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border-2 bg-white p-4">
        <div>
          <Label htmlFor="desk-topic">{t("Topic")}</Label>
          <select
            id="desk-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border-2 bg-white px-3 text-sm"
          >
            {TOPICS.map((item) => (
              <option key={item.id} value={item.id}>
                {t(item.label)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="desk-note">{t("Instruction")}</Label>
          <textarea
            id="desk-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            maxLength={500}
            rows={4}
            className="mt-1 w-full rounded-lg border border-border-2 px-3 py-2 text-sm"
            placeholder={t("Hold packages at the desk until Friday.")}
          />
        </div>
        <Button type="submit" disabled={saving || note.trim().length < 2} className="w-full">
          {saving ? t("Saving...") : t("Save instruction")}
        </Button>
      </form>
      <ul className="space-y-2">
        {notes.map((row) => (
          <li key={row.id} className="rounded-xl border border-border-2 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-grey">{t(row.topic)}</p>
            <p className="mt-1 text-sm text-ink">{row.note}</p>
          </li>
        ))}
      </ul>
    </PageBody>
  );
}
