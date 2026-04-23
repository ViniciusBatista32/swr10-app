const TIMESTAMP_OF_2013 = 1356998400000;

// ─── Band Mode ──────────────────────────────────────────────────────────────

export enum BandMode {
  DAY = 0,
  NIGHT = 1,
  MEDIA = 2,
  FIRMWARE_UPDATE = 3,
}

const MODE_LABELS: Record<number, string> = {
  [BandMode.DAY]: "Day",
  [BandMode.NIGHT]: "Night",
  [BandMode.MEDIA]: "Media",
  [BandMode.FIRMWARE_UPDATE]: "Firmware Update",
};

export function parseBandMode(value: number): BandMode {
  if (value in MODE_LABELS) return value as BandMode;
  return BandMode.DAY;
}

export function bandModeLabel(mode: BandMode): string {
  return MODE_LABELS[mode] ?? "Unknown";
}

// ─── Time conversion ────────────────────────────────────────────────────────

export function bandSecondsToDate(seconds: number): Date {
  return new Date(TIMESTAMP_OF_2013 + seconds * 1000);
}

export function dateToBandSeconds(date: Date = new Date()): number {
  return Math.floor((date.getTime() - TIMESTAMP_OF_2013) / 1000);
}

// ─── Event types ────────────────────────────────────────────────────────────

export enum EventTypeCode {
  TAP = 0,
  BUTTON = 1,
  LIFE_BOOKMARK = 2,
  MODE_SWITCH = 3,
  HARDWARE_EVENT = 4,
  UPDATE_TIME = 5,
}

export type BandEvent = {
  type: string;
  event: string;
  timestamp: number;
};

export function parseEvent(bytes: Uint8Array): BandEvent {
  const PAYLOAD_SIZE = 4;
  let payload = 0;
  let offset = 0;

  if (bytes.length > PAYLOAD_SIZE) {
    payload = readUint32LE(bytes, 0);
    offset = PAYLOAD_SIZE;
  }

  const eventData = readUint32LE(bytes, offset);
  const code = (eventData >>> 24) & 0xff;
  const value = eventData & 0x00ffffff;

  if (code === EventTypeCode.LIFE_BOOKMARK) {
    const ts = TIMESTAMP_OF_2013 + payload * 1000;
    return { type: "LIFE_BOOKMARK", event: "LIFE_BOOKMARK", timestamp: ts };
  }

  if (code === EventTypeCode.TAP) {
    const tapNames = ["TAP_SINGLE", "TAP_DOUBLE", "TAP_TRIPLE"];
    return { type: "TAP", event: tapNames[value] ?? "TAP_UNKNOWN", timestamp: 0 };
  }

  if (code === EventTypeCode.BUTTON) {
    return { type: "BUTTON", event: "BUTTON", timestamp: 0 };
  }

  if (code === EventTypeCode.MODE_SWITCH) {
    const mode = parseBandMode(value);
    return { type: "MODE_SWITCH", event: `MODE_SWITCH_${bandModeLabel(mode).toUpperCase()}`, timestamp: 0 };
  }

  if (code === EventTypeCode.HARDWARE_EVENT) {
    const LOW_BATTERY_MASK = 0b00000010;
    const event = (value & LOW_BATTERY_MASK) > 0 ? "LOW_BATTERY" : "LOW_MEMORY";
    return { type: "HARDWARE_EVENT", event, timestamp: 0 };
  }

  if (code === EventTypeCode.UPDATE_TIME) {
    return { type: "UPDATE_TIME", event: "UPDATE_TIME", timestamp: 0 };
  }

  return { type: "UNKNOWN", event: `UNKNOWN_${code}_${value}`, timestamp: 0 };
}

// ─── Accelerometer ──────────────────────────────────────────────────────────

export type AccelData = { x: number; y: number; z: number };

export function parseAccelData(bytes: Uint8Array): AccelData {
  const raw = readUint32LE(bytes, 0);
  return {
    x: (raw >>> 20) & 0x3ff,
    y: (raw >>> 10) & 0x3ff,
    z: raw & 0x3ff,
  };
}

// ─── Alarm ──────────────────────────────────────────────────────────────────

export type AlarmDays = {
  sunday?: boolean;
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
};

export type AlarmConfig = {
  alarmId: number;
  hour: number;
  minute: number;
  smartWindow: number;
  days: AlarmDays;
};

export const ALARM_IDS = [0x01, 0x03, 0x05, 0x07, 0x09] as const;

const TIME_GROUPS: number[][] = [
  [21, 22, 23, 0],
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];

export function encodeDays(days: AlarmDays): number {
  let mask = 0;
  if (days.sunday) mask |= 1 << 0;
  if (days.monday) mask |= 1 << 1;
  if (days.tuesday) mask |= 1 << 2;
  if (days.wednesday) mask |= 1 << 3;
  if (days.thursday) mask |= 1 << 4;
  if (days.friday) mask |= 1 << 5;
  if (days.saturday) mask |= 1 << 6;
  return mask;
}

export function decodeDays(mask: number): AlarmDays {
  return {
    sunday: Boolean(mask & (1 << 0)),
    monday: Boolean(mask & (1 << 1)),
    tuesday: Boolean(mask & (1 << 2)),
    wednesday: Boolean(mask & (1 << 3)),
    thursday: Boolean(mask & (1 << 4)),
    friday: Boolean(mask & (1 << 5)),
    saturday: Boolean(mask & (1 << 6)),
  };
}

// ─── Shared time encode/decode ──────────────────────────────────────────────

