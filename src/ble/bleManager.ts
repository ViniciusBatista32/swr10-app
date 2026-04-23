import { PermissionsAndroid, Platform } from "react-native";
import { BleError, BleManager, Device, Subscription } from "react-native-ble-plx";

let _manager: BleManager | null = null;

function getManager(): BleManager {
  if (!_manager) {
    _manager = new BleManager();
  }
  return _manager;
}

export async function requestPermissions() {
  if (Platform.OS === "android") {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
  }
}

export function stopScan() {
  getManager().stopDeviceScan();
}

export function scanForDevices(onFound: (device: Device) => void) {
  const manager = getManager();
  const seen = new Set<string>();

  manager.startDeviceScan(null, { allowDuplicates: false }, (error: BleError | null, device: Device | null) => {
    if (error) {
      console.warn("BLE scan error:", error);
      return;
    }

    if (device && !seen.has(device.id)) {
      seen.add(device.id);
      onFound(device);
    }
  });
}

// ─── Device store ──────────────────────────────────────────────────────────────

let _pendingDevice: Device | null = null;
let _connectedDevice: Device | null = null;

export function setPendingDevice(device: Device) {
  _pendingDevice = device;
}

export function getPendingDevice(): Device | null {
  return _pendingDevice;
}

export function getConnectedDevice(): Device | null {
  return _connectedDevice;
}

export function setConnectedDevice(device: Device | null) {
  _connectedDevice = device;
}

// ─── Connection ────────────────────────────────────────────────────────────────

export async function connectAndDiscover(): Promise<void> {
  if (!_pendingDevice) throw new Error("No device selected");

  const connected = await _pendingDevice.connect({ autoConnect: true });
  const discovered = await connected.discoverAllServicesAndCharacteristics();
  _connectedDevice = discovered;
}

export async function disconnectDevice(): Promise<void> {
  if (_connectedDevice) {
    await _connectedDevice.cancelConnection();
    _connectedDevice = null;
  }
}

export function onDeviceDisconnected(callback: () => void): Subscription | null {
  if (!_connectedDevice) return null;
  return _connectedDevice.onDisconnected(() => {
    _connectedDevice = null;
    callback();
  });
}

export async function checkConnected(): Promise<boolean> {
  if (!_connectedDevice) return false;
  try {
    return await _connectedDevice.isConnected();
  } catch {
    return false;
  }
}

export function getDeviceId(): string | null {
  return _connectedDevice?.id ?? _pendingDevice?.id ?? null;
}

export async function reconnectById(deviceId: string): Promise<void> {
  const manager = getManager();
  const device = await manager.connectToDevice(deviceId, { autoConnect: true });
  const discovered = await device.discoverAllServicesAndCharacteristics();
  _connectedDevice = discovered;
  _pendingDevice = discovered;
}

// ─── Monitor ───────────────────────────────────────────────────────────────────

export function monitorCharacteristic(
  serviceUUID: string,
  charUUID: string,
  onData: (value: string | null) => void
): Subscription {
  if (!_connectedDevice) throw new Error("No device connected");

  return _connectedDevice.monitorCharacteristicForService(
    serviceUUID,
    charUUID,
    (error, char) => {
      if (error) {
        console.warn("Monitor error:", error);
        return;
      }
      onData(char?.value ?? null);
    }
  );
}

// ─── Write ─────────────────────────────────────────────────────────────────────

export async function writeCharacteristic(
  serviceUUID: string,
  charUUID: string,
  base64Value: string
): Promise<void> {
  if (!_connectedDevice) throw new Error("No device connected");

  await _connectedDevice.writeCharacteristicWithResponseForService(
    serviceUUID,
    charUUID,
    base64Value
  );
}
