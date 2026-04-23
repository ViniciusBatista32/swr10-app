import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadAlarmNames,
  loadNotifApps,
  loadNotifAppLabels,
  loadSettings,
  type PersistedSettings,
  saveAlarmNames,
  saveNotifApps,
  saveNotifAppLabels,
  saveSettings,
} from "@/src/storage";

type SettingsContextType = {
  settings: PersistedSettings;
  updateSettings: (partial: Partial<PersistedSettings>) => void;
  alarmNames: Record<number, string>;
  setAlarmName: (alarmId: number, name: string) => void;
  removeAlarmName: (alarmId: number) => void;
  notifApps: Record<string, boolean>;
  setNotifApp: (packageName: string, enabled: boolean) => void;
  notifAppLabels: Record<string, string>;
  registerNotifApp: (packageName: string, label: string) => void;
  ready: boolean;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  alarmNames: {},
  setAlarmName: () => {},
  removeAlarmName: () => {},
  notifApps: {},
  setNotifApp: () => {},
  notifAppLabels: {},
  registerNotifApp: () => {},
  ready: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PersistedSettings>(DEFAULT_SETTINGS);
  const [alarmNames, setAlarmNamesState] = useState<Record<number, string>>({});
  const [notifApps, setNotifAppsState] = useState<Record<string, boolean>>({});
  const [notifAppLabels, setNotifAppLabelsState] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadSettings(), loadAlarmNames(), loadNotifApps(), loadNotifAppLabels()]).then(
      ([s, names, apps, labels]) => {
        setSettings(s);
        setAlarmNamesState(names);
        setNotifAppsState(apps);
        setNotifAppLabelsState(labels);
        setReady(true);
      }
    );
  }, []);

  const updateSettings = useCallback((partial: Partial<PersistedSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const setAlarmName = useCallback(
    (alarmId: number, name: string) => {
      setAlarmNamesState((prev) => {
        const next = { ...prev, [alarmId]: name };
        saveAlarmNames(next);
        return next;
      });
    },
    []
  );

  const removeAlarmName = useCallback(
    (alarmId: number) => {
      setAlarmNamesState((prev) => {
        const next = { ...prev };
        delete next[alarmId];
        saveAlarmNames(next);
        return next;
      });
    },
    []
  );

  const setNotifApp = useCallback(
    (packageName: string, enabled: boolean) => {
      setNotifAppsState((prev) => {
        const next = { ...prev, [packageName]: enabled };
        saveNotifApps(next);
        return next;
      });
    },
    []
  );

  const registerNotifApp = useCallback(
    (packageName: string, label: string) => {
      setNotifAppsState((prev) => {
        if (packageName in prev) return prev;
        const next = { ...prev, [packageName]: true };
        saveNotifApps(next);
        return next;
      });
      setNotifAppLabelsState((prev) => {
        if (prev[packageName] === label) return prev;
        const next = { ...prev, [packageName]: label };
        saveNotifAppLabels(next);
        return next;
      });
    },
    []
  );

  if (!ready) return null;

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        alarmNames,
        setAlarmName,
        removeAlarmName,
        notifApps,
        setNotifApp,
        notifAppLabels,
        registerNotifApp,
        ready,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
