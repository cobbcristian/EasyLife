"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

/**
 * Optional authenticator MFA — enable/disable from account settings.
 */
export default function MemberSecurityPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  async function refresh() {
    const res = await fetch("/api/auth/mfa/status");
    if (res.ok) {
      const data = (await res.json()) as { mfaEnabled?: boolean };
      setMfaEnabled(Boolean(data.mfaEnabled));
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function startSetup() {
    setBusy(true);
    setRecoveryCodes(null);
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        setupToken?: string;
        qrDataUrl?: string;
        secret?: string;
      };
      if (!res.ok) {
        toast({
          variant: "warning",
          title: data.error ?? t("Could not start setup"),
        });
        return;
      }
      setSetupToken(data.setupToken ?? null);
      setQrDataUrl(data.qrDataUrl ?? null);
      setSecret(data.secret ?? null);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!setupToken || !code.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/mfa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken, code: code.trim() }),
      });
      const data = (await res.json()) as {
        error?: string;
        recoveryCodes?: string[];
      };
      if (!res.ok) {
        toast({
          variant: "warning",
          title: data.error ?? t("Invalid code"),
        });
        return;
      }
      setRecoveryCodes(data.recoveryCodes ?? []);
      setSetupToken(null);
      setQrDataUrl(null);
      setSecret(null);
      setMfaEnabled(true);
      toast({ variant: "success", title: t("Two-factor authentication on") });
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({
          variant: "warning",
          title: data.error ?? t("Could not disable"),
        });
        return;
      }
      setMfaEnabled(false);
      setDisablePassword("");
      setDisableCode("");
      setRecoveryCodes(null);
      toast({ variant: "success", title: t("Two-factor authentication off") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-[family-name:var(--font-poppins)]">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10">
        <header className="flex items-center gap-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            href="/member/profile"
            className="flex h-10 w-10 items-center justify-center text-[var(--mvp-blue)]"
            aria-label={t("Back")}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.25} />
          </Link>
          <h1 className="flex-1 text-center text-[17px] font-semibold text-black">
            {t("Security")}
          </h1>
          <span className="w-10" aria-hidden />
        </header>

        {loading ? (
          <p className="text-sm text-grey">{t("Loading…")}</p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#e8ebf0] bg-[#fafbfc] p-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-[var(--mvp-blue)]" />
                <div>
                  <p className="text-[15px] font-semibold text-ink">
                    {t("Authenticator app")}
                  </p>
                  <p className="mt-1 text-sm text-grey">
                    {mfaEnabled
                      ? t(
                          "Two-factor authentication is on. You’ll enter a code after your password when signing in.",
                        )
                      : t(
                          "Optional. Use Google Authenticator, Authy, or 1Password after your password.",
                        )}
                  </p>
                </div>
              </div>
            </div>

            {recoveryCodes ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-ink">
                  {t("Save these recovery codes")}
                </p>
                <p className="mt-1 text-xs text-grey">
                  {t(
                    "Each code works once if you lose your authenticator. Store them offline.",
                  )}
                </p>
                <ul className="mt-3 space-y-1 font-mono text-sm text-ink">
                  {recoveryCodes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!mfaEnabled && !setupToken ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void startSetup()}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-60"
              >
                {t("Turn on two-factor authentication")}
              </button>
            ) : null}

            {setupToken ? (
              <form onSubmit={confirmSetup} className="space-y-4">
                <p className="text-sm text-grey">
                  {t("Scan this QR code in your authenticator app, then enter the 6-digit code.")}
                </p>
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt=""
                    className="mx-auto h-[220px] w-[220px] rounded-xl border border-[#e8ebf0] bg-white p-2"
                  />
                ) : null}
                {secret ? (
                  <p className="break-all text-center font-mono text-xs text-grey">
                    {secret}
                  </p>
                ) : null}
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={t("6-digit code")}
                  className="h-12 w-full rounded-lg border border-[#bfbfbf] px-4 text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={busy || code.trim().length < 6}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--mvp-blue)] text-sm font-semibold text-white disabled:opacity-60"
                >
                  {t("Confirm and enable")}
                </button>
                <button
                  type="button"
                  className="w-full text-sm text-grey"
                  onClick={() => {
                    setSetupToken(null);
                    setQrDataUrl(null);
                    setSecret(null);
                  }}
                >
                  {t("Cancel")}
                </button>
              </form>
            ) : null}

            {mfaEnabled ? (
              <form onSubmit={disableMfa} className="space-y-3 border-t border-[#eceff3] pt-6">
                <p className="text-sm font-semibold text-ink">
                  {t("Turn off two-factor authentication")}
                </p>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder={t("Current password")}
                  className="h-12 w-full rounded-lg border border-[#bfbfbf] px-4 text-sm"
                  required
                />
                <input
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder={t("Authenticator or recovery code")}
                  className="h-12 w-full rounded-lg border border-[#bfbfbf] px-4 text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-600 disabled:opacity-60"
                >
                  {t("Disable MFA")}
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
