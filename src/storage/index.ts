import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  SETTINGS: "@swr10/settings",
  ALARM_NAMES: "@swr10/alarm_names",
  LANGUAGE: "@swr10/language",
  NOTIF_APPS: "@swr10/notif_apps",
  NOTIF_APP_LABELS: "@swr10/notif_app_labels",
  DEVICE_ID: "@swr10/device_id",
} as const;

export type PersistedSettings = {
  nightModeEnabled: boolean;
  nightStartHour: number;
  nightStartMinute: number;
  nightEndHour: number;
  nightEndMinute: number;
  notificationsEnabled: boolean;
  vibrationCount: number;
  outOfRangeEnabled: boolean;
  incomingCallEnabled: boolean;
  doubleClickAction: string;
  activeAppId: string;
};

export const DEFAULT_SETTINGS: PersistedSettings = {
  nightModeEnabled: false,
  nightStartHour: 22,
  nightStartMinute: 0,
  nightEndHour: 7,
  nightEndMinute: 0,
  notificationsEnabled: true,
  vibrationCount: 1,
  outOfRangeEnabled: false,
  incomingCallEnabled: true,
  doubleClickAction: "swap_app",
  activeAppId: "music_control",
};

export async function loadSettings(): Promise<PersistedSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function loadAlarmNames(): Promise<Record<number, string>> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ALARM_NAMES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export async function saveAlarmNames(names: Record<number, string>): Promise<void> {
  await AsyncStorage.setItem(KEYS.ALARM_NAMES, JSON.stringify(names));
}

export async function loadLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.LANGUAGE);
  } catch {}
  return null;
}

export async function saveLanguage(lang: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.LANGUAGE, lang);
}

export async function loadNotifApps(): Promise<Record<string, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.NOTIF_APPS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export async function saveNotifApps(apps: Record<string, boolean>): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTIF_APPS, JSON.stringify(apps));
}

export async function loadNotifAppLabels(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.NOTIF_APP_LABELS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export async function saveNotifAppLabels(labels: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTIF_APP_LABELS, JSON.stringify(labels));
}

export async function saveDeviceId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.DEVICE_ID, id);
}

export async function loadDeviceId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.DEVICE_ID);
  } catch {}
  return null;
}

export async function clearDeviceId(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.DEVICE_ID);
}
