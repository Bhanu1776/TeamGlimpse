import type { NotificationPermissionState } from "@/types/domain";

export function getNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  const result = await Notification.requestPermission();
  return result as NotificationPermissionState;
}

// Placeholder — will wire to VAPID endpoint later
export async function subscribeToPush(): Promise<void> {
  console.log("[push] subscribe() called — no-op until backend is wired");
}

export async function unsubscribeFromPush(): Promise<void> {
  console.log("[push] unsubscribe() called — no-op until backend is wired");
}
