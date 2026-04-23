import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AppCard from "@/components/AppCard";
import { useI18n } from "@/src/contexts/I18nContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { colors, font, spacing } from "@/src/theme";

const APPS = [
  {
    id: "music_control",
    icon: "musical-notes" as const,
    titleKey: "apps.musicControl",
    descKey: "apps.musicControlDesc",
  },
];

export default function AppsScreen() {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("apps.title")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {APPS.map((app) => (
          <AppCard
            key={app.id}
            icon={app.icon}
            title={t(app.titleKey)}
            description={t(app.descKey)}
            isActive={settings.activeAppId === app.id}
            activeLabel={t("apps.active")}
            onPress={() => updateSettings({ activeAppId: app.id })}
          />
        ))}

        {settings.activeAppId === "music_control" && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{t("apps.musicControl")}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="hand-left-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{t("apps.tapSingle")}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="hand-left-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{t("apps.tapDouble")}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="hand-left-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{t("apps.tapTriple")}</Text>
            </View>
          </View>
        )}
      </ScrollView>
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
  scroll: { padding: spacing.lg, gap: spacing.md },
  infoBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoTitle: { color: colors.text, fontSize: font.md, fontWeight: "600", marginBottom: spacing.xs },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  infoText: { color: colors.textSecondary, fontSize: font.sm },
});
