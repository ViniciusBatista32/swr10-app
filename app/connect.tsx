import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Device } from "react-native-ble-plx";
import { requestPermissions, scanForDevices, stopScan } from "@/src/ble/bleManager";
import { useBand } from "@/src/contexts/BandContext";
import { useI18n } from "@/src/contexts/I18nContext";
import { colors, font, radius, spacing } from "@/src/theme";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ConnectScreen() {
  const { connect, state } = useBand();
  const { t } = useI18n();
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startScan = useCallback(async () => {
    setDevices([]);
    setScanning(true);
    setError(null);

    await requestPermissions();

    scanForDevices((device) => {
      const name = device.name ?? device.localName ?? "";
      if (!name.toUpperCase().includes("SWR10")) return;
      setDevices((prev) => {
        if (prev.find((d) => d.id === device.id)) return prev;
        return [...prev, device];
      });
    });

    scanTimeout.current = setTimeout(() => {
      stopScan();
      setScanning(false);
    }, 15000);
  }, []);

  useEffect(() => {
    startScan();
    return () => {
      stopScan();
      if (scanTimeout.current) clearTimeout(scanTimeout.current);
    };
  }, [startScan]);

  useEffect(() => {
    if (state === "connected") {
      router.replace("/(main)");
    }
  }, [state, router]);

  const handleConnect = async (device: Device) => {
    stopScan();
    if (scanTimeout.current) clearTimeout(scanTimeout.current);
    setScanning(false);
    setError(null);

    try {
      await connect(device);
    } catch (err: any) {
      setError(err?.message ?? "Connection failed");
    }
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <Pressable
      style={styles.deviceCard}
      onPress={() => handleConnect(item)}
      disabled={state === "connecting"}
      android_ripple={{ color: colors.cardBorder }}
    >
      <View style={styles.deviceIcon}>
        <Ionicons name="watch-outline" size={24} color={colors.accent} />
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name ?? item.localName ?? "SWR10"}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
      </View>
      {state === "connecting" ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Ionicons name="fitness" size={48} color={colors.accent} />
        </View>
        <Text style={styles.title}>{t("connect.title")}</Text>
        <Text style={styles.subtitle}>{t("connect.subtitle")}</Text>
      </View>

      {state === "connecting" && (
        <View style={styles.connectingBox}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.connectingText}>{t("connect.connecting")}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {state !== "connecting" && (
        <>
          {scanning && (
            <View style={styles.scanningRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.scanningText}>{t("connect.scanning")}</Text>
            </View>
          )}

          <FlatList
            data={devices}
            keyExtractor={(d) => d.id}
            renderItem={renderDevice}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              !scanning ? (
                <Text style={styles.emptyText}>{t("connect.noDevices")}</Text>
              ) : null
            }
          />

          {!scanning && (
            <Pressable style={styles.rescanBtn} onPress={startScan}>
              <Ionicons name="refresh" size={20} color={colors.accent} />
              <Text style={styles.rescanText}>{t("connect.scanAgain")}</Text>
            </Pressable>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: font.xxl,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: font.md,
    marginTop: spacing.xs,
  },
  connectingBox: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  connectingText: {
    color: colors.textSecondary,
    fontSize: font.md,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.danger + "20",
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.sm,
    flex: 1,
  },
  scanningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  scanningText: {
    color: colors.textSecondary,
    fontSize: font.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: colors.text,
    fontSize: font.md,
    fontWeight: "600",
  },
  deviceId: {
    color: colors.textMuted,
    fontSize: font.xs,
    marginTop: 2,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: font.md,
    textAlign: "center",
    paddingTop: spacing.xxl,
  },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  rescanText: {
    color: colors.accent,
    fontSize: font.md,
    fontWeight: "600",
  },
});
