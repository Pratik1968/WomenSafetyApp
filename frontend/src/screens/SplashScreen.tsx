import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AegisMark, AegisWordmark } from "../components/ds/Logo";
import { colors } from "../theme/tokens";

export function SplashScreen() {
  const bloom = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.timing(bloom, {
      toValue: 1,
      duration: 900,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
    Animated.timing(rise, {
      toValue: 1,
      duration: 520,
      delay: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1500, useNativeDriver: true }),
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, [bloom, rise, shimmer]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Animated.View style={{ opacity: bloom, transform: [{ scale: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }] }}>
          <AegisMark size={112} />
        </Animated.View>
        <Animated.View
          style={[
            styles.copy,
            {
              opacity: rise,
              transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
            },
          ]}
        >
          <AegisWordmark />
          <Text style={styles.tagline}>Safety that stays with you</Text>
        </Animated.View>
      </View>
      <View style={styles.footer}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.trackFill,
              {
                transform: [
                  { translateX: shimmer.interpolate({ inputRange: [-1, 1], outputRange: ["-100%", "220%"] }) },
                ],
              },
            ]}
          />
        </View>
        <Text style={styles.caption}>Securing your session</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  copy: { marginTop: 28, alignItems: "center" },
  tagline: { marginTop: 12, fontSize: 16, letterSpacing: -0.16, color: colors.mutedForeground },
  footer: { alignItems: "center", paddingBottom: 64 },
  track: { height: 4, width: 112, overflow: "hidden", borderRadius: 9999, backgroundColor: colors.secondary },
  trackFill: { position: "absolute", top: 0, bottom: 0, width: "33%", borderRadius: 9999, backgroundColor: colors.primary },
  caption: { marginTop: 20, fontSize: 13, letterSpacing: 0.78, textTransform: "uppercase", color: colors.mutedForeground },
});
