"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { useSessionProfile } from "@/lib/hooks/use-session-profile";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  communityId: string | null;
  communityName: string | null;
  status: "active" | "pending" | "frozen";
};

type CommunityOpt = { id: string; name: string };

const fieldClass =
  "h-11 w-full rounded-lg border border-border-2 bg-white px-3 text-sm text-ink";

export function UsersAdminClient({
  isSuperAdmin,
}: {
  isSuperAdmin: boolean;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const profile = useSessionProfile();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [communities, setCommunities] = useState<CommunityOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "member",
    password: "password",
    communityId: "",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users ?? []);
        setCommunities(data.communities ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const canCreate = useMemo(
    () =>
      form.name.trim().length > 0 &&
      form.email.includes("@") &&
      (form.role === "admin" || form.communityId || !isSuperAdmin),
    [form, isSuperAdmin],
  );

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password || "password",
        communityId:
          form.role === "admin" && !form.communityId
            ? null
            : form.communityId || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "warning", title: t("Could not add user"), description: data.error });
      return;
    }
    toast({ variant: "success", title: t("User added") });
    setShowForm(false);
    setForm({ name: "", email: "", role: "member", password: "password", communityId: "" });
    await load();
  }

  async function setStatus(id: string, status: "active" | "pending" | "frozen") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "warning", title: t("Update failed"), description: data.error });
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
      toast({
        variant: "success",
        title:
          status === "frozen"
            ? t("User frozen")
            : status === "pending"
              ? t("User set pending")
              : t("Member approved"),
      });
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(id: string, email: string) {
    if (!window.confirm(`${t("Delete user")} ${email}?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "warning", title: t("Delete failed"), description: data.error });
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({ variant: "success", title: t("User deleted") });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t("Users")} right="avatar" avatarName={profile.name} />
      <PageBody>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("Accounts")}</h2>
            <p className="mt-1 text-sm text-grey">
              {t("Add, freeze, or delete members, staff, and providers.")}
            </p>
          </div>
          <Button type="button" onClick={() => setShowForm((s) => !s)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {showForm ? t("Close") : t("Add user")}
          </Button>
        </div>

        {showForm ? (
          <form
            onSubmit={createUser}
            className="mb-8 grid gap-4 rounded-xl border border-border-2 bg-white p-5 sm:grid-cols-2"
          >
            <div>
              <Label htmlFor="name">{t("Name")}</Label>
              <Input
                id="name"
                className={fieldClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">{t("Email")}</Label>
              <Input
                id="email"
                type="email"
                className={fieldClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="role">{t("Role")}</Label>
              <Select
                id="role"
                className={fieldClass}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="member">{t("Member")}</option>
                <option value="board">{t("Board")}</option>
                <option value="pm">{t("Property manager")}</option>
                <option value="provider">{t("Provider")}</option>
                <option value="admin">{t("Admin")}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="password">{t("Temp password")}</Label>
              <Input
                id="password"
                className={fieldClass}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            {isSuperAdmin ? (
              <div className="sm:col-span-2">
                <Label htmlFor="community">{t("Community")}</Label>
                <Select
                  id="community"
                  className={fieldClass}
                  value={form.communityId}
                  onChange={(e) => setForm({ ...form, communityId: e.target.value })}
                >
                  <option value="">
                    {form.role === "admin"
                      ? t("Platform (super admin)")
                      : t("Select community")}
                  </option>
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div>
              <Button type="submit" disabled={!canCreate}>
                {t("Create account")}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-border-2 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-2 text-grey">
                <th className="px-4 py-3 font-medium">{t("Name")}</th>
                <th className="px-4 py-3 font-medium">{t("Email")}</th>
                <th className="px-4 py-3 font-medium">{t("Role")}</th>
                <th className="px-4 py-3 font-medium">{t("Community")}</th>
                <th className="px-4 py-3 font-medium">{t("Status")}</th>
                <th className="px-4 py-3 font-medium">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-grey">
                    {t("Loading…")}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="text-sm font-semibold text-ink">{t("No users yet.")}</p>
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="mt-3 inline-flex h-10 items-center rounded-lg bg-[var(--mvp-blue)] px-4 text-sm font-semibold text-white"
                    >
                      {t("Add user")}
                    </button>
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <tr
                    key={u.id}
                    className={cn("border-b border-border-2 last:border-0", i % 2 === 0 && "bg-[#f8fafb]")}
                  >
                    <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                    <td className="px-4 py-3 text-grey">{u.email}</td>
                    <td className="px-4 py-3 capitalize text-ink">{u.role}</td>
                    <td className="px-4 py-3 text-grey">
                      {u.communityName ?? t("Platform")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-semibold",
                          u.status === "frozen"
                            ? "bg-amber-100 text-amber-800"
                            : u.status === "pending"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-emerald-100 text-emerald-800",
                        )}
                      >
                        {u.status === "frozen"
                          ? t("Frozen")
                          : u.status === "pending"
                            ? t("Pending")
                            : t("Active")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {u.status === "pending" ? (
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => setStatus(u.id, "active")}
                            className="text-xs font-medium text-[var(--mvp-blue)] hover:underline disabled:opacity-50"
                          >
                            {t("Approve")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() =>
                              setStatus(u.id, u.status === "frozen" ? "active" : "frozen")
                            }
                            className="text-xs font-medium text-[var(--mvp-blue)] hover:underline disabled:opacity-50"
                          >
                            {u.status === "frozen" ? t("Unfreeze") : t("Freeze")}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() => removeUser(u.id, u.email)}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                        >
                          {t("Delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageBody>
    </div>
  );
}
