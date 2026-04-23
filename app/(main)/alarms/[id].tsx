import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "@/src/contexts/I18nContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { readAlarms, writeAlarms } from "@/src/ble/swr10/band";
import { ALARM_IDS, type AlarmConfig, type AlarmDays } from "@/src/ble/swr10/protocol";
import { colors, font, radius, spacing } from "@/src/theme";

const DAY_KEYS: (keyof AlarmDays)[] = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

const SMART_WINDOW_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 5);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function AlarmDetailScreen() {
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>();
  const alarmId = Number(id);
  const { t } = useI18n();
  const { alarmNames, setAlarmName } = useSettings();
  const router = useRouter();

  const [name, setName] = useState(alarmNames[alarmId] ?? "");
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState<AlarmDays>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
  });
  const [smartWindow, setSmartWindow] = useState(10);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const { configs } = await readAlarms();
        const found = configs.find((a) => a.alarmId === alarmId);
        if (found) {
          setHour(found.hour);
          setMinute(found.minute);
          setDays(found.days);
          setSmartWindow(found.smartWindow || 10);
        }
      } catch {}
      setLoading(false);
    })();
  }, [alarmId, isNew]);

  const toggleDay = (key: keyof AlarmDays) => {
    setDays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    if (name.trim()) {
      setAlarmName(alarmId, name.trim());
    }

    try {
      const { configs: existing } = await readAlarms();
      const others = existing.filter((a) => a.alarmId !== alarmId);
      const newAlarm: AlarmConfig = { alarmId, hour, minute, smartWindow, days };
      await writeAlarms([...others, newAlarm]);
    } catch {}

    setSaving(false);
    router.back();
  }, [alarmId, hour, minute, days, smartWindow, name, setAlarmName, router]);

  const dayLabels = [
    t("alarms.sunday"), t("alarms.monday"), t("alarms.tuesday"),
    t("alarms.wednesday"), t("alarms.thursday"), t("alarms.friday"), t("alarms.saturday"),
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isNew ? t("alarms.addAlarm") : t("alarms.editAlarm")}
        </Text>
        <Pressable onPress={handleSave} hitSlop={12} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.saveText}>{t("common.save")}</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>{t("alarms.alarmName")}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t("alarms.alarmNamePlaceholder")}
            placeholderTextColor={colors.textMuted}
            maxLength={30}
          />
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.label}>{t("alarms.time")}</Text>
          <View style={styles.timeRow}>
            <Pressable onPress={() => setHour((h) => (h > 0 ? h - 1 : 23))} style={styles.timeArrow}>
              <Ionicons name="chevron-up" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={styles.timeText}>{pad(hour)}</Text>
            <Pressable onPress={() => setHour((h) => (h < 23 ? h + 1 : 0))} style={styles.timeArrow}>
              <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
            </Pressable>

            <Text style={styles.timeColon}>:</Text>

            <Pressable onPress={() => setMinute((m) => (m > 0 ? m - 1 : 59))} style={styles.timeArrow}>
              <Ionicons name="chevron-up" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={styles.timeText}>{pad(minute)}</Text>
            <Pressable onPress={() => setMinute((m) => (m < 59 ? m + 1 : 0))} style={styles.timeArrow}>
              <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Days */}
        <View style={styles.section}>
          <Text style={styles.label}>{t("alarms.days")}</Text>
          <View style={styles.daysRow}>
            {DAY_KEYS.map((key, i) => (
              <Pressable
                key={key}
                style={[styles.dayBtn, days[key] && styles.dayBtnActive]}
                onPress={() => toggleDay(key)}
              >
                <Text style={[styles.dayText, days[key] && styles.dayTextActive]}>
                  {dayLabels[i]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Smart Window */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {t("alarms.smartWindow")} ({smartWindow} {t("alarms.smartWindowUnit")})
          </Text>
          <View style={styles.windowRow}>
            {SMART_WINDOW_OPTIONS.map((val) => (
              <Pressable
                key={val}
                style={[styles.windowBtn, smartWindow === val && styles.windowBtnActive]}
                onPress={() => setSmartWindow(val)}
              >
                <Text style={[styles.windowText, smartWindow === val && styles.windowTextActive]}>
                  {val}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { color: colors.text, fontSize: font.lg, fontWeight: "700" },
  saveText: { color: colors.accent, fontSize: font.md, fontWeight: "600" },
  scroll: { padding: spacing.lg },
  section: { marginBottom: spacing.xl },
  label: { color: colors.textSecondary, fontSize: font.sm, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: font.md,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  timeArrow: { padding: spacing.xs },
  timeText: {
    color: colors.text,
    fontSize: 48,
    fontWeight: "200",
    fontVariant: ["tabular-nums"],
    width: 80,
    textAlign: "center",
  },
  timeColon: { color: colors.text, fontSize: 48, fontWeight: "200" },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  dayBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.inputBg,
  },
  dayBtnActive: { backgroundColor: colors.accent },
  dayText: { color: colors.textSecondary, fontSize: font.sm, fontWeight: "500" },
  dayTextActive: { color: "#fff" },
  windowRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  windowBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.inputBg,
    minWidth: 48,
    alignItems: "center",
  },
  windowBtnActive: { backgroundColor: colors.accent },
  windowText: { color: colors.textSecondary, fontSize: font.sm },
  windowTextActive: { color: "#fff" },
});
