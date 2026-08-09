import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { colors } from "../../theme/tokens";

export function SkeletonLine({ style }: { style?: StyleProp<ViewStyle> }) {
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1500, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <View style={[styles.track, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [
              {
                translateX: shimmer.interpolate({ inputRange: [-1, 1], outputRange: ["-100%", "320%"] }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 16,
    overflow: "hidden",
    borderRadius: 9999,
    backgroundColor: colors.secondary,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "33%",
    backgroundColor: `${colors.background}cc`,
  },
});
