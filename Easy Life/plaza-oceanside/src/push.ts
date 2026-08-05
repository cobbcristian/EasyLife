import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { API_BASE_URL } from "./config";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function projectId(): string | undefined {
  const eas = Constants.easConfig?.projectId;
  const extra = (
    Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  )?.eas?.projectId;
  return eas ?? extra;
}

/** Ask for permission and return an Expo push token, or null if unavailable. */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const id = projectId();
  const token = await Notifications.getExpoPushTokenAsync(
    id ? { projectId: id } : undefined,
  );
  return token.data;
}

export async function registerPushTokenWithServer(
  sessionToken: string,
  pushToken: string,
): Promise<void> {
  await fetch(`${API_BASE_URL}/api/mobile/push-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ action: "register", token: pushToken }),
  }).catch(() => {
    /* best-effort */
  });
}

/** Permission + register; safe to call whenever a session becomes ready. */
export async function ensurePushRegistered(
  sessionToken: string,
): Promise<void> {
  try {
    const pushToken = await getExpoPushToken();
    if (!pushToken) return;
    await registerPushTokenWithServer(sessionToken, pushToken);
  } catch {
    /* ignore — push is optional */
  }
}
