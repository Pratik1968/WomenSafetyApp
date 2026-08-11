import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

function alphaHex(a: number): string {
  const clamped = Math.max(0, Math.min(1, a));
  return Math.round(clamped * 255).toString(16).padStart(2, "0");
}

/** Intensity-tile grid for crime hotspots. Cell background darkens with `value`. */
export function Heatmap({ cells }: { cells: { label: string; value: number }[] }) {
  const max = Math.max(1, ...cells.map((c) => c.value));
  return (
    <View style={styles.grid} testID="heatmap">
      {cells.map((c, i) => {
        const intensity = 0.14 + (c.value / max) * 0.78;
        const bg = `${colors.primary}${alphaHex(intensity)}`;
        const light = intensity > 0.55;
        return (
          <View key={i} style={[styles.cell, { backgroundColor: bg }]}>
            <Text style={[styles.value, { color: light ? colors.primaryForeground : colors.foreground }]}>
              {c.value}
            </Text>
            <Text
              style={[styles.label, { color: light ? colors.primaryForeground : colors.mutedForeground }]}
              numberOfLines={2}
            >
              {c.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: {
    width: 96,
    height: 72,
    borderRadius: 14,
    padding: 10,
    justifyContent: "space-between",
  },
  value: { fontSize: 18, fontWeight: "700" },
  label: { fontSize: 11 },
});
