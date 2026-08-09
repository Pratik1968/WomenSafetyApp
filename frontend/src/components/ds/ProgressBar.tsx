import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradientBrand } from "../../theme/tokens";

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={styles.track}>
      <LinearGradient
        testID="progress-fill"
        colors={gradientBrand as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${pct}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    width: "100%",
    overflow: "hidden",
    borderRadius: 9999,
    backgroundColor: colors.secondary,
  },
  fill: {
    height: "100%",
    borderRadius: 9999,
  },
});
