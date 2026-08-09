import type { ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors } from "../../theme/tokens";

export function ListItem({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
  selected,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.selected,
        !selected && pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <View style={styles.iconWrap}>
          {icon}
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? <ChevronRight size={18} color={colors.mutedForeground} opacity={0.6} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selected: {
    backgroundColor: `${colors.primary}14`, // ~8% opacity
  },
  pressed: {
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.16,
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
