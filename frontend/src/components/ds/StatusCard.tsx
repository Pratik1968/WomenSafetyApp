import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "./Card";
import { colors } from "../../theme/tokens";

export type StatusTone = "success" | "warning" | "emergency" | "brand";

export function StatusCard({
  tone = "success",
  title,
  subtitle,
  icon,
}: {
  tone?: StatusTone;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  const dotColor = { success: colors.success, warning: colors.warning, emergency: colors.emergency, brand: colors.primary }[tone];
  return (
    <Card style={styles.row}>
      <View style={styles.dotWrap}>
        <View style={[styles.dotHalo, { backgroundColor: dotColor, opacity: 0.15 }]} />
        {icon ?? <View style={[styles.dot, { backgroundColor: dotColor }]} />}
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  dotWrap: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  dotHalo: { position: "absolute", width: 40, height: 40, borderRadius: 20 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  textWrap: { minWidth: 0, flexShrink: 1 },
  title: { fontSize: 16, fontWeight: "600", letterSpacing: -0.16, color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground },
});
