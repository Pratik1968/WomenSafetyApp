import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Phone, Lock } from "lucide-react-native";
import { AegisMark, AegisWordmark } from "../components/ds/Logo";
import { AppButton } from "../components/ds/AppButton";
import { colors } from "../theme/tokens";

export function WelcomeScreen({
  onContinue,
  onSecureLogin,
}: {
  onContinue?: () => void;
  onSecureLogin?: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <AegisMark size={80} />
        <View style={styles.copy}>
          <AegisWordmark style={styles.wordmark} />
          <Text style={styles.headline}>Welcome</Text>
          <Text style={styles.body}>
            Sign in with your phone number, or use your app password if you've already registered.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton onPress={onContinue} leading={<Phone size={18} color={colors.primaryForeground} />}>
          Continue with phone number
        </AppButton>
        <View style={{ marginTop: 12 }}>
          <AppButton
            variant="outline"
            onPress={onSecureLogin}
            leading={<Lock size={18} color={colors.foreground} />}
          >
            Log in with Password
          </AppButton>
        </View>
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
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  copy: { marginTop: 32 },
  wordmark: { fontSize: 17, fontWeight: "500", color: colors.mutedForeground },
  headline: { marginTop: 12, fontSize: 34, lineHeight: 37, fontWeight: "600", letterSpacing: -1.02, color: colors.foreground },
  body: { marginTop: 16, maxWidth: 300, fontSize: 16, lineHeight: 26, color: colors.mutedForeground },
  footer: { paddingHorizontal: 32, paddingBottom: 16 },
  legal: { marginTop: 20, textAlign: "center", fontSize: 13, lineHeight: 21, color: colors.mutedForeground },
  legalLink: { fontWeight: "500", color: colors.foreground, textDecorationLine: "underline" },
});
