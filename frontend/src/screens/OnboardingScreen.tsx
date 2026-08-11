import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Aurora } from "../components/ds/Aurora";
import { AppButton } from "../components/ds/AppButton";
import { PagerDots } from "../components/ds/PagerDots";
import { colors } from "../theme/tokens";

export const ONBOARDING_STEPS = [
  {
    image: require("../assets/onboarding-companion.png"),
    title: "Your personal safety companion",
    body: "Aegis stays quietly in the background while you move through your day, and is one tap away when you need it.",
  },
  {
    image: require("../assets/onboarding-protection.png"),
    title: "Assisted protection",
    body: "Aegis watches for signals like a sudden fall, a long stop in an unfamiliar place, or a shaken phone. It cannot predict or prevent harm — it makes asking for help faster.",
  },
  {
    image: require("../assets/onboarding-help.png"),
    title: "Help reaches faster",
    body: "One press shares your live location, starts recording, and alerts your emergency contacts and nearby help at the same time.",
  },
] as const;

export function OnboardingScreen({
  step = 0,
  onNext,
  onSkip,
}: {
  step?: number;
  onNext?: () => void;
  onSkip?: () => void;
}) {
  const item = ONBOARDING_STEPS[Math.min(step, ONBOARDING_STEPS.length - 1)];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <SafeAreaView style={styles.screen}>
      <Aurora intensity="soft" />
      <View style={styles.topRow}>
        {!isLast ? (
          <Pressable onPress={onSkip}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.imageWrap}>
          <Image source={item.image} style={styles.image} resizeMode="contain" />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.body}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <PagerDots count={ONBOARDING_STEPS.length} active={step} />
        <View style={styles.buttonWrap}>
          <AppButton onPress={onNext}>{isLast ? "Get started" : "Continue"}</AppButton>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topRow: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 16 },
  skip: { paddingHorizontal: 12, fontSize: 15, fontWeight: "500", color: colors.mutedForeground },
  body: { flex: 1 },
  imageWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  image: { width: 320, height: 320, opacity: 1 },
  copy: { paddingHorizontal: 32, paddingBottom: 8 },
  title: { fontSize: 32, lineHeight: 36, fontWeight: "600", letterSpacing: -0.96, color: colors.foreground },
  description: { marginTop: 16, fontSize: 16, lineHeight: 26, color: colors.mutedForeground },
  footer: { paddingHorizontal: 32, paddingTop: 32, paddingBottom: 16 },
  buttonWrap: { marginTop: 24 },
});
