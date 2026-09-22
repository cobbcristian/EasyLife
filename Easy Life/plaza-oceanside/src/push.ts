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

export type PushRegisterResult = {
  ok: boolean;
  reason?:
    | "not_device"
    | "no_project"
    | "permission_denied"
    | "token_failed"
    | "server_failed"
    | "no_session";
};

async function postToken(
  sessionToken: string,
  action: "register" | "unregister",
  expoToken: string,
): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/mobile/push-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, token: expoToken }),
  });
  return res.ok;
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
): Promise<PushRegisterResult> {
  try {
    if (!sessionToken) return { ok: false, reason: "no_session" };
    if (!Device.isDevice) return { ok: false, reason: "not_device" };

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
    if (status !== "granted") return { ok: false, reason: "permission_denied" };

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as
      | string
      | undefined;
    if (!projectId) return { ok: false, reason: "no_project" };

    const expoToken = await getExpoToken();
    if (!expoToken) return { ok: false, reason: "token_failed" };

    const saved = await postToken(sessionToken, "register", expoToken);
    if (!saved) return { ok: false, reason: "server_failed" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "token_failed" };
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
