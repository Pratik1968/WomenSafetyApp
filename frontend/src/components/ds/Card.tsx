import type { ReactNode } from "react";
import { View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { colors, radii } from "../../theme/tokens";

export type CardTone = "surface" | "plain" | "outline";

export function Card({
  children,
  tone = "surface",
  style,
}: {
  children: ReactNode;
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.base,
        tone === "surface" && styles.surface,
        tone === "outline" && styles.outline,
        tone === "plain" && styles.plain,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl2,
    padding: 20,
  },
  surface: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  plain: {
    backgroundColor: colors.background,
  },
});
