import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  connectAndDiscover,
  disconnectDevice,
  onDeviceDisconnected,
  setPendingDevice,
  checkConnected,
  getDeviceId,
  reconnectById,
} from "@/src/ble/bleManager";
import {
  type DeviceInfo,
  monitorEvents,
  readAllDeviceInfo,
  readMode,
  sendCallVibration,
  sendNotificationClear,
  sendVibration,
  syncTime,
} from "@/src/ble/swr10/band";
import { type BandEvent } from "@/src/ble/swr10/protocol";
import {
  requestPhoneStatePermission,
  startCallMonitor,
  stopCallMonitor,
  subscribeToCallState,
  subscribeToNotifications,
  type PhoneNotification,
} from "@/src/notifications";
import { togglePlayPause, nextTrack, previousTrack } from "@/src/media";
import { startForegroundService, stopForegroundService } from "@/src/services/foreground";
import { useSettings } from "./SettingsContext";
import { saveDeviceId, loadDeviceId, clearDeviceId } from "@/src/storage";
import type { Device } from "react-native-ble-plx";

type ConnectionState = "disconnected" | "connecting" | "connected";

type BandContextType = {
  state: ConnectionState;
  deviceInfo: DeviceInfo | null;
  connect: (device: Device) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshInfo: () => Promise<void>;
  lastEvent: BandEvent | null;
  isAutoReconnecting: boolean;
};

const BandContext = createContext<BandContextType>({
  state: "disconnected",
  deviceInfo: null,
  connect: async () => {},
  disconnect: async () => {},
  refreshInfo: async () => {},
  lastEvent: null,
  isAutoReconnecting: false,
});

// ─── Module-level state (survives component remounts) ─────────────────────────

let _listenersActive = false;
let _moduleSubs: { remove(): void }[] = [];
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _reconnecting = false;
let _activeNotifCount = 0;

function _clearReconnectTimer() {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
}

