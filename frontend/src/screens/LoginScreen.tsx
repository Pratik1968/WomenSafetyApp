import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lock, Eye, EyeOff, ShieldCheck, Phone } from "lucide-react-native";
import { signOut } from "@react-native-firebase/auth";
import { AppButton } from "../components/ds/AppButton";
import { AppInput } from "../components/ds/Field";
import { NavBar } from "../components/ds/NavBar";
import { colors } from "../theme/tokens";
import { API_BASE_URL } from "../api/config";
import { setCurrentProfile, clearCurrentProfile } from "../services/profileService";
import { auth, clearPasswordSessionToken, setPasswordSessionToken } from "../services/firebaseConfig";

export function LoginScreen({
  onBack,
  onLoggedIn,
  onUsePhoneOtp,
}: {
  onBack?: () => void;
  onLoggedIn?: () => void;
  onUsePhoneOtp?: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async () => {
    if (!identifier.trim()) {
      Alert.alert("Missing details", "Please enter your registered phone number or email.");
      return;
    }
    if (!password) {
      Alert.alert("Missing password", "Please enter your app password.");
      return;
    }

    setLoading(true);
    try {
      clearCurrentProfile();
      await clearPasswordSessionToken();
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      setLoading(false);
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (data.access_token) {
          await setPasswordSessionToken(data.access_token);
        }
        if (data.user) {
          setCurrentProfile(data.user);
        }
        onLoggedIn?.();
      } else {
        const detailMsg = data.detail || "Invalid login credentials. Please try again.";
        Alert.alert(
          "Authentication Failed",
          detailMsg,
          [
            { text: "Sign in with Phone OTP", onPress: onUsePhoneOtp },
            { text: "Try Again", style: "cancel" },
          ]
        );
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Connection error", "Could not reach backend server. Please check your network connection and try again.");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <NavBar onBack={onBack} title="Secure Login" />

      <View style={styles.content}>
        <View style={styles.iconHeader}>
          <View style={styles.badgeWrap}>
            <ShieldCheck size={36} color={colors.primary} />
          </View>
          <Text style={styles.headline}>Welcome back</Text>
          <Text style={styles.body}>
            Sign in using your app password. New here? Use your phone number to get started.
          </Text>
        </View>

        <View style={styles.formGroup}>
          <AppInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Email or Phone number"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.passwordContainer}>
            <View style={{ flex: 1 }}>
              <AppInput
                value={password}
                onChangeText={setPassword}
                placeholder="App password"
                secureTextEntry={!showPassword}
              />
            </View>
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff size={20} color={colors.mutedForeground} />
              ) : (
                <Eye size={20} color={colors.mutedForeground} />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.infoCard}>
          <ShieldCheck size={16} color={colors.primary} />
          <Text style={styles.infoText}>
            App password is set from your Profile after signing in with your phone number.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton
          loading={loading}
          disabled={!identifier.trim() || !password}
          onPress={handlePasswordLogin}
          leading={<Lock size={18} color={colors.primaryForeground} />}
        >
          Log in with Password
        </AppButton>

        <Pressable onPress={onUsePhoneOtp} style={styles.otpLink}>
          <Phone size={16} color={colors.mutedForeground} />
          <Text style={styles.otpLinkText}>Sign in with Phone OTP instead</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 32, paddingTop: 8 },
  iconHeader: { alignItems: "flex-start", marginBottom: 24 },
  badgeWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  headline: { fontSize: 28, lineHeight: 34, fontWeight: "600", letterSpacing: -0.8, color: colors.foreground },
  body: { marginTop: 8, fontSize: 15, lineHeight: 22, color: colors.mutedForeground },
  formGroup: { gap: 16, marginBottom: 20 },
  passwordContainer: { flexDirection: "row", alignItems: "center" },
  eyeBtn: { position: "absolute", right: 16, padding: 8 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.mutedForeground },
  footer: { paddingHorizontal: 32, paddingBottom: 24, gap: 16 },
  otpLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  otpLinkText: { fontSize: 14, fontWeight: "500", color: colors.mutedForeground, textDecorationLine: "underline" },
});
