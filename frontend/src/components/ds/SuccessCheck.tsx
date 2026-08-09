import { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/tokens";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function SuccessCheck({ size = 88 }: { size?: number }) {
  const ring = useRef(new Animated.Value(0)).current;
  const draw = useRef(new Animated.Value(48)).current;

  useEffect(() => {
    const ringLoop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    ringLoop.start();
    Animated.timing(draw, {
      toValue: 0,
      duration: 620,
      delay: 160,
      easing: Easing.bezier(0.65, 0, 0.35, 1),
      useNativeDriver: false,
    }).start();
    return () => ringLoop.stop();
  }, [ring, draw]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.5] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.65, 0] });
  const svgSize = size * 0.55;

  return (
    <View testID="success-check" style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.ring,
          { backgroundColor: `${colors.success}2b`, transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      <View style={[styles.halo, { backgroundColor: `${colors.success}33` }]} />
      <Svg width={svgSize} height={svgSize} viewBox="0 0 48 48">
        <AnimatedPath
          d="M12 25.5 L20.5 34 L36 16"
          fill="none"
          stroke={colors.success}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={48}
          strokeDashoffset={draw}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  ring: { ...StyleSheet.absoluteFill, borderRadius: 9999 },
  halo: { position: "absolute", top: 8, left: 8, right: 8, bottom: 8, borderRadius: 9999 },
});
