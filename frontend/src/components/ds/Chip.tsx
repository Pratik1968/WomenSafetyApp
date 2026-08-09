import type { ReactNode } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

export function Chip({
  children,
  active,
  onPress,
}: {
  children: ReactNode;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.base, active ? styles.active : styles.inactive]}>
      <Text style={active ? styles.textActive : styles.textInactive}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 40,
    flexShrink: 0,
    borderRadius: 9999,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  active: {
    backgroundColor: colors.foreground,
  },
  inactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textActive: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.background,
  },
  textInactive: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.mutedForeground,
  },
});
