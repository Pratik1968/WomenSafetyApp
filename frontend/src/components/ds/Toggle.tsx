import { View, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradientBrand } from "../../theme/tokens";

export function Toggle({ on, onChange }: { on?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: !!on }}
      onPress={() => onChange?.(!on)}
      style={styles.wrap}
    >
      {on ? (
        <LinearGradient
          colors={gradientBrand as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.track}
        >
          <View style={[styles.thumb, styles.thumbOn]} />
        </LinearGradient>
      ) : (
        <View style={[styles.track, styles.trackOff]}>
          <View style={[styles.thumb, styles.thumbOff]} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 52,
    height: 30,
  },
  track: {
    flex: 1,
    borderRadius: 15,
  },
  trackOff: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    position: "absolute",
    top: 3,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  thumbOn: {
    left: 25,
  },
  thumbOff: {
    left: 3,
  },
});
