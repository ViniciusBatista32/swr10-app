import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, spacing } from "@/src/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  isActive: boolean;
  activeLabel: string;
  onPress: () => void;
};

export default function AppCard({ icon, title, description, isActive, activeLabel, onPress }: Props) {
  return (
    <Pressable
      style={[styles.container, isActive && styles.active]}
      onPress={onPress}
      android_ripple={{ color: colors.cardBorder }}
    >
      <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
        <Ionicons name={icon} size={28} color={isActive ? colors.accent : colors.textSecondary} />
      </View>
      <View style={styles.textBox}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{description}</Text>
      </View>
      {isActive && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  active: {
    borderColor: colors.accent + "60",
    backgroundColor: colors.accentDim + "30",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxActive: {
    backgroundColor: colors.accentDim,
  },
  textBox: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: font.lg,
    fontWeight: "600",
  },
  desc: {
    color: colors.textSecondary,
    fontSize: font.sm,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: font.xs,
    fontWeight: "700",
  },
});
