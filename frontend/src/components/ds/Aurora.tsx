import { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { colors } from "../../theme/tokens";

function useFloat(duration: number, delayMs: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, delay: delayMs, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration, delayMs]);
  return value;
}

type Position = number | `${number}%`;

function Blob({
  color,
  size,
  top,
  left,
  right,
  bottom,
  moveX,
  moveY,
  duration = 8500,
  delayMs = 0,
  center,
}: {
  color: string;
  size: number;
  top?: Position;
  left?: Position;
  right?: Position;
  bottom?: Position;
  moveX: [number, number, number];
  moveY: [number, number, number];
  duration?: number;
  delayMs?: number;
  center?: boolean;
}) {
  const float = useFloat(duration, delayMs);
  const translateX = float.interpolate({ inputRange: [0, 0.5, 1], outputRange: moveX });
  const translateY = float.interpolate({ inputRange: [0, 0.5, 1], outputRange: moveY });
  const scale = float.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.22, 0.85] });

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          top,
          left,
          right,
          bottom,
          marginLeft: center ? -size / 2 : undefined,
          marginTop: center ? -size / 2 : undefined,
          backgroundColor: color,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

export type AuroraIntensity = "soft" | "medium" | "strong";

const INTENSITY_OPACITY: Record<AuroraIntensity, number> = { soft: 0.18, medium: 0.28, strong: 0.38 };

export function Aurora({ intensity = "soft", style }: { intensity?: AuroraIntensity; style?: StyleProp<ViewStyle> }) {
  return (
    <View testID="aurora" style={[styles.container, { opacity: INTENSITY_OPACITY[intensity] }, style]} pointerEvents="none">
      <Blob color={`${colors.brandBlue}50`} size={270} top={-60} left={-40} moveX={[-90, 110, -40]} moveY={[-100, 90, -50]} delayMs={0} />
      <Blob color={`${colors.brandViolet}45`} size={300} top={-10} right={-50} moveX={[70, -120, 60]} moveY={[90, -100, 70]} delayMs={1200} />
      <Blob color={`${colors.brandIndigo}40`} size={240} top={220} left={20} moveX={[-100, 130, -70]} moveY={[100, -110, 60]} delayMs={2400} />
      <Blob color={`${colors.brandPink}40`} size={270} bottom={-30} right={20} moveX={[110, -90, 80]} moveY={[-90, 110, -100]} delayMs={800} />
    </View>
  );
}

export function AuroraHalo({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View testID="aurora-halo" style={[styles.container, style]} pointerEvents="none">
      <Blob color={`${colors.brandIndigo}45`} size={240} top="50%" left="50%" moveX={[-70, 90, -50]} moveY={[-80, 80, -60]} delayMs={0} center />
      <Blob color={`${colors.brandBlue}40`} size={190} top="50%" left="38%" moveX={[80, -90, 60]} moveY={[70, -90, 80]} delayMs={1200} center />
      <Blob color={`${colors.brandPink}40`} size={190} top="58%" left="62%" moveX={[-90, 80, -60]} moveY={[-60, 90, -70]} delayMs={2100} center />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  blob: { position: "absolute", borderRadius: 9999 },
});
