import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BandMode } from "@/src/ble/swr10/protocol";
import { colors, font, radius, spacing } from "@/src/theme";

type Props = {
  mode: BandMode;
  label: string;
};

const MODE_CONFIG: Record<number, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  [BandMode.DAY]: { icon: "sunny", color: "#FFD54F" },
  [BandMode.NIGHT]: { icon: "moon", color: "#7C4DFF" },
  [BandMode.MEDIA]: { icon: "musical-notes", color: "#4A9EFF" },
  [BandMode.FIRMWARE_UPDATE]: { icon: "cloud-download", color: "#FF8A65" },
};

export default function ModeIndicator({ mode, label }: Props) {
  const config = MODE_CONFIG[mode] ?? MODE_CONFIG[BandMode.DAY];

  return (
    <View style={[styles.container, { borderColor: config.color + "40" }]}>
      <Ionicons name={config.icon} size={24} color={config.color} />
      <Text style={[styles.text, { color: config.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.card,
  },
  text: {
    fontSize: font.md,
    fontWeight: "600",
  },
});
