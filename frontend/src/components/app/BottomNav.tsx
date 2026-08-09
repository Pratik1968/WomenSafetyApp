import { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated, Easing, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Home, Shield, Clock, User, Sparkles, type LucideIcon } from "lucide-react-native";
import { colors, gradientBrand } from "../../theme/tokens";

export type TabKey = "home" | "safety" | "history" | "profile";

const TABS: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "home", label: "Home", icon: Home },
  { key: "safety", label: "Safety", icon: Shield },
  { key: "history", label: "History", icon: Clock },
  { key: "profile", label: "Profile", icon: User },
];

export function SosButton({ onPress, size = 68 }: { onPress?: () => void; size?: number }) {
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [ring]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.5] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Pressable onPress={onPress} accessibilityLabel="Press and hold to send SOS" style={[styles.sosButton, { width: size, height: size }]}>
      <Animated.View
        style={[styles.sosRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
      />
      <View style={styles.sosCore}>
        <Text style={styles.sosText}>SOS</Text>
      </View>
    </Pressable>
  );
}

export function AssistantFab({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="Open AI assistant" style={styles.fab}>
      <LinearGradient colors={gradientBrand as unknown as [string, string, ...string[]]} style={styles.fabIcon}>
        <Sparkles size={15} color={colors.primaryForeground} />
      </LinearGradient>
      <Text style={styles.fabText}>Ask Aegis</Text>
    </Pressable>
  );
}

function TabButton({ tab, active, onPress }: { tab: (typeof TABS)[number]; active: boolean; onPress: () => void }) {
  const Icon = tab.icon;
  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Icon size={22} color={active ? colors.primary : colors.mutedForeground} strokeWidth={active ? 2.3 : 1.8} />
      <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.mutedForeground }]}>{tab.label}</Text>
    </Pressable>
  );
}

export function BottomNav({
  active,
  onSelect,
  onSos,
  sos = true,
  assistant = true,
  onAssistant,
}: {
  active: TabKey;
  onSelect?: (t: TabKey) => void;
  onSos?: () => void;
  sos?: boolean;
  assistant?: boolean;
  onAssistant?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      {assistant ? (
        <View style={styles.fabPosition} pointerEvents="box-none">
          <AssistantFab onPress={onAssistant} />
        </View>
      ) : null}

      {sos ? (
        <View style={styles.sosPosition} pointerEvents="box-none">
          <View style={styles.sosBackdrop}>
            <SosButton onPress={onSos} />
          </View>
        </View>
      ) : null}

      <View style={styles.nav}>
        {TABS.slice(0, 2).map((tab) => (
          <TabButton key={tab.key} tab={tab} active={active === tab.key} onPress={() => onSelect?.(tab.key)} />
        ))}
        <View style={styles.spacer} />
        {TABS.slice(2).map((tab) => (
          <TabButton key={tab.key} tab={tab} active={active === tab.key} onPress={() => onSelect?.(tab.key)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  fabPosition: { position: "absolute", top: -56, right: 16, zIndex: 20, alignItems: "flex-end" },
  sosPosition: { position: "absolute", left: 0, right: 0, top: -32, zIndex: 20, alignItems: "center" },
  sosBackdrop: { backgroundColor: colors.background, borderRadius: 9999, padding: 6 },
  sosButton: { alignItems: "center", justifyContent: "center", borderRadius: 9999 },
  sosRing: { ...StyleSheet.absoluteFill, borderRadius: 9999, backgroundColor: `${colors.emergency}40` },
  sosCore: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.emergency,
  },
  sosText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.9, color: colors.emergencyForeground },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: `${colors.background}e6`,
    paddingRight: 16,
    paddingLeft: 10,
  },
  fabIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  fabText: { fontSize: 14, fontWeight: "600", letterSpacing: -0.14, color: colors.foreground },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: `${colors.background}f2`,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  spacer: { width: 72 },
  tabButton: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 },
  tabLabel: { fontSize: 11, fontWeight: "600", letterSpacing: -0.11 },
});