export function encodeTime(hour: number, minute: number): { minutesByte: number; group: number } {
  const adjustedHour = (hour + 3) % 24;
  const group = Math.floor(adjustedHour / 4);
  const hourInGroup = adjustedHour % 4;
  const minutesByte = hourInGroup * 64 + minute;
  return { minutesByte, group };
}

export function decodeTime(minutesByte: number, group: number): { hour: number; minute: number } {
  const hourInGroup = Math.floor(minutesByte / 64);
  const minute = minutesByte % 64;
  const hour = TIME_GROUPS[group][hourInGroup];
  return { hour, minute };
}

// ─── Alarm encode/decode ────────────────────────────────────────────────────

export function encodeSmartWindow(minutes: number): number {
  return Math.floor(minutes / 5);
}

export function decodeSmartWindow(value: number): number {
  return value * 5;
}

export function encodeAlarm(config: AlarmConfig): Uint8Array {
  const { minutesByte, group } = encodeTime(config.hour, config.minute);
  const smart = encodeSmartWindow(config.smartWindow);
  const smartGroup = (smart << 4) | group;
  return new Uint8Array([
    encodeDays(config.days),
    minutesByte,
    smartGroup,
    config.alarmId & 0xff,
  ]);
}

export function decodeAlarm(data: Uint8Array): AlarmConfig {
  const minutesByte = data[1];
  const smartGroup = data[2];
  const group = smartGroup & 0x0f;
  const smart = (smartGroup >> 4) & 0x0f;
  const time = decodeTime(minutesByte, group);
  return {
    alarmId: data[3] & 0x0f,
    hour: time.hour,
    minute: time.minute,
    smartWindow: decodeSmartWindow(smart),
    days: decodeDays(data[0]),
  };
}

export function decodeAlarms(data: Uint8Array): AlarmConfig[] {
  if (data.length < 4) return [];
  if (data.length === 4 && data[0] === 0 && data[1] === 0 && data[2] === 0 && data[3] === 0) {
    return [];
  }
  const alarms: AlarmConfig[] = [];
  for (let i = 0; i + 3 < data.length; i += 4) {
    alarms.push(decodeAlarm(data.subarray(i, i + 4)));
  }
  return alarms;
}

export function encodeAlarms(configs: AlarmConfig[]): Uint8Array {
  if (configs.length === 0) {
    return new Uint8Array([0x00, 0x00, 0x00, 0x00]);
  }
  const sorted = [...configs].sort((a, b) => a.alarmId - b.alarmId);
  const result = new Uint8Array(sorted.length * 4);
  for (let i = 0; i < sorted.length; i++) {
    result.set(encodeAlarm(sorted[i]), i * 4);
  }
  return result;
}

// ─── Night Mode ─────────────────────────────────────────────────────────────

export type NightModeConfig = {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  enabled: boolean;
};

export function encodeNightMode(config: NightModeConfig): Uint8Array {
  const end = encodeTime(config.endHour, config.endMinute);
  const start = encodeTime(config.startHour, config.startMinute);

  const byte0 = end.minutesByte;
  const byte1 = ((start.minutesByte & 0x0f) << 4) | (end.group & 0x0f);
  const byte2 = ((start.group & 0x0f) << 4) | ((start.minutesByte >> 4) & 0x0f);
  const byte3 = config.enabled ? 1 : 0;

  return new Uint8Array([byte0, byte1, byte2, byte3]);
}

export function decodeNightMode(data: Uint8Array): NightModeConfig {
  const endMinutesByte = data[0];
  const byte1 = data[1];
  const byte2 = data[2];
  const byte3 = data[3];

  const endGroup = byte1 & 0x0f;
  const startMinutesByte = ((byte2 & 0x0f) << 4) | ((byte1 >> 4) & 0x0f);
  const startGroup = (byte2 >> 4) & 0x0f;
  const enabled = byte3 !== 0xfe;

  const endTime = decodeTime(endMinutesByte, endGroup);
  const startTime = decodeTime(startMinutesByte, startGroup);

  return {
    startHour: startTime.hour,
    startMinute: startTime.minute,
    endHour: endTime.hour,
    endMinute: endTime.minute,
    enabled,
  };
}

// ─── Vibration ──────────────────────────────────────────────────────────────

export function encodeVibration(count: number): Uint8Array {
  const vibByte = count <= 1 ? 0x80 : 0x80 + count;
  return new Uint8Array([
    0x00, 0x00, 0x19, vibByte,
    0x00, 0x00, 0xfc, 0xc0,
    0x00, 0x00, 0x00, 0x10,
    0x00, 0x00, 0x00, 0x20,
  ]);
}

export function encodeCallVibration(): Uint8Array {
  return new Uint8Array([
    0xe8, 0x83, 0x3e, 0xc0,
    0x00, 0x00, 0x8a, 0xc2,
    0x00, 0x00, 0x8a, 0xd2,
    0x00, 0x00, 0x8a, 0xe2,
  ]);
}

export function encodeNotificationClear(): Uint8Array {
  return new Uint8Array([
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x10,
    0x00, 0x00, 0x00, 0x20,
  ]);
}

// ─── Byte helpers ───────────────────────────────────────────────────────────

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export function readUint8(bytes: Uint8Array, offset: number): number {
  return bytes[offset];
}

export function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

export function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

export function writeUint8(value: number): Uint8Array {
  return new Uint8Array([value & 0xff]);
}

export function writeUint32LE(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  buf[0] = value & 0xff;
  buf[1] = (value >>> 8) & 0xff;
  buf[2] = (value >>> 16) & 0xff;
  buf[3] = (value >>> 24) & 0xff;
  return buf;
}

export function readStringFromBytes(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
}
