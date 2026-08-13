import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing, Vibration } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Phone,
  PhoneOff,
  MicOff,
  Volume2,
  Grid,
  Heart,
  UserCheck,
  ChevronUp,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/tokens";
import { soundService } from "../services/soundService";
import { fakeCallService } from "../services/fakeCallService";
import { FakeCallConfig } from "../types/fakeCall";

export function IncomingCallScreen() {
  const navigation = useNavigation();
  const [callStatus, setCallStatus] = useState<"incoming" | "active">("incoming");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [config, setConfig] = useState<FakeCallConfig | null>(null);

  // Calling Animation: Pulsing Ripple Rings
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    async function loadConfig() {
      const cfg = await fakeCallService.getConfig();
      setConfig(cfg);
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (!config) return;

    if (callStatus === "incoming") {
      setDurationSeconds(0);

      // 1. Play Ringtone
      soundService.playRingtone(config.ringtone);

      // 2. Start Vibrate if enabled
      if (config.vibrate) {
        Vibration.vibrate([1000, 1000], true);
      }

      // 3. Start Pulsing Ringing Animation
      const animationLoop = Animated.loop(
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animationLoop.start();

      return () => {
        animationLoop.stop();
        pulseAnim.setValue(1);
        opacityAnim.setValue(0.6);
        Vibration.cancel();
      };
    } else {
      soundService.stopRingtone();
      Vibration.cancel();
    }
  }, [config, callStatus]);

  // Active call timer interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (callStatus === "active") {
      interval = setInterval(() => {
        setDurationSeconds((sec) => sec + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      soundService.stopRingtone();
      soundService.stopVoice();
      Vibration.cancel();
    };
  }, []);

  const handleAcceptCall = async () => {
    await soundService.stopRingtone();
    Vibration.cancel();
    setCallStatus("active");
    if (config?.autoPlayVoice && config?.callerName) {
      soundService.playVoice(config.callerName);
    }
  };

  const handleRejectCall = async () => {
    await soundService.stopRingtone();
    await soundService.stopVoice();
    Vibration.cancel();
    navigation.goBack();
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getAvatarIcon = () => {
    if (config?.callerName === "Dad ❤️") return UserCheck;
    return Heart;
  };

  const AvatarIcon = getAvatarIcon();
  const isAndroid = true; // Hardcoded android style for simplicity as per user prompt wanting glassmorphism android look

  if (!config) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{color: '#fff'}}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#111827", "#0f172a", "#030712"]}
        style={StyleSheet.absoluteFill}
      />

      {/* 1. TOP HEADER LAYOUT */}
      <View style={styles.topHeader}>
        <Text style={styles.callStatusText}>
          {callStatus === "incoming"
            ? "Incoming call..."
            : formatTimer(durationSeconds)}
        </Text>

        <Text style={styles.callerName}>{config.callerName}</Text>
        <Text style={styles.callerNumber}>Mobile +1 (555) 019-2831</Text>
      </View>

      {/* 2. CENTER CALLER PHOTO & CALLING ANIMATION */}
      <View style={styles.avatarContainer}>
        {/* Animated Ringing Wave Ripple */}
        {callStatus === "incoming" ? (
          <Animated.View
            style={[
              styles.rippleRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: opacityAnim,
                borderColor: "#38bdf8",
              },
            ]}
          />
        ) : null}

        <View style={styles.avatarRingAndroid}>
          <View style={styles.avatarCore}>
            <AvatarIcon size={64} color={colors.foreground} />
          </View>
        </View>
      </View>

      {/* 3. BOTTOM ACTION CONTROLS */}
      {callStatus === "incoming" ? (
        <View style={styles.androidActionsWrap}>
          <View style={styles.swipeHintWrap}>
            <ChevronUp size={20} color="#94a3b8" />
            <Text style={styles.swipeHintText}>Swipe or tap to answer</Text>
          </View>

          <View style={styles.incomingActionsRow}>
            <View style={styles.actionBtnCol}>
              <Pressable onPress={handleRejectCall} style={[styles.callBtn, styles.declineBtnAndroid]}>
                <PhoneOff size={30} color="#ffffff" />
              </Pressable>
              <Text style={styles.btnLabel}>Decline</Text>
            </View>

            <View style={styles.actionBtnCol}>
              <Pressable onPress={handleAcceptCall} style={[styles.callBtn, styles.acceptBtnAndroid]}>
                <Phone size={30} color="#ffffff" />
              </Pressable>
              <Text style={styles.btnLabel}>Answer</Text>
            </View>
          </View>
        </View>
      ) : (
        /* ACTIVE CALL ACTIONS */
        <View style={styles.activeActionsContainer}>
          <View style={styles.secondaryControlsRow}>
            <Pressable
              onPress={() => setIsMuted(!isMuted)}
              style={[styles.iconToolBtn, isMuted && styles.iconToolActive]}
            >
              <MicOff size={24} color="#ffffff" />
              <Text style={styles.toolLabel}>Mute</Text>
            </Pressable>

            <Pressable style={styles.iconToolBtn}>
              <Grid size={24} color="#ffffff" />
              <Text style={styles.toolLabel}>Keypad</Text>
            </Pressable>

            <Pressable
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
              style={[styles.iconToolBtn, isSpeakerOn && styles.iconToolActive]}
            >
              <Volume2 size={24} color="#ffffff" />
              <Text style={styles.toolLabel}>Speaker</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleRejectCall} style={[styles.callBtn, styles.declineBtnAndroid, styles.endCallBig]}>
            <PhoneOff size={36} color="#ffffff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  topHeader: {
    alignItems: "center",
    marginTop: 20,
  },
  callStatusText: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  callerName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
  },
  callerNumber: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 40,
    position: "relative",
  },
  rippleRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
  },
  avatarRingAndroid: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "#38bdf840",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38bdf810",
  },
  avatarCore: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: `${colors.surface}ff`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  incomingActionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  androidActionsWrap: {
    gap: 16,
    marginBottom: 10,
  },
  swipeHintWrap: {
    alignItems: "center",
    gap: 2,
  },
  swipeHintText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  actionBtnCol: {
    alignItems: "center",
    gap: 8,
  },
  callBtn: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnAndroid: {
    backgroundColor: "#10b981",
  },
  declineBtnAndroid: {
    backgroundColor: "#f43f5e",
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  activeActionsContainer: {
    alignItems: "center",
    gap: 32,
    marginBottom: 10,
  },
  secondaryControlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  iconToolBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.surface}40`,
    gap: 4,
  },
  iconToolActive: {
    backgroundColor: colors.primary,
  },
  toolLabel: {
    fontSize: 11,
    color: "#ffffff",
  },
  endCallBig: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
});
