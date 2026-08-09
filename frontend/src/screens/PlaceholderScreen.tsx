import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/tokens";

/**
 * Placeholder home screen.
 *
 * This project was scaffolded from the folder structure of the original app
 * WITHOUT its screens. Build real screens under `src/screens/` and wire them
 * into `src/navigation/RootStack.tsx`, then remove this file.
 */
export function PlaceholderScreen() {
  return (
    <SafeAreaView style={styles.screen} testID="placeholder-screen">
      <View style={styles.center}>
        <Text style={styles.title}>WomenSafty</Text>
        <Text style={styles.subtitle}>Starter scaffold — add your screens in src/screens</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: colors.mutedForeground,
  },
});
