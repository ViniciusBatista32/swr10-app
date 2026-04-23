import { Subscription } from "react-native-ble-plx";
import {
  getConnectedDevice,
  monitorCharacteristic,
  writeCharacteristic,
} from "../bleManager";
import * as C from "./constants";
import {
  AccelData,
  AlarmConfig,
  BandEvent,
  BandMode,
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  dateToBandSeconds,
  decodeAlarms,
  decodeNightMode,
  encodeAlarms,
  encodeNightMode,
  encodeVibration,
  encodeCallVibration,
  encodeNotificationClear,
  type NightModeConfig,
  parseBandMode,
  parseAccelData,
  parseEvent,
  readStringFromBytes,
  readUint8,
  readUint16LE,
  readUint32LE,
  writeUint8,
  writeUint32LE,
  bandSecondsToDate,
} from "./protocol";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Read helpers ───────────────────────────────────────────────────────────

async function readChar(serviceUUID: string, charUUID: string): Promise<Uint8Array> {
  const device = getConnectedDevice();
  if (!device) throw new Error("Device not connected");

  const char = await device.readCharacteristicForService(serviceUUID, charUUID);
  if (!char.value) throw new Error("Read returned empty");
  return base64ToBytes(char.value);
}

async function readString(serviceUUID: string, charUUID: string): Promise<string> {
  const bytes = await readChar(serviceUUID, charUUID);
  return readStringFromBytes(bytes);
}

// ─── Device Information ─────────────────────────────────────────────────────

export async function readBatteryLevel(): Promise<number> {
  const bytes = await readChar(C.BATTERY_SERVICE, C.BATTERY_LEVEL);
  return readUint8(bytes, 0);
}

export async function readFirmwareRevision(): Promise<string> {
  return readString(C.DEVICE_INFO_SERVICE, C.FIRMWARE_REVISION);
}

export async function readDeviceName(): Promise<string> {
  return readString(C.GA_SERVICE, C.GA_DEVICE_NAME);
}

// ─── AH Service (main) ─────────────────────────────────────────────────────

export async function readMode(): Promise<BandMode> {
  const bytes = await readChar(C.AH_SERVICE, C.AH_MODE);
  return parseBandMode(readUint8(bytes, 0));
}

export async function readCurrentTime(): Promise<{ bandSeconds: number; date: Date; deltaMs: number }> {
  const bytes = await readChar(C.AH_SERVICE, C.AH_CURRENT_TIME);
  const bandSeconds = readUint32LE(bytes, 0);
  const deviceDate = bandSecondsToDate(bandSeconds);
  const deltaMs = deviceDate.getTime() - Date.now();
  return { bandSeconds, date: deviceDate, deltaMs };
}

// ─── Write commands ─────────────────────────────────────────────────────────

export async function setMode(mode: BandMode): Promise<void> {
  const data = writeUint8(mode);
  await writeCharacteristic(C.AH_SERVICE, C.AH_MODE, bytesToBase64(data));
}

export async function syncTime(): Promise<void> {
  const bandSeconds = dateToBandSeconds(new Date());
  const data = writeUint32LE(bandSeconds);
  await writeCharacteristic(C.AH_SERVICE, C.AH_CURRENT_TIME, bytesToBase64(data));
}

export async function readAlarms(): Promise<{ configs: AlarmConfig[]; rawHex: string }> {
  const bytes = await readChar(C.AH_SERVICE, C.AH_ALARM);
  return { configs: decodeAlarms(bytes), rawHex: bytesToHex(bytes) };
}

export async function writeAlarms(configs: AlarmConfig[]): Promise<AlarmConfig[]> {
  await syncTime();
  await sleep(300);

  const data = encodeAlarms(configs);
  await writeCharacteristic(C.AH_SERVICE, C.AH_ALARM, bytesToBase64(data));

  await sleep(200);

  const { configs: confirmed } = await readAlarms();
  return confirmed;
}

// ─── Night Mode ─────────────────────────────────────────────────────────────

export async function readNightMode(): Promise<NightModeConfig> {
  const bytes = await readChar(C.AH_SERVICE, C.AH_AUTO_NIGHT_MODE);
  return decodeNightMode(bytes);
}

export async function writeNightMode(config: NightModeConfig): Promise<void> {
  const data = encodeNightMode(config);
  await writeCharacteristic(C.AH_SERVICE, C.AH_AUTO_NIGHT_MODE, bytesToBase64(data));
}

// ─── Link Loss ──────────────────────────────────────────────────────────────

export async function setLinkLossAlert(enabled: boolean): Promise<void> {
  const level = enabled ? 0x02 : 0x00;
  const data = writeUint8(level);
  await writeCharacteristic(C.LINK_LOSS_SERVICE, C.ALERT_LEVEL, bytesToBase64(data));
}

// ─── Vibration ──────────────────────────────────────────────────────────────

export async function sendVibration(count: number): Promise<void> {
  const data = encodeVibration(count);
  await writeCharacteristic(C.AH_SERVICE, C.AH_NOTIFICATION, bytesToBase64(data));
}

export async function sendCallVibration(): Promise<void> {
  const data = encodeCallVibration();
  await writeCharacteristic(C.AH_SERVICE, C.AH_NOTIFICATION, bytesToBase64(data));
}

export async function sendNotificationClear(): Promise<void> {
  const data = encodeNotificationClear();
  await writeCharacteristic(C.AH_SERVICE, C.AH_NOTIFICATION, bytesToBase64(data));
}

// ─── Monitors ───────────────────────────────────────────────────────────────

export function monitorEvents(onEvent: (event: BandEvent) => void): Subscription {
  return monitorCharacteristic(C.AH_SERVICE, C.AH_EVENT, (b64) => {
    if (!b64) return;
    const bytes = base64ToBytes(b64);
    onEvent(parseEvent(bytes));
  });
}

// ─── Batch read ─────────────────────────────────────────────────────────────

export type DeviceInfo = {
  batteryLevel: number;
  firmwareRevision: string;
  deviceName: string;
  mode: BandMode;
};

export async function readAllDeviceInfo(): Promise<DeviceInfo> {
  const [batteryLevel, firmwareRevision, deviceName, mode] = await Promise.all([
    readBatteryLevel(),
    readFirmwareRevision(),
    readDeviceName(),
    readMode(),
  ]);

  return { batteryLevel, firmwareRevision, deviceName, mode };
}
