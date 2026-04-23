import { NativeModules } from "react-native";

const { SWR10ForegroundModule } = NativeModules;

export function startForegroundService(): void {
  SWR10ForegroundModule?.startService();
}

export function stopForegroundService(): void {
  SWR10ForegroundModule?.stopService();
}
