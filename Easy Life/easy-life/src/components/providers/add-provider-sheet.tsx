"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface AddProviderSheetProps {
  type: "service" | "activity";
  open: boolean;
  onClose: () => void;
  onCreate?: (data: {
    firstName: string;
    lastName: string;
    email: string;
    businessName: string;
  }) => void | Promise<unknown>;
}

const sheetFieldClass =
  "h-14 w-full rounded-lg border border-border-1 bg-white px-4 text-[15px] text-ink placeholder:text-grey-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mvp-blue)]";

export function AddProviderSheet({
  type,
  open,
  onClose,
  onCreate,
}: AddProviderSheetProps) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [inviteResult, setInviteResult] = useState<{
    otp: string;
    email: string;
    emailError: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const label = type === "service" ? "Service" : "Activity";
  const isValid = firstName && lastName && email && businessName;

  function resetAndClose() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setBusinessName("");
    setInviteResult(null);
    setCopied(false);
    onClose();
  }

  async function handleCreate() {
    if (!isValid) return;
    try {
      const result = await onCreate?.({
        firstName,
        lastName,
        email,
        businessName,
      });
      const emailSent =
        result && typeof result === "object" && "emailSent" in result
          ? Boolean((result as { emailSent?: boolean }).emailSent)
          : false;
      const otp =
        result && typeof result === "object" && "otp" in result
          ? String((result as { otp?: string }).otp ?? "")
          : "";
      const emailError =
        result && typeof result === "object" && "emailError" in result
          ? String((result as { emailError?: string }).emailError ?? "")
          : "";

      if (emailSent) {
        toast({
          variant: "success",
          title: `${label} provider invited`,
          description: `An invite email was sent to ${email}.`,
        });
        resetAndClose();
        return;
      }

      // No Resend / send failed — show OTP so the admin can share it manually.
      setInviteResult({ otp, email, emailError });
      toast({
        variant: "warning",
        title: "Email not configured",
        description:
          "RESEND_API_KEY is missing or send failed. Copy the OTP below and share it with the provider.",
      });
    } catch (e) {
      toast({
        variant: "warning",
        title: "Could not send invite",
        description: e instanceof Error ? e.message : "Try again",
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={resetAndClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <button
          type="button"
          onClick={resetAndClose}
          className="absolute right-5 top-5 rounded-md p-1 text-grey hover:bg-slate-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-center text-lg font-bold text-ink">
          {inviteResult ? "Invite created" : `Add ${label} Provider`}
        </h2>

        {inviteResult ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-grey">
              Email delivery is off until{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-ink">
                RESEND_API_KEY
              </code>{" "}
              is set. Share this one-time password with{" "}
              <span className="font-medium text-ink">{inviteResult.email}</span>{" "}
              so they can sign in and set a new password.
            </p>
            {inviteResult.emailError ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {inviteResult.emailError}
              </p>
            ) : null}
            {inviteResult.otp ? (
              <div className="rounded-xl border border-border-1 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-grey">
                  One-time password
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <code className="flex-1 font-mono text-xl font-bold text-ink">
                    {inviteResult.otp}
                  </code>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--mvp-blue)] px-3 py-2 text-sm font-medium text-white"
                    onClick={async () => {
                      await navigator.clipboard.writeText(inviteResult.otp);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-grey">
                Provider was saved, but no OTP was returned. Ask them to use
                Forgot Password, or retry after configuring Resend.
              </p>
            )}
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={resetAndClose}
                className="h-12 w-40 rounded-lg bg-[var(--mvp-blue)] text-base font-medium text-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <p className="text-sm font-bold text-ink">Invite Details</p>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={sheetFieldClass}
                  />
                  <input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={sheetFieldClass}
                  />
                </div>
                <input
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={sheetFieldClass}
                />
                <input
                  placeholder={`${label} Business Name`}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={sheetFieldClass}
                />
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between">
              <button
                type="button"
                onClick={resetAndClose}
                className="text-sm font-medium text-grey hover:text-danger"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!isValid}
                className="h-12 w-56 rounded-lg bg-[var(--mvp-blue)] text-base font-medium text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-grey-light"
              >
                Create
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
