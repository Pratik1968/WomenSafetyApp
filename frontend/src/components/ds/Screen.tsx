import { useContext, type ReactNode } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { colors } from "../../theme/tokens";

type Edge = "top" | "bottom" | "left" | "right";

/**
 * Safe-area screen wrapper. Applies device insets as padding on the chosen edges so content
 * never sits under the notch / status bar / home indicator. Reads insets defensively so it
 * also renders outside a SafeAreaProvider (e.g. in unit tests).
 *
 * Screens with their own bottom bar (MainTabBar) should pass edges={["top"]} and let the bar
 * handle the bottom inset.
 */
export function Screen({
  children,
  edges = ["top", "bottom"],
  style,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const pad = {
    paddingTop: edges.includes("top") ? insets.top : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
    paddingLeft: edges.includes("left") ? insets.left : 0,
    paddingRight: edges.includes("right") ? insets.right : 0,
  };
  return <View style={[styles.screen, pad, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
