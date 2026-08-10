import { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown, Search } from "lucide-react-native";
import { signInWithPhoneNumber, signOut } from "@react-native-firebase/auth";
import { auth, clearPasswordSessionToken } from "../services/firebaseConfig";
import { AppButton } from "../components/ds/AppButton";
import { AppInput } from "../components/ds/Field";
import { BottomSheet } from "../components/ds/BottomSheet";
import { ListItem } from "../components/ds/ListItem";
import { NavBar } from "../components/ds/NavBar";
import { COUNTRIES, type Country } from "../data/countries";
import { colors } from "../theme/tokens";
import { useAuth } from "../context";

export type PhoneScreenState = "empty" | "filled" | "invalid" | "loading";

export function PhoneScreen({
  state = "empty",
  onBack,
  onContinue,
}: {
  state?: PhoneScreenState;
  onBack?: () => void;
  onContinue?: (phone: string, confirmation: any) => void;
}) {
  const { isAuthenticated, user } = useAuth();
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [value, setValue] = useState(state === "empty" ? "" : state === "invalid" ? "98123" : "98765 43210");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const digits = value.replace(/\D/g, "");
  const complete = digits.length === country.digits;
  const invalid = state === "invalid" || (digits.length > 0 && digits.length > country.digits);
  const loading = state === "loading" || busy;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase() === q,
    );
  }, [query]);

  const handleSendOtp = async () => {
    const fullPhone = `${country.dial}${value.replace(/\s/g, "")}`;
    setBusy(true);
    try {
      await clearPasswordSessionToken();
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      const confirmation = await signInWithPhoneNumber(auth, fullPhone);
      setBusy(false);
      onContinue?.(fullPhone, confirmation);
    } catch (err: any) {
      setBusy(false);
      Alert.alert(
        "Failed to send OTP",
        err.message || "Please check your phone number and try again. Ensure Phone Authentication is enabled in Firebase Console."
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <NavBar
          onBack={onBack}
        />

        <View style={styles.content}>
          <Text style={styles.headline}>What's your number?</Text>
          <Text style={styles.body}>We'll text you a 6-digit code to verify it's really you.</Text>

          <View style={styles.row}>
            <Pressable onPress={() => setSheetOpen(true)} style={styles.countryButton}>
              <Text style={styles.flag}>{country.flag}</Text>
              <Text style={styles.dial}>{country.dial}</Text>
              <ChevronDown size={16} color={colors.mutedForeground} />
            </Pressable>
            <View style={styles.inputWrap}>
              <AppInput
                value={value}
                onChangeText={setValue}
                keyboardType="phone-pad"
                placeholder="00000 00000"
                invalid={invalid}
                hint={invalid ? "That number doesn't look complete." : `${digits.length}/${country.digits} digits`}
              />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <AppButton
            disabled={!complete || invalid}
            loading={loading}
            onPress={handleSendOtp}
          >
            Continue
          </AppButton>
          <Text style={styles.legal}>Standard message rates may apply.</Text>
        </View>
      </KeyboardAvoidingView>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Select country">
        <View style={styles.searchRow}>
          <Search size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={`${colors.mutedForeground}b3`}
            style={styles.searchInput}
          />
        </View>
        {results.map((c) => (
          <ListItem
            key={c.code}
            title={c.name}
            subtitle={c.dial}
            selected={c.code === country.code}
            trailing={<Text style={styles.flag}>{c.flag}</Text>}
            onPress={() => {
              setCountry(c);
              setSheetOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  skipText: { fontSize: 14, fontWeight: "600", color: colors.primary, paddingHorizontal: 12 },
  content: { flex: 1, paddingHorizontal: 32, paddingTop: 16 },
  headline: { fontSize: 30, lineHeight: 35, fontWeight: "600", letterSpacing: -0.9, color: colors.foreground },
  body: { marginTop: 12, fontSize: 16, lineHeight: 26, color: colors.mutedForeground },
  row: { marginTop: 32, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  countryButton: {
    height: 64,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
  },
  flag: { fontSize: 22, lineHeight: 22 },
  dial: { fontSize: 19, fontWeight: "500", letterSpacing: -0.19, color: colors.foreground },
  inputWrap: { flex: 1, minWidth: 0 },
  footer: { paddingHorizontal: 32, paddingBottom: 16 },
  legal: { marginTop: 16, textAlign: "center", fontSize: 13, color: colors.mutedForeground },
  searchRow: {
    marginHorizontal: 8,
    marginBottom: 12,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: "100%", fontSize: 16, color: colors.foreground },
});
