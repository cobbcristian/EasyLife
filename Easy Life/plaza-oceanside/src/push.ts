import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { API_BASE_URL } from "./config";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function postToken(
  sessionToken: string,
  action: "register" | "unregister",
  expoToken: string,
): Promise<void> {
  await fetch(`${API_BASE_URL}/api/mobile/push-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, token: expoToken }),
  });
}

async function getExpoToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;
  if (!projectId) return null;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function ensurePushRegistered(
  sessionToken: string,
  opts?: { request?: boolean },
): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Plaza alerts",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted" && opts?.request) {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") return false;

    const expoToken = await getExpoToken();
    if (!expoToken) return false;
    await postToken(sessionToken, "register", expoToken);
    return true;
  } catch {
    return false;
  }
}

export async function unregisterPush(sessionToken: string): Promise<void> {
  try {
    const expoToken = await getExpoToken();
    if (!expoToken) return;
    await postToken(sessionToken, "unregister", expoToken);
  } catch {
    /* ignore */
  }
}
