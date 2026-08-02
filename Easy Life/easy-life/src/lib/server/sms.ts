import { prisma } from "@/lib/server/prisma";

/**
 * Twilio SMS auth:
 * - Prefer API Key SID + Secret (SK… / secret) — username is the key SID
 * - Or Account Auth Token — username is the Account SID
 * URL path always uses TWILIO_ACCOUNT_SID.
 */
function twilioAuth(): {
  accountSid: string;
  username: string;
  password: string;
  from: string;
} | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!accountSid || !from) return null;

  const keySid = process.env.TWILIO_API_KEY_SID?.trim();
  const keySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
  if (keySid && keySecret) {
    return { accountSid, username: keySid, password: keySecret, from };
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (authToken) {
    return { accountSid, username: accountSid, password: authToken, from };
  }

  return null;
}

export function isSmsConfigured(): boolean {
  return twilioAuth() !== null;
}

export async function sendSms(input: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const authCfg = twilioAuth();
  if (!authCfg) {
    return {
      ok: false,
      error:
        "SMS is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_FROM_NUMBER, and either TWILIO_API_KEY_SID+TWILIO_API_KEY_SECRET or TWILIO_AUTH_TOKEN.",
    };
  }

  const digits = input.to.replace(/\D/g, "");
  const to =
    digits.length === 10
      ? `+1${digits}`
      : digits.length >= 11 && input.to.trim().startsWith("+")
        ? input.to.trim()
        : digits.length >= 11
          ? `+${digits}`
          : null;
  if (!to) return { ok: false, error: "Invalid phone number" };

  try {
    const auth = Buffer.from(
      `${authCfg.username}:${authCfg.password}`,
    ).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${authCfg.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: authCfg.from,
          Body: input.body,
        }),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Twilio returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to reach Twilio" };
  }
}

export async function memberPhone(email: string): Promise<string | null> {
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email.toLowerCase() },
    select: { phone: true, commsSms: true },
  });
  if (!profile?.commsSms || !profile.phone?.trim()) return null;
  return profile.phone.trim();
}
