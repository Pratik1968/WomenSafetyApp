import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradientBrand } from "../../theme/tokens";

export function SelectRow({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.row, selected ? styles.selected : styles.unselected]}>
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {selected ? (
        <LinearGradient
          colors={gradientBrand as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.dotOuter, styles.dotOuterSelected]}
        >
          <View style={styles.dotInner} />
        </LinearGradient>
      ) : (
        <View style={[styles.dotOuter, styles.dotOuterUnselected]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  selected: {
    borderColor: `${colors.primary}73`, // ~45% opacity
    backgroundColor: `${colors.primary}0f`, // ~6% opacity
  },
  unselected: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.16,
    color: colors.foreground,
  },
  description: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  dotOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dotOuterSelected: {
    borderWidth: 0,
  },
  dotOuterUnselected: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
});
