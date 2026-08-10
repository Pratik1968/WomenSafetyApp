import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/tokens";

export function HomeStubScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Text style={styles.title}>You're in.</Text>
        <Text style={styles.body}>
          Phase 1 complete — the home tab experience, SOS, and the rest of Aegis arrive in the next phase.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  title: { fontSize: 28, fontWeight: "600", letterSpacing: -0.28, color: colors.foreground },
  body: { marginTop: 12, fontSize: 16, lineHeight: 26, textAlign: "center", color: colors.mutedForeground },
});
