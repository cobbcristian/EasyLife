"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, X } from "lucide-react";
import { ContentHeader, PageBody, PortalPageIntro } from "@/components/layout/content-header";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface AdminAccountRow {
  id: string;
  name: string;
  type: string;
  email: string;
}

const fieldClass =
  "h-[57px] w-full rounded-lg border border-border-2 bg-white px-4 text-[15px] text-ink placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

/** Figma Community Admin Accounts + Add Account Sheet (5539:6533, 5539:6577) and Super Admin Administration (5464:9289). */
export function CommunityAdminAccounts({
  currentUser,
  headerTitle = "Community Admin",
  headerRight = "avatar",
  eyebrow = "Club admin",
  description = "Club admins who can manage bookings, messages, and residents.",
}: {
  currentUser: { name: string; email: string };
  headerTitle?: string;
  headerRight?: "avatar" | "logo";
  eyebrow?: string;
  description?: string;
}) {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<AdminAccountRow[]>(() => {
    const name = currentUser.name.trim() || "Club Admin";
    const email = currentUser.email.trim() || "admin@club.local";
    return [{ id: "1", name, type: "Admin", email }];
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const canCreate = useMemo(
    () => firstName.trim() && email.trim().includes("@"),
    [firstName, email],
  );

  function resetSheet() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setEditingId(null);
    setSheetOpen(false);
  }

  function openCreate() {
    setEditingId(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setSheetOpen(true);
  }

  function saveAccount() {
    if (!canCreate) return;
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    const nextEmail = email.trim().toLowerCase();
    if (editingId) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === editingId ? { ...a, name, email: nextEmail } : a,
        ),
      );
    } else {
      setAccounts((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          name,
          type: "Admin",
          email: nextEmail,
        },
      ]);
    }
    resetSheet();
  }

  function removeAccount(id: string) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setMenuId(null);
  }

  return (
    <div className="font-[family-name:var(--font-poppins)]">
      <ContentHeader title={t(headerTitle)} right={headerRight} avatarName={currentUser.name} />
      <PageBody>
        <PortalPageIntro
          eyebrow={eyebrow}
          title="Accounts"
          description={description}
          action={
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-[var(--mvp-blue)]/10 px-4 text-sm font-semibold text-[var(--mvp-blue)]"
            >
              <Plus className="h-4 w-4" />
              {t("Create Account")}
            </button>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-black">
                <th className="px-5 py-3 font-semibold">{t("Name")}</th>
                <th className="px-5 py-3 font-semibold">{t("Type")}</th>
                <th className="px-5 py-3 font-semibold">{t("Email")}</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((row, index) => (
                <tr key={row.id} className={cn(index % 2 === 0 && "bg-[#f6f9fc]")}>
                  <td className="px-5 py-3.5 font-medium text-black">{row.name}</td>
                  <td className="px-5 py-3.5 text-[#262626]">{row.type}</td>
                  <td className="px-5 py-3.5 text-[#262626]">{row.email}</td>
                  <td className="relative px-3 py-3.5 text-black">
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-slate-100"
                      aria-label={t("Actions")}
                      aria-expanded={menuId === row.id}
                      onClick={() => setMenuId((cur) => (cur === row.id ? null : row.id))}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {menuId === row.id ? (
                      <div className="absolute right-3 top-10 z-20 w-40 overflow-hidden rounded-xl border border-border-2 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-slate-50"
                          onClick={() => {
                            const parts = row.name.split(/\s+/);
                            setEditingId(row.id);
                            setFirstName(parts[0] ?? "");
                            setLastName(parts.slice(1).join(" "));
                            setEmail(row.email);
                            setMenuId(null);
                            setSheetOpen(true);
                          }}
                        >
                          {t("Edit")}
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-[#c45c5c] hover:bg-slate-50"
                          onClick={() => removeAccount(row.id)}
                        >
                          {t("Remove")}
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-account-title"
            className="flex w-full max-w-[850px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="relative border-b border-border-2 px-6 py-5">
              <h2 id="add-account-title" className="text-center text-lg font-semibold text-black">
                {editingId ? t("Edit Account") : t("Add Account")}
              </h2>
              <button
                type="button"
                onClick={resetSheet}
                className="absolute right-5 top-5 rounded-md p-1 text-grey hover:bg-slate-100"
                aria-label={t("Close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-8 py-6">
              <h3 className="text-sm font-semibold text-black">{t("Account Details")}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className={fieldClass}
                  placeholder={t("First name")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  className={fieldClass}
                  placeholder={t("Last name")}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <input
                className={fieldClass}
                type="email"
                placeholder={t("Email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between border-t border-border-2 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  if (editingId) {
                    removeAccount(editingId);
                    resetSheet();
                    return;
                  }
                  resetSheet();
                }}
                className="h-[50px] px-4 text-base font-medium text-grey hover:text-ink"
              >
                {editingId ? t("Delete") : t("Cancel")}
              </button>
              <button
                type="button"
                disabled={!canCreate}
                onClick={saveAccount}
                className={cn(
                  "h-[50px] min-w-[200px] rounded-lg px-8 text-base font-semibold text-white",
                  canCreate ? "bg-[var(--mvp-blue)]" : "bg-[#e5e5ea]",
                )}
              >
                {editingId ? t("Save") : t("Create")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
