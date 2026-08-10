/**
 * ChatBubble — shared message bubble used outside AssistantScreen.
 * Updated to match the refreshed Aegis design language:
 * - User: gradient pill, right-aligned
 * - Aegis: surface card with border, left-aligned, slightly larger line-height
 */

import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradientBrand, radii } from "../../theme/tokens";

interface ChatBubbleProps {
  from: "user" | "aegis";
  children: ReactNode;
  time?: string;
}

export function ChatBubble({ from, children, time }: ChatBubbleProps) {
  const mine = from === "user";

  return (
    <View
      testID="chat-bubble-wrap"
      style={[styles.wrap, mine ? styles.wrapRight : styles.wrapLeft]}
    >
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
      {time ? (
        <Text style={[styles.time, mine ? styles.timeRight : styles.timeLeft]}>
          {time}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "column", maxWidth: "84%" },
  wrapRight: { alignSelf: "flex-end", alignItems: "flex-end" },
  wrapLeft: { alignSelf: "flex-start", alignItems: "flex-start" },

  bubble: { paddingHorizontal: 15, paddingVertical: 11 },

  bubbleMine: {
    borderRadius: 22,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    borderRadius: 18,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  textMine: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.primaryForeground,
  },
  textTheirs: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.foreground,
  },

  time: {
    marginTop: 4,
    fontSize: 11,
    color: `${colors.mutedForeground}aa`,
  },
  timeRight: { paddingRight: 4 },
  timeLeft: { paddingLeft: 4 },
});
