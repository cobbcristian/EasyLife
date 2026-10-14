"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";

type Newsletter = {
  id: string;
  title: string;
  summary: string;
  body: string;
  date: string;
};

const empty = { title: "", summary: "", body: "" };

export default function PmNewsletterPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    fetch("/api/pm/newsletters")
      .then((r) => r.json())
      .then((data) => {
        if (on) setRows(data.newsletters ?? []);
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/pm/newsletters", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing, ...draft } : draft),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not save newsletter") });
      return;
    }
    const saved = data.newsletter as Newsletter;
    setRows((prev) =>
      editing ? prev.map((row) => (row.id === saved.id ? saved : row)) : [saved, ...prev],
    );
    setDraft(empty);
    setEditing(null);
    toast({
      variant: "success",
      title: editing ? t("Newsletter updated") : t("Newsletter sent to residents"),
    });
  }

  async function remove(id: string) {
    const res = await fetch("/api/pm/newsletters", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not delete newsletter") });
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== id));
    if (editing === id) {
      setEditing(null);
      setDraft(empty);
    }
    toast({ variant: "success", title: t("Newsletter deleted") });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <h1 className="text-[22px] font-semibold text-ink">{t("Newsletter")}</h1>
      <p className="mt-1 text-sm text-grey">
        {t("Write a newsletter for residents. It shows on their Newsletter screen and in notifications.")}
      </p>
      <form
        onSubmit={(e) => void save(e)}
        className="mt-5 space-y-3 rounded-2xl border border-[#e8ebf0] bg-white p-4"
      >
        <input
          required
          value={draft.title}
          onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
          placeholder={t("Title")}
          className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
        />
        <input
          required
          value={draft.summary}
          onChange={(e) => setDraft((prev) => ({ ...prev, summary: e.target.value }))}
          placeholder={t("Short summary")}
          className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
        />
        <textarea
          value={draft.body}
          onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))}
          placeholder={t("Full newsletter")}
          className="min-h-32 w-full rounded-xl border border-[#e4e8ee] px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button type="submit" className="h-11 rounded-xl bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white">
            {editing ? t("Save changes") : t("Publish newsletter")}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft(empty);
              }}
              className="h-11 rounded-xl border border-[#e4e8ee] px-4 text-sm font-semibold text-ink"
            >
              {t("Cancel")}
            </button>
          ) : null}
        </div>
      </form>
      {loading ? (
        <p className="mt-6 text-sm text-grey">{t("Loading…")}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white p-4">
              <p className="text-[15px] font-semibold text-ink">{row.title}</p>
              <p className="mt-1 text-sm text-grey">{row.summary}</p>
              <p className="mt-1 text-[12px] text-grey">{row.date}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(row.id);
                    setDraft({ title: row.title, summary: row.summary, body: row.body });
                  }}
                  className="h-9 rounded-xl bg-[#f2f4f7] px-3 text-[12px] font-semibold text-ink"
                >
                  {t("Change")}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(row.id)}
                  className="h-9 rounded-xl bg-[#f2f4f7] px-3 text-[12px] font-semibold text-ink"
                >
                  {t("Delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
