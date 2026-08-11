/**
 * SosCountdownOverlay.tsx
 *
 * Full-screen modal overlay shown between the SOS trigger event and the actual
 * SOS activation. Gives the user 4 seconds to cancel an accidental trigger.
 *
 * Used by:
 *   - HomeScreen (button hold trigger)
 *   - HomeScreen (shake trigger)
 *
 * Props:
 *   visible        — controls Modal visibility
 *   onFire         — called when countdown reaches 0 (SOS should activate)
 *   onCancel       — called when user taps "Cancel" or countdown is dismissed
 *   triggerSource  — 'BUTTON' | 'SHAKE' (shown in subtitle for context)
 *   durationSecs   — countdown length in seconds (default: 4)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
  StatusBar,
} from "react-native";
import { colors, radii } from "../../theme/tokens";
import type { SOSTriggerSource } from "../../services/sosOrchestratorService";

interface SosCountdownOverlayProps {
  visible: boolean;
  onFire: () => void;
  onCancel: () => void;
  triggerSource?: SOSTriggerSource;
  durationSecs?: number;
}

export function SosCountdownOverlay({
  visible,
  onFire,
  onCancel,
  triggerSource = "BUTTON",
  durationSecs = 4,
}: SosCountdownOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSecs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFired = useRef(false);

  // Pulse animation on the big number
  const pulse = useRef(new Animated.Value(1)).current;
  // Ring expansion animation (repeating)
  const ring = useRef(new Animated.Value(0)).current;

  // ── Start / reset when overlay becomes visible ─────────────
  useEffect(() => {
    if (!visible) return;

    hasFired.current = false;
    setSecondsLeft(durationSecs);

    // Pulsing ring animation
    const ringLoop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    ring.setValue(0);
    ringLoop.start();

    // Tick down
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          if (!hasFired.current) {
            hasFired.current = true;
            onFire();
          }
          return 0;
        }
        // Pulse the number on each tick
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 80, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      ringLoop.stop();
    };
  }, [visible]);

  const handleCancel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    hasFired.current = true; // prevent onFire from also firing
    onCancel();
  }, [onCancel]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.6, 0.2, 0] });

  const triggerLabel =
    triggerSource === "SHAKE" ? "Shake detected" : "SOS button pressed";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <StatusBar backgroundColor="rgba(239,68,68,0.96)" barStyle="light-content" />
      <View style={styles.backdrop}>

        {/* Expanding rings behind the number */}
        <Animated.View
          style={[
            styles.ring,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />

        {/* Countdown number */}
        <Animated.Text
          style={[styles.countdownNumber, { transform: [{ scale: pulse }] }]}
        >
          {secondsLeft}
        </Animated.Text>

        <Text style={styles.activatingLabel}>SOS activating…</Text>
        <Text style={styles.triggerSource}>{triggerLabel}</Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${((durationSecs - secondsLeft) / durationSecs) * 100}%`,
              },
            ]}
          />
        </View>

        {/* Cancel button */}
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.cancelButtonPressed,
          ]}
          onPress={handleCancel}
          accessibilityLabel="Cancel SOS"
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel — I'm Safe</Text>
        </Pressable>

        <Text style={styles.hint}>
          Releases automatically in {secondsLeft}s
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(239,68,68,0.96)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  ring: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: `${colors.emergencyForeground}60`,
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: "800",
    color: colors.emergencyForeground,
    lineHeight: 130,
    includeFontPadding: false,
  },
  activatingLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.emergencyForeground,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  triggerSource: {
    fontSize: 14,
    color: `${colors.emergencyForeground}cc`,
    marginTop: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  progressTrack: {
    width: "100%",
    height: 5,
    backgroundColor: `${colors.emergencyForeground}30`,
    borderRadius: 3,
    marginTop: 36,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.emergencyForeground,
    borderRadius: 3,
  },
  cancelButton: {
    marginTop: 36,
    width: "100%",
    height: 60,
    backgroundColor: colors.emergencyForeground,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  cancelText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.emergency,
    letterSpacing: 0.2,
  },
  hint: {
    marginTop: 16,
    fontSize: 13,
    color: `${colors.emergencyForeground}80`,
  },
});
