import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, spacing } from "@/src/theme";

type Props = {
  level: number;
};

function getBatteryIcon(level: number): keyof typeof Ionicons.glyphMap {
  if (level > 75) return "battery-full";
  if (level > 50) return "battery-three-quarters-sharp" as any;
  if (level > 25) return "battery-half";
  if (level > 10) return "battery-low-sharp" as any;
  return "battery-dead";
}

function getBatteryColor(level: number): string {
  if (level > 50) return colors.success;
  if (level > 25) return colors.warning;
  return colors.danger;
}

export default function BatteryIndicator({ level }: Props) {
  const color = getBatteryColor(level);

  return (
    <View style={styles.container}>
      <Ionicons name="battery-half" size={28} color={color} />
      <Text style={[styles.text, { color }]}>{level}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  text: {
    fontSize: font.lg,
    fontWeight: "700",
  },
});
