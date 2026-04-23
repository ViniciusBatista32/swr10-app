import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AlarmCard from "@/components/AlarmCard";
import { useI18n } from "@/src/contexts/I18nContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { readAlarms, writeAlarms } from "@/src/ble/swr10/band";
import { ALARM_IDS, type AlarmConfig, type AlarmDays } from "@/src/ble/swr10/protocol";
import { colors, font, radius, spacing } from "@/src/theme";

const DAY_KEYS: (keyof AlarmDays)[] = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

function getDaysLabel(days: AlarmDays, t: (k: string) => string): string {
  const dayLabels = [
    t("alarms.sunday"), t("alarms.monday"), t("alarms.tuesday"),
    t("alarms.wednesday"), t("alarms.thursday"), t("alarms.friday"), t("alarms.saturday"),
  ];
  const active = DAY_KEYS.map((k, i) => (days[k] ? dayLabels[i] : null)).filter(Boolean);
  if (active.length === 0) return "-";
  if (active.length === 7) return dayLabels.join(", ");
  return active.join(", ");
}

export default function AlarmsScreen() {
  const { t } = useI18n();
  const { alarmNames, removeAlarmName } = useSettings();
  const router = useRouter();
  const [alarms, setAlarms] = useState<AlarmConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlarms = useCallback(async () => {
    setLoading(true);
    try {
      const { configs } = await readAlarms();
      setAlarms(configs);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  const handleToggle = useCallback(
    async (alarmId: number, enabled: boolean) => {
      const updated = alarms.map((a) => {
        if (a.alarmId !== alarmId) return a;
        return {
          ...a,
          days: enabled
            ? { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true }
            : { sunday: false, monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false },
        };
      });
      setAlarms(updated);
      try {
        const confirmed = await writeAlarms(enabled ? updated : updated.filter((a) => a.alarmId !== alarmId));
        setAlarms(confirmed);
      } catch {}
    },
    [alarms]
  );

  const handleDelete = useCallback(
    async (alarmId: number) => {
      const remaining = alarms.filter((a) => a.alarmId !== alarmId);
      setAlarms(remaining);
      removeAlarmName(alarmId);
      try {
        const confirmed = await writeAlarms(remaining);
        setAlarms(confirmed);
      } catch {}
    },
    [alarms, removeAlarmName]
  );

  const handleAdd = useCallback(() => {
    const usedIds = new Set(alarms.map((a) => a.alarmId));
    const nextId = ALARM_IDS.find((id) => !usedIds.has(id));
    if (nextId === undefined) return;
    router.push({ pathname: "/(main)/alarms/[id]", params: { id: String(nextId), isNew: "1" } });
  }, [alarms, router]);

  const isAlarmEnabled = (a: AlarmConfig) => {
    return DAY_KEYS.some((k) => a.days[k]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("alarms.title")}</Text>
        <Pressable
          onPress={handleAdd}
          hitSlop={12}
          disabled={alarms.length >= 5}
          style={{ opacity: alarms.length >= 5 ? 0.3 : 1 }}
        >
          <Ionicons name="add" size={28} color={colors.accent} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : alarms.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alarm-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>{t("alarms.noAlarms")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {alarms.map((alarm) => (
            <AlarmCard
              key={alarm.alarmId}
              name={alarmNames[alarm.alarmId]}
              hour={alarm.hour}
              minute={alarm.minute}
              daysLabel={getDaysLabel(alarm.days, t)}
              enabled={isAlarmEnabled(alarm)}
              onToggle={(v) => handleToggle(alarm.alarmId, v)}
              onPress={() =>
                router.push({ pathname: "/(main)/alarms/[id]", params: { id: String(alarm.alarmId) } })
              }
              onDelete={() => handleDelete(alarm.alarmId)}
            />
          ))}
          {alarms.length >= 5 && (
            <Text style={styles.maxText}>{t("alarms.maxAlarms")}</Text>
          )}
        </ScrollView>
      )}
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
  scroll: { padding: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: font.md },
  maxText: { color: colors.textMuted, fontSize: font.sm, textAlign: "center", marginTop: spacing.md },
});
