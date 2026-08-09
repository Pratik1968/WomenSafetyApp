import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradientBrand } from "../../theme/tokens";

export function PagerDots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) =>
        i === active ? (
          <LinearGradient
            key={i}
            testID={`pager-dot-${i}`}
            colors={gradientBrand as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.dot, styles.dotActive]}
          />
        ) : (
          <View key={i} testID={`pager-dot-${i}`} style={[styles.dot, styles.dotInactive]} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 9999,
  },
  dotActive: {
    width: 28,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.border,
  },
});
