"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-[57px] w-full rounded-lg border border-[#bfbfbf] bg-white px-4 pr-12 text-[15px] text-black placeholder:text-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

/** Figma Password Change (4934:4735 / 4934:4768). */
export default function MemberPasswordChangePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasNumber = /\d/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const valid =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    hasNumber &&
    hasSymbol &&
    newPassword === confirmPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
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
    toast({ variant: "success", title: t("Password updated") });
    router.push("/member/profile");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-[family-name:var(--font-poppins)]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
        <header className="flex items-center gap-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            href="/member/profile"
            className="flex h-10 w-10 items-center justify-center text-[var(--mvp-blue)]"
            aria-label={t("Back")}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.25} />
          </Link>
          <h1 className="flex-1 text-center text-[17px] font-semibold text-black">
            {t("Change Password")}
          </h1>
          <span className="w-10" aria-hidden />
        </header>

        <form onSubmit={submit} className="flex flex-1 flex-col">
          <div className="space-y-4">
            <PasswordField
              placeholder={t("Current Password")}
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
              autoComplete="current-password"
            />
            <div>
              <PasswordField
                placeholder={t("New Password")}
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                autoComplete="new-password"
              />
              <p className="mt-2 text-xs text-grey">
                {t("6 character minimum, includes number, includes symbol")}
              </p>
            </div>
            <PasswordField
              placeholder={t("Confirm New Password")}
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={!valid || busy}
            className={cn(
              "mt-auto h-[50px] w-full rounded-lg text-base font-semibold",
              valid
                ? "bg-[var(--mvp-blue)] text-white"
                : "bg-[#e5e5ea] text-white",
            )}
          >
            {busy ? t("Saving…") : t("Change Password")}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({
  placeholder,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={fieldClass}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-grey"
        aria-label={show ? t("Hide password") : t("Show password")}
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
