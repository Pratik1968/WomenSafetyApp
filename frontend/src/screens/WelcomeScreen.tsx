import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Phone } from "lucide-react-native";
import { AegisMark, AegisWordmark } from "../components/ds/Logo";
import { AppButton } from "../components/ds/AppButton";
import { colors } from "../theme/tokens";

export function WelcomeScreen({
  onContinue,
  onSkipTest,
}: {
  onContinue?: () => void;
  onSkipTest?: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topRow}>
        {onSkipTest ? (
          <Pressable onPress={onSkipTest}>
            <Text style={styles.skipText}>⚡ Skip to Home (Test Mode)</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.content}>
        <AegisMark size={80} />
        <View style={styles.copy}>
          <AegisWordmark style={styles.wordmark} />
          <Text style={styles.headline}>Welcome</Text>
          <Text style={styles.body}>
            Sign in with your phone number. It is the only detail we need to reach you in an emergency.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton onPress={onContinue} leading={<Phone size={18} color={colors.primaryForeground} />}>
          Continue with phone number
        </AppButton>
        <Text style={styles.legal}>
          By continuing you agree to our <Text style={styles.legalLink}>Terms of Service</Text> and{" "}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topRow: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 16 },
  skipText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  copy: { marginTop: 32 },
  wordmark: { fontSize: 17, fontWeight: "500", color: colors.mutedForeground },
  headline: { marginTop: 12, fontSize: 34, lineHeight: 37, fontWeight: "600", letterSpacing: -1.02, color: colors.foreground },
  body: { marginTop: 16, maxWidth: 300, fontSize: 16, lineHeight: 26, color: colors.mutedForeground },
  footer: { paddingHorizontal: 32, paddingBottom: 16 },
  legal: { marginTop: 20, textAlign: "center", fontSize: 13, lineHeight: 21, color: colors.mutedForeground },
  legalLink: { fontWeight: "500", color: colors.foreground, textDecorationLine: "underline" },
});
