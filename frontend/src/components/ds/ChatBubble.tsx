import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradientBrand } from "../../theme/tokens";

export function ChatBubble({ from, children, time }: { from: "user" | "aegis"; children: ReactNode; time?: string }) {
  const mine = from === "user";

  return (
    <View testID="chat-bubble-wrap" style={[styles.wrap, { alignItems: mine ? "flex-end" : "flex-start" }]}>
      {mine ? (
        <LinearGradient
          colors={gradientBrand as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.bubble, styles.bubbleMine]}
        >
          <Text style={styles.textMine}>{children}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleTheirs]}>
          <Text style={styles.textTheirs}>{children}</Text>
        </View>
      )}
      {time ? <Text style={styles.time}>{time}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "column" },
  bubble: { maxWidth: "84%", paddingHorizontal: 16, paddingVertical: 12 },
  bubbleMine: { borderRadius: 22, borderBottomRightRadius: 8 },
  bubbleTheirs: {
    borderRadius: 22,
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  textMine: { fontSize: 15, lineHeight: 22, color: colors.primaryForeground },
  textTheirs: { fontSize: 15, lineHeight: 22, color: colors.foreground },
  time: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, color: `${colors.mutedForeground}cc` },
});
