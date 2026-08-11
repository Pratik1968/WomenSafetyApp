import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";
import { Card } from "./Card";

export type StatTone = "brand" | "success" | "warning" | "emergency";

const ACCENT: Record<StatTone, string> = {
  brand: colors.primary,
  success: colors.success,
  warning: colors.warning,
  emergency: colors.emergency,
};

/** KPI tile for the dashboard: big value, label, optional trend delta + icon. */
export function StatTile({
  label,
  value,
  delta,
  icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: ReactNode;
  tone?: StatTone;
}) {
  const accent = ACCENT[tone];
  return (
    <Card style={styles.card}>
      {icon ? <View style={[styles.iconWrap, { backgroundColor: `${accent}15` }]}>{icon}</View> : null}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {delta ? <Text style={[styles.delta, { color: accent }]}>{delta}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 16, gap: 2, minWidth: 120 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  value: { fontSize: 24, fontWeight: "700", color: colors.foreground, letterSpacing: -0.4 },
  label: { fontSize: 13, color: colors.mutedForeground },
  delta: { fontSize: 12, fontWeight: "600", marginTop: 2 },
});
