import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBand } from "@/src/contexts/BandContext";
import { useI18n } from "@/src/contexts/I18nContext";
import { BandMode } from "@/src/ble/swr10/protocol";
import BatteryIndicator from "@/components/BatteryIndicator";
import ModeIndicator from "@/components/ModeIndicator";
import { colors, font, radius, spacing } from "@/src/theme";

function getModeLabel(mode: BandMode, t: (key: string) => string): string {
  switch (mode) {
    case BandMode.DAY:
      return t("home.modeDay");
    case BandMode.NIGHT:
      return t("home.modeNight");
    case BandMode.MEDIA:
      return t("home.modeMedia");
    default:
      return "Unknown";
  }
}

export default function HomeScreen() {
  const { state, deviceInfo, disconnect, refreshInfo, isAutoReconnecting } = useBand();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (state === "disconnected" && !isAutoReconnecting) {
      router.replace("/connect");
    }
  }, [state, isAutoReconnecting, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (state === "connected") refreshInfo();
    }, 30000);
    return () => clearInterval(interval);
  }, [state, refreshInfo]);

  if (!deviceInfo && !isAutoReconnecting) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        {isAutoReconnecting ? (
          <View style={styles.connectedBadge}>
            <ActivityIndicator size="small" color={colors.warning} />
            <Text style={[styles.connectedText, { color: colors.warning }]}>
              {t("home.reconnecting")}
            </Text>
          </View>
        ) : (
          <View style={styles.connectedBadge}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectedText}>{t("home.connected")}</Text>
          </View>
        )}
        <Pressable onPress={disconnect} hitSlop={12}>
          <Text style={styles.disconnectText}>{t("home.disconnect")}</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.bandSection}>
          <View style={styles.bandIconBox}>
            <Ionicons name="fitness" size={56} color={colors.accent} />
          </View>
          <Text style={styles.bandName}>{deviceInfo.deviceName}</Text>
          <Text style={styles.firmware}>FW {deviceInfo.firmwareRevision}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("home.battery")}</Text>
            <BatteryIndicator level={deviceInfo.batteryLevel} />
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("home.mode")}</Text>
            <ModeIndicator mode={deviceInfo.mode} label={getModeLabel(deviceInfo.mode, t)} />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/(main)/settings")}
            android_ripple={{ color: colors.cardBorder }}
          >
            <Ionicons name="settings-outline" size={28} color={colors.text} />
            <Text style={styles.actionText}>{t("home.settings")}</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/(main)/apps")}
            android_ripple={{ color: colors.cardBorder }}
          >
            <Ionicons name="apps-outline" size={28} color={colors.text} />
            <Text style={styles.actionText}>{t("home.apps")}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  connectedText: {
    color: colors.success,
    fontSize: font.sm,
    fontWeight: "600",
  },
  disconnectText: {
    color: colors.danger,
    fontSize: font.sm,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  bandSection: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  bandIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  bandName: {
    color: colors.text,
    fontSize: font.xl,
    fontWeight: "700",
  },
  firmware: {
    color: colors.textMuted,
    fontSize: font.sm,
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: font.sm,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionText: {
    color: colors.text,
    fontSize: font.md,
    fontWeight: "600",
  },
});
