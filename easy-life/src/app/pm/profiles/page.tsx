"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { ChangePhotoButton } from "@/components/account/change-photo-button";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";

type Staff = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  phone: string;
};

const ROLES = [
  { id: "pm", label: "Community manager" },
  { id: "admin", label: "Admin" },
  { id: "board", label: "Board" },
] as const;

export default function PmProfilesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const me = useSessionProfile();
  const [rows, setRows] = useState<Staff[]>([]);
  const [selfId, setSelfId] = useState("");
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ name: "", email: "", role: "pm", phone: "" });
  const [password, setPassword] = useState("");
  const [edits, setEdits] = useState<Record<string, { name: string; role: string; phone: string }>>({});

  function remember(staff: Staff[], meId: string) {
    setRows(staff);
    setSelfId(meId);
    const next: Record<string, { name: string; role: string; phone: string }> = {};
    for (const row of staff) {
      next[row.id] = { name: row.name, role: row.role, phone: row.phone };
    }
    setEdits(next);
  }

  useEffect(() => {
    let on = true;
    fetch("/api/pm/staff")
      .then((r) => r.json())
      .then((data) => {
        if (on) remember((data.staff ?? []) as Staff[], data.me ?? "");
      })
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/pm/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not add profile") });
      return;
    }
    setRows((prev) => [...prev, data.staff as Staff].sort((a, b) => a.name.localeCompare(b.name)));
    setEdits((prev) => ({
      ...prev,
      [data.staff.id]: { name: data.staff.name, role: data.staff.role, phone: data.staff.phone },
    }));
    setPassword(data.temporaryPassword ?? "");
    setDraft({ name: "", email: "", role: "pm", phone: "" });
    toast({ variant: "success", title: t("Profile added") });
  }

  async function save(id: string) {
    const edit = edits[id];
    if (!edit) return;
    const res = await fetch("/api/pm/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...edit }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not save profile") });
      return;
    }
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...(data.staff as Staff) } : row)));
    toast({ variant: "success", title: t("Profile updated") });
  }

  async function remove(id: string) {
    const res = await fetch("/api/pm/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ variant: "warning", title: data.error ?? t("Could not delete profile") });
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== id));
    toast({ variant: "success", title: t("Profile deleted") });
  }

  const self = rows.find((row) => row.id === selfId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <h1 className="text-[22px] font-semibold text-ink">{t("Staff profiles")}</h1>
      <p className="mt-1 text-sm text-grey">
        {t("Community managers, admins, and board members for this community.")}
      </p>

      <section className="mt-5 rounded-2xl border border-[#e8ebf0] bg-white p-4">
        <div className="flex items-center gap-3">
          <Avatar name={me.name} src={me.avatarUrl ?? undefined} size="lg" />
          <div>
            <p className="text-[15px] font-semibold text-ink">{self?.name || me.name}</p>
            <p className="text-[12px] text-grey">{me.email}</p>
          </div>
        </div>
        <div className="mt-3">
          <ChangePhotoButton
            label={t("Change photo")}
            onPhotoChange={() => undefined}
          />
        </div>
      </section>

      <form
        onSubmit={(e) => void createProfile(e)}
        className="mt-5 space-y-3 rounded-2xl border border-[#e8ebf0] bg-white p-4"
      >
        <p className="text-[15px] font-semibold text-ink">{t("Add staff profile")}</p>
        <input
          required
          value={draft.name}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          placeholder={t("Name")}
          className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
        />
        <input
          required
          type="email"
          value={draft.email}
          onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
          placeholder={t("Email")}
          className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
        />
        <input
          value={draft.phone}
          onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
          placeholder={t("Phone")}
          className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
        />
        <select
          value={draft.role}
          onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value }))}
          className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
        >
          {ROLES.map((role) => (
            <option key={role.id} value={role.id}>
              {t(role.label)}
            </option>
          ))}
        </select>
        <button type="submit" className="h-11 rounded-xl bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white">
          {t("Add profile")}
        </button>
        {password ? (
          <p className="rounded-xl bg-[#f7f8fa] p-3 text-sm text-ink">
            {t("Temporary password")}: <span className="font-semibold">{password}</span>
          </p>
        ) : null}
      </form>

      {loading ? (
        <p className="mt-6 text-sm text-grey">{t("Loading…")}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((row) => {
            const edit = edits[row.id];
            if (!edit) return null;
            return (
              <li key={row.id} className="rounded-2xl border border-[#e8ebf0] bg-white p-4">
                <p className="text-[12px] text-grey">{row.email}</p>
                <div className="mt-2 space-y-2">
                  <input
                    value={edit.name}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [row.id]: { ...edit, name: e.target.value } }))
                    }
                    className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
                  />
                  <input
                    value={edit.phone}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [row.id]: { ...edit, phone: e.target.value } }))
                    }
                    placeholder={t("Phone")}
                    className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
                  />
                  <select
                    value={edit.role}
                    disabled={row.id === selfId}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [row.id]: { ...edit, role: e.target.value } }))
                    }
                    className="h-11 w-full rounded-xl border border-[#e4e8ee] px-3 text-sm"
                  >
                    {ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {t(role.label)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void save(row.id)}
                    className="h-9 rounded-xl bg-[var(--mvp-blue)] px-3 text-[12px] font-semibold text-white"
                  >
                    {t("Save")}
                  </button>
                  {row.id === selfId ? null : (
                    <button
                      type="button"
                      onClick={() => void remove(row.id)}
                      className="h-9 rounded-xl bg-[#f2f4f7] px-3 text-[12px] font-semibold text-ink"
                    >
                      {t("Delete")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
