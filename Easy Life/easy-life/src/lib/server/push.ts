import webpush from "web-push";
import { sendExpoPushToUser } from "@/lib/server/expo-push";
import { prisma } from "@/lib/server/prisma";

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function configureVapid() {
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

export async function savePushSubscription(
  userEmail: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  return prisma.pushSubscription.upsert({
    where: {
      userEmail_endpoint: { userEmail: userEmail.toLowerCase(), endpoint: sub.endpoint },
    },
    create: {
      userEmail: userEmail.toLowerCase(),
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    update: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
  });
}

export async function removePushSubscription(userEmail: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({
    where: { userEmail: userEmail.toLowerCase(), endpoint },
  });
}

export async function sendPushToUser(
  userEmail: string,
  payload: { title: string; body: string; url?: string },
): Promise<number> {
  const email = userEmail.toLowerCase();
  const profile = await prisma.memberProfileExt.findUnique({
    where: { userEmail: email },
    select: { commsPush: true },
  });

  let sent = 0;
  // Web push only when the member opted in from profile.
  if (!profile || profile.commsPush) {
    sent += await sendWebPushToUser(email, payload);
  }
  // Native Expo tokens already require iOS/Android permission — deliver those
  // even if the in-app toggle was never flipped (common App Store install path).
  sent += await sendExpoPushToUser(email, payload);
  return sent;
}

async function sendWebPushToUser(
  userEmail: string,
  payload: { title: string; body: string; url?: string },
): Promise<number> {
  if (!configureVapid()) return 0;

  const subs = await prisma.pushSubscription.findMany({
    where: { userEmail: userEmail.toLowerCase() },
  });

  let sent = 0;
  const data = JSON.stringify(payload);

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        data,
      );
      sent++;
    } catch {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    }
  }
  return sent;
}
