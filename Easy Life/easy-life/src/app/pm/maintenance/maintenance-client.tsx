"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn, formatDate } from "@/lib/utils";

interface ServiceRequest {
  id: string;
  title: string;
  category: string;
  memberName: string;
  unit: string;
  description: string;
  status: string;
  createdAt: string;
}

interface MaintenanceTask {
  id: string;
  title: string;
  area: string;
  assignedTo: string;
  status: "open" | "in_progress" | "done";
  due: string;
}

const statusVariant = {
  open: "warning",
  in_progress: "info",
  done: "success",
  resolved: "success",
} as const;

export function MaintenanceClient({
  requests,
  tasks,
}: {
  requests: ServiceRequest[];
  tasks: MaintenanceTask[];
}) {
  const { t } = useI18n();
  const profile = useSessionProfile();
  const router = useRouter();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    area: "",
    assignedTo: "",
    due: "",
  });

  async function logTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.area.trim() || !form.due.trim()) {
      toast({ variant: "warning", title: t("Title, area, and due date required") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/maintenance-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not log task") });
      return;
    }
    toast({ variant: "success", title: t("Task logged") });
    setForm({ title: "", area: "", assignedTo: "", due: "" });
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Maintenance Log")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <div className="mb-6 rounded-xl border border-border-2 bg-white p-5">
          <h2 className="mb-4 text-base font-medium text-black">
            {t("Member Service Requests")}{" "}
            <span className="text-[var(--mvp-blue)]">{requests.length}</span>
          </h2>
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="rounded-xl bg-[#f7f8fa] p-4">
                <p className="text-sm font-semibold text-ink">{t("No member requests.")}</p>
                <p className="mt-1 text-sm text-grey">
                  {t("When members open service requests, they appear here for the crew.")}
                </p>
              </div>
            ) : (
              requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-2 border-b border-border-2 py-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{r.title}</p>
                    <p className="text-xs text-grey">
                      {r.category} · {r.memberName} · {r.unit} · {formatDate(r.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-gray-2">{r.description}</p>
                  </div>
                  <Badge variant={statusVariant[r.status as keyof typeof statusVariant] ?? "warning"}>
                    {t(r.status.replace("_", " "))}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-grey">{t("Building & grounds duties")}</p>
          <Button onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" />
            {t("Log task")}
          </Button>
        </div>

        {showForm ? (
          <div className="mb-6 rounded-xl border border-border-2 bg-white p-5">
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={logTask}>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="task-title">{t("Task")}</Label>
                <Input
                  id="task-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t("Replace lobby light fixtures")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-area">{t("Area")}</Label>
                <Input
                  id="task-area"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder={t("Lobby")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-assigned">{t("Assigned")}</Label>
                <Input
                  id="task-assigned"
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  placeholder={t("J. Alvarez")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">{t("Due")}</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={form.due}
                  onChange={(e) => setForm({ ...form, due: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? t("Saving…") : t("Log task")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  {t("Cancel")}
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border-2 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-2 bg-[#f8fafb] text-grey">
                  <th className="px-5 py-3 font-medium">{t("Task")}</th>
                  <th className="px-5 py-3 font-medium">{t("Area")}</th>
                  <th className="px-5 py-3 font-medium">{t("Assigned")}</th>
                  <th className="px-5 py-3 font-medium">{t("Due")}</th>
                  <th className="px-5 py-3 font-medium">{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center">
                      <p className="text-sm font-semibold text-ink">{t("No tasks logged yet.")}</p>
                      <p className="mt-1 text-sm text-grey">
                        {t("Log a maintenance task so the crew can track work.")}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                      >
                        {t("Add task")}
                      </button>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task, idx) => (
                    <tr
                      key={task.id}
                      className={cn(
                        "border-b border-border-2 last:border-0",
                        idx % 2 === 1 && "bg-[#fafbfc]",
                      )}
                    >
                      <td className="px-5 py-3 font-medium text-ink">{task.title}</td>
                      <td className="px-5 py-3 text-gray-2">{task.area}</td>
                      <td className="px-5 py-3 text-gray-2">{task.assignedTo}</td>
                      <td className="px-5 py-3 text-gray-2">{formatDate(task.due)}</td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[task.status]}>
                          {t(task.status.replace("_", " "))}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