function _removeAllSubs() {
  _moduleSubs.forEach((s) => s.remove());
  _moduleSubs = [];
  _listenersActive = false;
  _activeNotifCount = 0;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BandProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [lastEvent, setLastEvent] = useState<BandEvent | null>(null);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  const { settings, notifApps } = useSettings();

  const settingsRef = useRef(settings);
  const notifAppsRef = useRef(notifApps);
  const stateRef = useRef(state);
  settingsRef.current = settings;
  notifAppsRef.current = notifApps;
  stateRef.current = state;

  const refreshInfo = useCallback(async () => {
    try {
      const info = await readAllDeviceInfo();
      setDeviceInfo(info);
    } catch {}
  }, []);

  const setupListeners = useCallback(() => {
    if (_listenersActive) return;
    _removeAllSubs();

    const eventSub = monitorEvents((event: BandEvent) => {
      setLastEvent(event);

      const s = settingsRef.current;
      if (event.type === "TAP" && s.activeAppId === "music_control") {
        if (event.event === "TAP_SINGLE") togglePlayPause();
        else if (event.event === "TAP_DOUBLE") nextTrack();
        else if (event.event === "TAP_TRIPLE") previousTrack();
      }

      if (event.type === "MODE_SWITCH") {
        readMode().then((mode) =>
          setDeviceInfo((prev) => (prev ? { ...prev, mode } : prev))
        );
      }
    });
    _moduleSubs.push(eventSub);

    const notifSub = subscribeToNotifications((notif: PhoneNotification) => {
      const s = settingsRef.current;
      const apps = notifAppsRef.current;
      if (!s.notificationsEnabled) return;
      if (apps[notif.app] === false) return;

      if (notif.removed) {
        _activeNotifCount = Math.max(0, _activeNotifCount - 1);
        if (_activeNotifCount === 0) {
          sendNotificationClear().catch(() => {});
        }
      } else {
        _activeNotifCount++;
        sendVibration(1).catch(() => {});
      }
    });
    _moduleSubs.push(notifSub);

    const callSub = subscribeToCallState((callState) => {
      const s = settingsRef.current;
      if (!s.incomingCallEnabled) return;
      if (callState === "ringing") {
        sendCallVibration().catch(() => {});
      } else if (callState === "idle" || callState === "offhook") {
        sendNotificationClear().catch(() => {});
      }
    });
    _moduleSubs.push(callSub);

    requestPhoneStatePermission().then((granted) => {
      if (granted) startCallMonitor();
    });

    _listenersActive = true;
  }, []);

  const setupDisconnectHandler = useCallback(
    (attemptReconnectFn: () => void) => {
      const sub = onDeviceDisconnected(() => {
        setState("disconnected");
        setDeviceInfo(null);
        _listenersActive = false;

        _clearReconnectTimer();
        _reconnectTimer = setTimeout(attemptReconnectFn, 3000);
      });
      if (sub) _moduleSubs.push(sub);
    },
    []
  );

  const attemptReconnect = useCallback(async () => {
    _clearReconnectTimer();
    if (stateRef.current === "connected") return;

    const deviceId = getDeviceId() ?? (await loadDeviceId());
    if (!deviceId) {
      _reconnecting = false;
      setIsAutoReconnecting(false);
      return;
    }

    _reconnecting = true;
    setIsAutoReconnecting(true);
    setState("connecting");

    try {
      await reconnectById(deviceId);
      await syncTime();
      const info = await readAllDeviceInfo();
      setDeviceInfo(info);
      setState("connected");
      _reconnecting = false;
      setIsAutoReconnecting(false);

      startForegroundService();
      setupListeners();
      setupDisconnectHandler(() => attemptReconnect());
    } catch {
      setState("disconnected");
      _reconnectTimer = setTimeout(() => attemptReconnect(), 5000);
    }
  }, [setupListeners, setupDisconnectHandler]);

  const connect = useCallback(
    async (device: Device) => {
      _clearReconnectTimer();
      _reconnecting = false;
      setIsAutoReconnecting(false);
      setState("connecting");

      try {
        setPendingDevice(device);
        await connectAndDiscover();
        await syncTime();
        const info = await readAllDeviceInfo();
        setDeviceInfo(info);
        setState("connected");

        await saveDeviceId(device.id);
        startForegroundService();
        setupListeners();
        setupDisconnectHandler(() => attemptReconnect());
      } catch (err) {
        setState("disconnected");
        throw err;
      }
    },
    [setupListeners, setupDisconnectHandler, attemptReconnect]
  );

  const disconnect = useCallback(async () => {
    _clearReconnectTimer();
    _removeAllSubs();
    _reconnecting = false;
    setIsAutoReconnecting(false);
    stopCallMonitor();
    stopForegroundService();
    await disconnectDevice();
    await clearDeviceId();
    setState("disconnected");
    setDeviceInfo(null);
  }, []);

  // Restore connection on mount / handle app returning to foreground
  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      const connected = await checkConnected();
      if (!mounted) return;

      if (connected) {
        try {
          const info = await readAllDeviceInfo();
          if (!mounted) return;
          setDeviceInfo(info);
          setState("connected");
          startForegroundService();
          if (!_listenersActive) setupListeners();
          setupDisconnectHandler(() => attemptReconnect());
        } catch {}
      } else if (!_reconnecting) {
        const savedId = await loadDeviceId();
        if (savedId && mounted) {
          attemptReconnect();
        }
      }
    };

    restore();

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active" && stateRef.current === "disconnected" && !_reconnecting) {
        restore();
      }
    };
    const appStateSub = AppState.addEventListener("change", handleAppState);

    return () => {
      mounted = false;
      appStateSub.remove();
    };
  }, [setupListeners, setupDisconnectHandler, attemptReconnect]);

  return (
    <BandContext.Provider
      value={{ state, deviceInfo, connect, disconnect, refreshInfo, lastEvent, isAutoReconnecting }}
    >
      {children}
    </BandContext.Provider>
  );
}

export function useBand() {
  return useContext(BandContext);
}
