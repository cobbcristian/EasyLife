"use client";

import { useState } from "react";
import { ContentHeader, PageBody } from "@/components/layout/content-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ChangePhotoButton } from "@/components/account/change-photo-button";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

export function AccountClient({
  account,
  roleLabel,
}: {
  account: { name: string; email: string; avatarUrl?: string | null };
  roleLabel: string;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState(account.avatarUrl ?? undefined);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ variant: "warning", title: t("Password must be at least 6 characters") });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "warning", title: t("Passwords do not match") });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: "warning",
        title: t("Could not update password"),
        description: data.error ?? "",
      });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordForm(false);
    toast({ variant: "success", title: t("Password updated") });
  }

  return (
    <div>
      <ContentHeader title="Account" right="avatar" />
      <PageBody>
        <div className="max-w-2xl">
          <div className="flex items-center gap-4">
            <Avatar name={account.name} src={avatarUrl} size="lg" />
            <div>
              <p className="text-lg font-bold text-ink">{account.name}</p>
              <p className="text-sm text-grey">{account.email}</p>
            </div>
            <ChangePhotoButton
              className="ml-auto"
              onPhotoChange={(url) => setAvatarUrl(url)}
            />
          </div>

          <div className="mt-8 rounded-2xl border border-border-1 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="font-bold text-ink">{t("Account Details")}</h2>
            <form className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t("Account name")}</Label>
                <Input id="name" defaultValue={account.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("Email")}</Label>
                <Input id="email" type="email" defaultValue={account.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("Phone")}</Label>
                <Input id="phone" type="tel" defaultValue="(555) 100-2000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t("Role")}</Label>
                <Input id="role" defaultValue={t(roleLabel)} disabled />
              </div>
            </form>
          </div>

          <div className="mt-6 rounded-2xl border border-border-1 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="font-bold text-ink">{t("Security")}</h2>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">{t("Password")}</p>
                <p className="text-xs text-grey">{t("Last changed 3 months ago")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordForm((open) => !open)}
              >
                {showPasswordForm ? t("Cancel") : t("Change password")}
              </Button>
            </div>

            {showPasswordForm ? (
              <form className="mt-5 space-y-4 border-t border-border-2 pt-5" onSubmit={changePassword}>
                <div className="space-y-2">
                  <Label htmlFor="current-password">{t("Current password")}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t("New password")}</Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">{t("Confirm password")}</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={busy}>
                  {busy ? t("Saving...") : t("Update password")}
                </Button>
              </form>
            ) : null}
          </div>

          <div className="mt-6 flex gap-3">
            <Button>{t("Save changes")}</Button>
            <Button variant="outline">{t("Cancel")}</Button>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
