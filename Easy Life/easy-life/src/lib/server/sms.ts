import { prisma } from "@/lib/server/prisma";

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

export async function sendSms(input: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, error: "SMS is not configured. Add TWILIO_* env vars." };
  }

  const to = input.to.replace(/\D/g, "").length >= 10 ? input.to : null;
  if (!to) return { ok: false, error: "Invalid phone number" };

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: input.body }),
      },
    );
    if (!res.ok) {
      return { ok: false, error: `Twilio returned ${res.status}` };
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
