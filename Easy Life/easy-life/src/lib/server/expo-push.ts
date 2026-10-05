import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "@/lib/server/prisma";

export function isExpoPushConfigured(): boolean {
  return true;
}

export async function saveExpoPushToken(userEmail: string, token: string) {
  if (!Expo.isExpoPushToken(token)) {
    throw new Error("Invalid Expo push token");
  }
  return prisma.expoPushToken.upsert({
    where: { token },
    create: { userEmail: userEmail.toLowerCase(), token },
    update: { userEmail: userEmail.toLowerCase() },
  });
}

export async function removeExpoPushToken(userEmail: string, token: string) {
  await prisma.expoPushToken.deleteMany({
    where: { userEmail: userEmail.toLowerCase(), token },
  });
}

export type ExpoPushDelivery = {
  sent: number;
  error?: string;
};

export async function sendExpoPushToUser(
  userEmail: string,
  payload: { title: string; body: string; url?: string },
): Promise<ExpoPushDelivery> {
  const rows = await prisma.expoPushToken.findMany({
    where: { userEmail: userEmail.toLowerCase() },
  });
  if (rows.length === 0) {
    return { sent: 0, error: "no_device" };
  }

  const expo = new Expo();
  const messages: ExpoPushMessage[] = rows
    .filter((row) => Expo.isExpoPushToken(row.token))
    .map((row) => ({
      to: row.token,
      title: payload.title,
      body: payload.body,
      data: { url: payload.url ?? "/member" },
      sound: "default",
      priority: "high",
      // "active" is the normal lock-screen alert. iOS mirrors it to a paired
      // Apple Watch. "time-sensitive" is dropped unless the app has that entitlement.
      interruptionLevel: "active",
    }));

  if (messages.length === 0) {
    return { sent: 0, error: "no_device" };
  }

  let sent = 0;
  let error: string | undefined;
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === "ok") {
          sent += 1;
          continue;
        }
        error = ticket.details?.error ?? "send_failed";
        const expired = ticket.details?.expoPushToken;
        if (ticket.details?.error === "DeviceNotRegistered" && expired) {
          await prisma.expoPushToken.deleteMany({ where: { token: expired } });
        }
      }
    } catch {
      error = "send_failed";
    }
  }
  return sent > 0 ? { sent } : { sent: 0, error: error ?? "send_failed" };
}
