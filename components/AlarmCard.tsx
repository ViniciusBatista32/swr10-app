import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, spacing } from "@/src/theme";

type Props = {
  name?: string;
  hour: number;
  minute: number;
  daysLabel: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  onPress: () => void;
  onDelete: () => void;
};

export default function AlarmCard({ name, hour, minute, daysLabel, enabled, onToggle, onPress, onDelete }: Props) {
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return (
    <Pressable
      style={[styles.container, !enabled && styles.dimmed]}
      onPress={onPress}
      android_ripple={{ color: colors.cardBorder }}
    >
      <View style={styles.left}>
        <Text style={styles.time}>{timeStr}</Text>
        {name ? <Text style={styles.name}>{name}</Text> : null}
        <Text style={styles.days}>{daysLabel}</Text>
      </View>
      <View style={styles.right}>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.switchTrackOff, true: colors.accent }}
          thumbColor="#fff"
        />
        <Pressable onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>
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
    marginBottom: spacing.sm,
  },
  dimmed: {
    opacity: 0.5,
  },
  left: {
    flex: 1,
  },
  time: {
    color: colors.text,
    fontSize: font.xxl,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
  },
  name: {
    color: colors.textSecondary,
    fontSize: font.sm,
    marginTop: 2,
  },
  days: {
    color: colors.textMuted,
    fontSize: font.xs,
    marginTop: 4,
  },
  right: {
    alignItems: "center",
    gap: spacing.md,
  },
});
