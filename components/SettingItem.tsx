import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { colors, font, radius, spacing } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  rightElement?: React.ReactNode;
  disabled?: boolean;
};

export default function SettingItem({
  icon,
  title,
  description,
  onPress,
  switchValue,
  onSwitchChange,
  rightElement,
  disabled,
}: Props) {
  const hasSwitch = switchValue !== undefined && onSwitchChange;
  const isInteractive = onPress || hasSwitch;

  const content = (
    <View style={[styles.container, disabled && styles.disabled]}>
      {icon && (
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={22} color={colors.accent} />
        </View>
      )}
      <View style={styles.textBox}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      {hasSwitch && (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.switchTrackOff, true: colors.accent }}
          thumbColor="#fff"
          disabled={disabled}
        />
      )}
      {rightElement}
      {onPress && !hasSwitch && !rightElement && (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={disabled} android_ripple={{ color: colors.cardBorder }}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    gap: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  textBox: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: font.md,
    fontWeight: "500",
  },
  desc: {
    color: colors.textSecondary,
    fontSize: font.sm,
    marginTop: 2,
  },
});
