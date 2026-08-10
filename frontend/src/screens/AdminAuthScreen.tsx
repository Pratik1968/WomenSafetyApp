import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { colors } from "../theme/tokens";
import { Screen } from "../components/ds/Screen";
import { Card } from "../components/ds/Card";
import { AppButton } from "../components/ds/AppButton";
import { AppInput } from "../components/ds/Field";
import { adminLogin } from "../data/adminAuth";

/**
 * Web-only sign-in gate for the Admin console. Authenticates against the `admin_users` table via
 * user-service/admin/login; on success `adminLogin` stashes the session token and we reveal the
 * console. Bad credentials surface the server's message.
 */
export function AdminAuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  async function onSignIn() {
    if (!canSubmit) return;
    setError(null);
    setBusy(true);
    try {
      await adminLogin(email, password);
      onAuthed();
    } catch (e) {
      setError((e as Error)?.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.center}>
        <Card style={styles.card}>
          <View style={styles.badge}>
            <ShieldCheck size={26} color={colors.primary} />
          </View>
          <Text style={styles.title}>Admin console</Text>
          <Text style={styles.subtitle}>Sign in to manage incidents, users, and system health.</Text>

          <View style={styles.form}>
            <AppInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <AppInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoComplete="password"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <AppButton size="md" loading={busy} disabled={!canSubmit} onPress={onSignIn}>
              Sign in
            </AppButton>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", maxWidth: 420, padding: 24, gap: 8, alignItems: "stretch" },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  subtitle: { fontSize: 14, color: colors.mutedForeground, lineHeight: 20 },
  form: { gap: 12, marginTop: 16 },
  error: { fontSize: 13, color: colors.emergency, marginTop: -2 },
});
