"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}

export type PushSubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unsupported" | "not_configured" | "denied" | "failed";
    };

export async function ensurePushSubscription(): Promise<PushSubscribeResult> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  try {
    const cfg = await fetch("/api/push/subscribe").then((r) => r.json());
    if (!cfg.configured || !cfg.publicKey) {
      return { ok: false, reason: "not_configured" };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "denied" };
    }

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
      }));

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "subscribe", subscription: sub.toJSON() }),
    });
    if (!res.ok) return { ok: false, reason: "failed" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export function usePushNotifications(
  enabled: boolean,
  onResult?: (result: PushSubscribeResult) => void,
) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    ensurePushSubscription().then((result) => {
      if (!cancelled) onResult?.(result);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, onResult]);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
