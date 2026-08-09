import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

export type BadgeTone = "neutral" | "success" | "warning" | "emergency" | "brand";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  const palette = TONES[tone];
  return (
    <View style={[styles.base, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{children}</Text>
    </View>
  );
}

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.secondary, fg: colors.mutedForeground },
  success: { bg: `${colors.success}1a`, fg: colors.success },
  warning: { bg: `${colors.warning}1f`, fg: colors.warning },
  emergency: { bg: `${colors.emergency}1a`, fg: colors.emergency },
  brand: { bg: `${colors.primary}1a`, fg: colors.primary },
};

const styles = StyleSheet.create({
  base: {
    height: 28,
    alignSelf: "flex-start",
    borderRadius: 9999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
});
