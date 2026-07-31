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

export async function sendExpoPushToUser(
  userEmail: string,
  payload: { title: string; body: string; url?: string },
): Promise<number> {
  const rows = await prisma.expoPushToken.findMany({
    where: { userEmail: userEmail.toLowerCase() },
  });
  if (rows.length === 0) return 0;

  const expo = new Expo();
  const messages: ExpoPushMessage[] = rows
    .filter((row) => Expo.isExpoPushToken(row.token))
    .map((row) => ({
      to: row.token,
      title: payload.title,
      body: payload.body,
      data: { url: payload.url ?? "/member" },
      sound: "default",
    }));

  if (messages.length === 0) return 0;

  let sent = 0;
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      sent += tickets.filter((ticket) => ticket.status === "ok").length;
    } catch {
      /* skip failed chunk */
    }
  }
  return sent;
}
