import { DeviceEventEmitter, EmitterSubscription, NativeModules, PermissionsAndroid, Platform } from "react-native";

const { SWR10NotificationModule } = NativeModules;

export type PhoneNotification = {
  app: string;
  label?: string;
  title?: string;
  text?: string;
  time?: string;
  removed?: boolean;
};

export type CallState = "ringing" | "offhook" | "idle";

export type NotificationPermissionStatus = "authorized" | "denied" | "unknown";

export async function checkNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!SWR10NotificationModule) return "unknown";
  return SWR10NotificationModule.getPermissionStatus();
}

export function openNotificationPermissionSettings(): void {
  SWR10NotificationModule?.requestPermission();
}

export function subscribeToNotifications(
  handler: (notif: PhoneNotification) => void
): EmitterSubscription {
  return DeviceEventEmitter.addListener("SWR10Notification", (payload: string) => {
    try {
      const parsed: PhoneNotification = JSON.parse(payload);
      handler(parsed);
    } catch {}
  });
}

export async function requestPhoneStatePermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    {
      title: "Phone State Permission",
      message: "The app needs access to call state to vibrate the band.",
      buttonPositive: "Allow",
      buttonNegative: "Deny",
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export function startCallMonitor(): void {
  SWR10NotificationModule?.startCallMonitor();
}

export function stopCallMonitor(): void {
  SWR10NotificationModule?.stopCallMonitor();
}

export function subscribeToCallState(
  handler: (state: CallState) => void
): EmitterSubscription {
  return DeviceEventEmitter.addListener("SWR10CallState", (state: string) => {
    handler(state as CallState);
  });
}

export type SeenApp = {
  packageName: string;
  label: string;
};

export async function getSeenApps(): Promise<SeenApp[]> {
  if (!SWR10NotificationModule) return [];
  try {
    const json: string = await SWR10NotificationModule.getSeenApps();
    return JSON.parse(json);
  } catch {
    return [];
  }
}

