import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.15,
    color: colors.foreground,
  },
  action: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
});
