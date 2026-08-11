import { useState } from "react";
import { View, StyleSheet, type LayoutChangeEvent } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import { colors } from "../../theme/tokens";

/** Sparkline / trend line (react-native-svg). Width is measured from its container. */
export function LineChart({
  data,
  height = 120,
  color = colors.primary,
  dots = false,
}: {
  data: number[];
  height?: number;
  color?: string;
  dots?: boolean;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const pad = 4;
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const range = max - min || 1;

  const coords = (width: number) =>
    data.map((v, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * (width - pad * 2) + pad : width / 2;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return { x, y };
    });

  return (
    <View onLayout={onLayout} testID="line-chart">
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Polyline
            points={coords(w).map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {dots
            ? coords(w).map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />)
            : null}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({});
