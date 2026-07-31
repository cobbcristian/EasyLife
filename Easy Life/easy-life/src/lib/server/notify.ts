import { appPath } from "@/lib/server/app-url";

/** True when Resend can send transactional mail. Without this, invites surface OTP in-app. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function emailNotConfiguredMessage(): string {
  return "Email is not configured. Add RESEND_API_KEY and NOTIFY_FROM_EMAIL to send invites. Until then, share the OTP shown in the admin UI.";
}

interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export async function sendAdminWelcomeEmail(input: {
  to: string;
  adminName: string;
  communityName: string;
  tempPassword: string;
  inviteCode: string;
  loginUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const loginUrl = input.loginUrl ?? appPath("/login");
  const signupUrl = appPath("/signup");
  return sendEmail({
    to: input.to,
    subject: `Welcome — ${input.communityName} admin access`,
    body: [
      `Hi ${input.adminName},`,
      "",
      `Your club "${input.communityName}" is ready.`,
      "",
      "Admin login:",
      `  URL: ${loginUrl}`,
      `  Email: ${input.to}`,
      `  Temporary password: ${input.tempPassword}`,
      "",
      "Share this invite code with members (required to join):",
      `  ${input.inviteCode}`,
      "",
      `Member signup: ${signupUrl}`,
      "",
      "Please sign in and change your password after your first login.",
      "",
      `— ${input.communityName}`,
    ].join("\n"),
  });
}

/** Figma Email Copy (5752:9902) — Easy Life Business Invitation. */
export async function sendBusinessInvitationEmail(input: {
  to: string;
  firstName: string;
  communityName: string;
  otp: string;
  loginUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const loginUrl = input.loginUrl ?? appPath("/login");
  return sendEmail({
    to: input.to,
    subject: `${input.communityName} Business Invitation`,
    body: [
      `Hi ${input.firstName},`,
      "",
      `Congrats! You've been invited to ${input.communityName}. Setup your business account by following the steps listed below. If you have any questions, contact a ${input.communityName} representative.`,
      "",
      "Setting up your business account should only take a few minutes. We have provided you a One Time password below. Click the link below and enter your email and the One Time Password, you will then be asked to enter a new password - do not share your new password with anybody. Once you create a new password, go ahead and fill out the basic business info for account setup.",
      "",
      `Email: ${input.to}`,
      `One Time Password: ${input.otp}`,
      "",
      `Login: ${loginUrl}`,
      "",
      `We are excited to have you servicing the residents of ${input.communityName}!`,
      "",
      "Sincerely,",
      `${input.communityName} Team`,
      "",
      "This is an automated email, please do not reply.*",
    ].join("\n"),
  });
}

// Sends a transactional email via Resend if configured.
export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: emailNotConfiguredMessage() };
  }
  const from = process.env.NOTIFY_FROM_EMAIL?.trim();
  if (!from) {
    return { ok: false, error: "NOTIFY_FROM_EMAIL is not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.body,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Provider returned ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to reach email provider" };
  }
}
