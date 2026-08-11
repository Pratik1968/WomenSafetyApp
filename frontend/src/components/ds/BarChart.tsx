import { useState } from "react";
import { View, Text, StyleSheet, type LayoutChangeEvent } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { colors } from "../../theme/tokens";

/** Simple vertical bar chart (react-native-svg). Width is measured from its container. */
export function BarChart({
  data,
  height = 160,
  color = colors.primary,
  maxBarWidth = 72,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  maxBarWidth?: number;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const chartH = height - 22;
  const gap = 16;
  const n = data.length || 1;
  const rawW = Math.max(6, (w - gap * (n - 1)) / n);
  const barW = Math.min(rawW, maxBarWidth);
  const totalW = barW * n + gap * (n - 1);
  const offset = Math.max(0, (w - totalW) / 2); // center the group
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View onLayout={onLayout} testID="bar-chart">
      {w > 0 ? (
        <Svg width={w} height={chartH}>
          {data.map((d, i) => {
            const h = Math.max(2, (d.value / max) * (chartH - 4));
            const x = offset + i * (barW + gap);
            return <Rect key={i} x={x} y={chartH - h} width={barW} height={h} rx={8} fill={color} />;
          })}
        </Svg>
      ) : null}
      <View style={[styles.labels, { gap }]}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.label, { width: barW || undefined }]} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  label: { fontSize: 12, color: colors.mutedForeground, textAlign: "center" },
});
