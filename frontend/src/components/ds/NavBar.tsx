import type { ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { colors } from "../../theme/tokens";

export function NavBar({
  title,
  onBack,
  action,
}: {
  title?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityLabel="Back"
            accessibilityRole="button"
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.side, styles.sideEnd]}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  side: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  sideEnd: {
    alignItems: "flex-end",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    backgroundColor: colors.surface,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.16,
    color: colors.foreground,
  },
});
