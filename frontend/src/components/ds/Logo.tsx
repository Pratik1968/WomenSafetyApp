import { Image, Text, StyleSheet, type TextStyle, type StyleProp } from "react-native";
import { colors } from "../../theme/tokens";

export function AegisMark({ size = 72 }: { size?: number }) {
  return (
    <Image
      testID="aegis-mark"
      source={require("../../assets/aegis-logo.png")}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Aegis logo"
    />
  );
}

export function AegisWordmark({ style }: { style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.wordmark, style]}>Aegis</Text>;
}

const styles = StyleSheet.create({
  wordmark: {
    fontSize: 26,
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: -0.52,
    color: colors.foreground,
  },
});
