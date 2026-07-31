"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

interface BoardEvent {
  id: string;
  title: string;
  date: string;
  time: string | null;
  location: string;
  rsvpCount: number;
}

export default function BoardSchedulerPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [avatarName, setAvatarName] = useState("");
  const [schedule, setSchedule] = useState<BoardEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const loadEvents = useCallback(() => {
    fetch("/api/events?category=board")
      .then((r) => r.json())
      .then((d) => setSchedule(d.events ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setAvatarName(d.name ?? ""))
      .catch(() => {});
    loadEvents();
  }, [loadEvents]);

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) {
      toast({ variant: "warning", title: t("Title and date required") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        date,
        time,
        location,
        description,
        category: "board",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not create event") });
      return;
    }
    toast({ variant: "success", title: t("Event created") });
    setTitle("");
    setDate("");
    setTime("");
    setLocation("");
    setDescription("");
    setShowForm(false);
    loadEvents();
    router.refresh();
  }

  async function toggleRsvp(eventId: string) {
    const res = await fetch(`/api/events/${eventId}/rsvp`, { method: "POST" });
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not update RSVP") });
      return;
    }
    loadEvents();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Board Scheduler")} right="avatar" avatarName={avatarName} />
      <PageBody>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-grey">{t("Private board calendar")}</p>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            {t("New event")}
          </Button>
        </div>

        {showForm ? (
          <div className="mb-6 rounded-xl border border-border-2 bg-white p-5">
            <form onSubmit={addEvent} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">{t("Title")}</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">{t("Date")}</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">{t("Time")}</Label>
                <Input id="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="location">{t("Location")}</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">{t("Description")}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {t("Save")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  {t("Cancel")}
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="space-y-3">
          {schedule.length === 0 ? (
            <div className="rounded-xl border border-border-2 bg-white px-5 py-8 text-center">
              <p className="text-sm font-semibold text-ink">{t("No upcoming events.")}</p>
              <p className="mt-1 text-sm text-grey">
                {t("Schedule a board meeting or community event.")}
              </p>
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                {t("Add event")}
              </Button>
            </div>
          ) : (
            schedule.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-4 rounded-xl border border-border-2 bg-white p-4"
              >
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--mvp-blue)] text-white">
                  <span className="text-[10px] font-medium uppercase opacity-80">
                    {new Date(e.date).toLocaleDateString("en-US", { month: "short" })}
                  </span>
                  <span className="text-xl font-bold">{new Date(e.date).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink">{e.title}</h3>
                  <p className="text-sm text-grey">
                    {e.time ?? "—"} · {e.location} · {e.rsvpCount} {t("attending")}
                  </p>
                  <p className="text-xs text-grey-light">{formatDate(e.date)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toggleRsvp(e.id)}>
                  {t("RSVP")}
                </Button>
              </div>
            ))
          )}
        </div>
      </PageBody>
    </div>
  );
}
