import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import SettingItem from "@/components/SettingItem";
import { useI18n } from "@/src/contexts/I18nContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { readNightMode, writeNightMode, setLinkLossAlert } from "@/src/ble/swr10/band";
import {
  checkNotificationPermission,
  openNotificationPermissionSettings,
  getSeenApps,
  type SeenApp,
} from "@/src/notifications";
import { colors, font, radius, spacing } from "@/src/theme";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ─── Time Picker Wheel ──────────────────────────────────────────────────────

function NumberPicker({
  value,
  min,
  max,
  onChange,
  width = 60,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  width?: number;
}) {
  return (
    <View style={[pickerStyles.container, { width }]}>
      <Pressable onPress={() => onChange(value > min ? value - 1 : max)} style={pickerStyles.arrow}>
        <Ionicons name="chevron-up" size={24} color={colors.textSecondary} />
      </Pressable>
      <Text style={pickerStyles.value}>{pad(value)}</Text>
      <Pressable onPress={() => onChange(value < max ? value + 1 : min)} style={pickerStyles.arrow}>
        <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: { alignItems: "center" },
  arrow: { padding: spacing.xs },
  value: { color: colors.text, fontSize: font.xxl, fontWeight: "300", fontVariant: ["tabular-nums"] },
});

// ─── Settings Screen ────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const { settings, updateSettings, notifApps, setNotifApp } = useSettings();
  const router = useRouter();

  const [nightModalVisible, setNightModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [doubleClickModalVisible, setDoubleClickModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const [nightStart, setNightStart] = useState({ h: settings.nightStartHour, m: settings.nightStartMinute });
  const [nightEnd, setNightEnd] = useState({ h: settings.nightEndHour, m: settings.nightEndMinute });
  const [notifPermission, setNotifPermission] = useState<string>("unknown");
  const [seenApps, setSeenApps] = useState<SeenApp[]>([]);

  useEffect(() => {
    if (!notifModalVisible) return;
    checkNotificationPermission().then(setNotifPermission);
    getSeenApps().then((apps) =>
      setSeenApps(apps.sort((a, b) => a.label.localeCompare(b.label)))
    );
  }, [notifModalVisible]);

  const handleNightModeToggle = useCallback(
    async (enabled: boolean) => {
      updateSettings({ nightModeEnabled: enabled });
      try {
        await writeNightMode({
          startHour: settings.nightStartHour,
          startMinute: settings.nightStartMinute,
          endHour: settings.nightEndHour,
          endMinute: settings.nightEndMinute,
          enabled,
        });
      } catch {}
    },
    [settings, updateSettings]
  );

  const handleNightModeSave = useCallback(async () => {
    updateSettings({
      nightStartHour: nightStart.h,
      nightStartMinute: nightStart.m,
      nightEndHour: nightEnd.h,
      nightEndMinute: nightEnd.m,
    });
    try {
      await writeNightMode({
        startHour: nightStart.h,
        startMinute: nightStart.m,
        endHour: nightEnd.h,
        endMinute: nightEnd.m,
        enabled: settings.nightModeEnabled,
      });
    } catch {}
    setNightModalVisible(false);
  }, [nightStart, nightEnd, settings.nightModeEnabled, updateSettings]);

  const handleOutOfRange = useCallback(
    async (enabled: boolean) => {
      updateSettings({ outOfRangeEnabled: enabled });
      try {
        await setLinkLossAlert(enabled);
      } catch {}
    },
    [updateSettings]
  );

  const handleIncomingCall = useCallback(
    (enabled: boolean) => {
      updateSettings({ incomingCallEnabled: enabled });
    },
    [updateSettings]
  );

  const vibOptions = [1, 2, 3];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("settings.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Night Mode */}
        <View style={styles.section}>
          <SettingItem
            icon="moon-outline"
            title={t("settings.nightMode")}
            description={
              settings.nightModeEnabled
                ? `${pad(settings.nightStartHour)}:${pad(settings.nightStartMinute)} - ${pad(settings.nightEndHour)}:${pad(settings.nightEndMinute)}`
                : t("settings.nightModeDesc")
            }
            switchValue={settings.nightModeEnabled}
            onSwitchChange={handleNightModeToggle}
          />
          <SettingItem
            icon="time-outline"
            title={`${t("settings.nightStart")} / ${t("settings.nightEnd")}`}
            description={`${pad(settings.nightStartHour)}:${pad(settings.nightStartMinute)} - ${pad(settings.nightEndHour)}:${pad(settings.nightEndMinute)}`}
            onPress={() => {
              setNightStart({ h: settings.nightStartHour, m: settings.nightStartMinute });
              setNightEnd({ h: settings.nightEndHour, m: settings.nightEndMinute });
              setNightModalVisible(true);
            }}
          />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <SettingItem
            icon="notifications-outline"
            title={t("settings.notifications")}
            description={t("settings.notificationsDesc")}
            switchValue={settings.notificationsEnabled}
            onSwitchChange={(v) => updateSettings({ notificationsEnabled: v })}
          />
          <SettingItem
            icon="apps-outline"
            title={t("settings.selectApps")}
            onPress={() => setNotifModalVisible(true)}
            disabled={!settings.notificationsEnabled}
          />
          <View style={styles.vibRow}>
            <Text style={styles.vibLabel}>{t("settings.vibrationCount")}</Text>
            <View style={styles.vibOptions}>
              {vibOptions.map((n) => (
                <Pressable
                  key={n}
                  style={[styles.vibOption, settings.vibrationCount === n && styles.vibOptionActive]}
                  onPress={() => updateSettings({ vibrationCount: n })}
                >
                  <Text
                    style={[styles.vibOptionText, settings.vibrationCount === n && styles.vibOptionTextActive]}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Alarms */}
        <View style={styles.section}>
          <SettingItem
            icon="alarm-outline"
            title={t("settings.alarms")}
            description={t("settings.alarmsDesc")}
            onPress={() => router.push("/(main)/alarms")}
          />
        </View>

        {/* Out of Range */}
        <View style={styles.section}>
          <SettingItem
            icon="locate-outline"
            title={t("settings.outOfRange")}
            description={t("settings.outOfRangeDesc")}
            switchValue={settings.outOfRangeEnabled}
            onSwitchChange={handleOutOfRange}
          />
        </View>

        {/* Incoming Call */}
        <View style={styles.section}>
          <SettingItem
            icon="call-outline"
            title={t("settings.incomingCall")}
            description={t("settings.incomingCallDesc")}
            switchValue={settings.incomingCallEnabled}
            onSwitchChange={handleIncomingCall}
          />
        </View>

        {/* Double Click */}
        <View style={styles.section}>
          <SettingItem
            icon="hand-left-outline"
            title={t("settings.doubleClick")}
            description={t("settings.doubleClickDesc")}
            onPress={() => setDoubleClickModalVisible(true)}
          />
        </View>

        {/* Language */}
        <View style={styles.section}>
          <SettingItem
            icon="language-outline"
            title={t("common.language")}
            description={lang === "pt-br" ? "Portugues (BR)" : "English (US)"}
            onPress={() => setLangModalVisible(true)}
          />
        </View>
      </ScrollView>

      {/* ─── Night Mode Modal ────────────────────────────────────────────── */}
      <Modal visible={nightModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>{t("settings.nightMode")}</Text>

            <Text style={modalStyles.label}>{t("settings.nightStart")}</Text>
            <View style={modalStyles.timeRow}>
              <NumberPicker value={nightStart.h} min={0} max={23} onChange={(h) => setNightStart((p) => ({ ...p, h }))} />
              <Text style={modalStyles.colon}>:</Text>
              <NumberPicker value={nightStart.m} min={0} max={59} onChange={(m) => setNightStart((p) => ({ ...p, m }))} />
            </View>

            <Text style={modalStyles.label}>{t("settings.nightEnd")}</Text>
            <View style={modalStyles.timeRow}>
              <NumberPicker value={nightEnd.h} min={0} max={23} onChange={(h) => setNightEnd((p) => ({ ...p, h }))} />
              <Text style={modalStyles.colon}>:</Text>
              <NumberPicker value={nightEnd.m} min={0} max={59} onChange={(m) => setNightEnd((p) => ({ ...p, m }))} />
            </View>

            <View style={modalStyles.actions}>
              <Pressable onPress={() => setNightModalVisible(false)} style={modalStyles.cancelBtn}>
                <Text style={modalStyles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable onPress={handleNightModeSave} style={modalStyles.saveBtn}>
                <Text style={modalStyles.saveText}>{t("common.save")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Notification Apps Modal ─────────────────────────────────────── */}
      <Modal visible={notifModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.card, { maxHeight: "70%" }]}>
            <Text style={modalStyles.title}>{t("settings.selectApps")}</Text>

            {notifPermission !== "authorized" ? (
              <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
                <Text style={{ color: colors.textSecondary, textAlign: "center", marginBottom: spacing.md }}>
                  {t("settings.notificationsDesc")}
                </Text>
                <Pressable
                  style={modalStyles.saveBtn}
                  onPress={openNotificationPermissionSettings}
                >
                  <Text style={modalStyles.saveText}>{t("common.enabled")}</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {seenApps.length === 0 ? (
                  <Text style={{ color: colors.textMuted, textAlign: "center", paddingVertical: spacing.lg }}>
                    {t("settings.noAppsYet")}
                  </Text>
                ) : (
                  seenApps.map((app) => (
                    <View key={app.packageName} style={notifStyles.row}>
                      <View style={{ flex: 1, marginRight: spacing.md }}>
                        <Text style={notifStyles.appLabel} numberOfLines={1}>{app.label}</Text>
                        <Text style={notifStyles.pkg} numberOfLines={1}>{app.packageName}</Text>
                      </View>
                      <Switch
                        value={notifApps[app.packageName] !== false}
                        onValueChange={(v) => setNotifApp(app.packageName, v)}
                        trackColor={{ false: colors.switchTrackOff, true: colors.accent }}
                        thumbColor="#fff"
                      />
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            <View style={modalStyles.actions}>
              <Pressable onPress={() => setNotifModalVisible(false)} style={modalStyles.saveBtn}>
                <Text style={modalStyles.saveText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Double Click Modal ──────────────────────────────────────────── */}
      <Modal visible={doubleClickModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>{t("settings.doubleClick")}</Text>

            <Pressable
              style={[
                selectStyles.option,
                settings.doubleClickAction === "swap_app" && selectStyles.optionActive,
              ]}
              onPress={() => {
                updateSettings({ doubleClickAction: "swap_app" });
                setDoubleClickModalVisible(false);
              }}
            >
              <Ionicons
                name={settings.doubleClickAction === "swap_app" ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={settings.doubleClickAction === "swap_app" ? colors.accent : colors.textMuted}
              />
              <Text style={selectStyles.optionText}>{t("settings.doubleClickSwapApp")}</Text>
            </Pressable>

            <View style={modalStyles.actions}>
              <Pressable onPress={() => setDoubleClickModalVisible(false)} style={modalStyles.cancelBtn}>
                <Text style={modalStyles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Language Modal ──────────────────────────────────────────────── */}
      <Modal visible={langModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>{t("common.language")}</Text>

            {[
              { id: "pt-br", label: "Portugues (BR)" },
              { id: "en-us", label: "English (US)" },
            ].map((opt) => (
              <Pressable
                key={opt.id}
                style={[selectStyles.option, lang === opt.id && selectStyles.optionActive]}
                onPress={() => {
                  setLang(opt.id);
                  setLangModalVisible(false);
                }}
              >
                <Ionicons
                  name={lang === opt.id ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={lang === opt.id ? colors.accent : colors.textMuted}
                />
                <Text style={selectStyles.optionText}>{opt.label}</Text>
              </Pressable>
            ))}

            <View style={modalStyles.actions}>
              <Pressable onPress={() => setLangModalVisible(false)} style={modalStyles.cancelBtn}>
                <Text style={modalStyles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { color: colors.text, fontSize: font.lg, fontWeight: "700" },
  scroll: { paddingBottom: spacing.xxl },
  section: {
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  vibRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
  },
  vibLabel: { color: colors.text, fontSize: font.md },
  vibOptions: { flexDirection: "row", gap: spacing.sm },
  vibOption: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  vibOptionActive: { backgroundColor: colors.accent },
  vibOptionText: { color: colors.textSecondary, fontSize: font.md, fontWeight: "600" },
  vibOptionTextActive: { color: "#fff" },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 360,
  },
  title: { color: colors.text, fontSize: font.lg, fontWeight: "700", marginBottom: spacing.lg },
  label: { color: colors.textSecondary, fontSize: font.sm, marginBottom: spacing.sm, marginTop: spacing.md },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  colon: { color: colors.text, fontSize: font.xxl, fontWeight: "300" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  cancelText: { color: colors.textSecondary, fontSize: font.md },
  saveBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
  },
  saveText: { color: "#fff", fontSize: font.md, fontWeight: "600" },
});

const notifStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  appLabel: { color: colors.text, fontSize: font.sm, fontWeight: "600" },
  pkg: { color: colors.textMuted, fontSize: font.xs },
});

const selectStyles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  optionActive: { backgroundColor: colors.accentDim + "40" },
  optionText: { color: colors.text, fontSize: font.md },
});
