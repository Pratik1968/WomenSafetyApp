import { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, StyleSheet, Platform, PermissionsAndroid } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Users, Bell, Camera as CameraIcon, Footprints, MapPin, Mic as MicIcon, ShieldCheck, type LucideIcon } from "lucide-react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Contacts from "expo-contacts";
import { Card } from "../components/ds/Card";
import { ProgressBar } from "../components/ds/ProgressBar";
import { Dialog } from "../components/ds/Dialog";
import { AppButton } from "../components/ds/AppButton";
import { colors } from "../theme/tokens";

export type PermissionKey = "location" | "notifications" | "contacts" | "activity" | "microphone" | "camera";
export type PermissionState = "ask" | "requesting" | "granted" | "denied";

export type PermissionSpec = {
  key: PermissionKey;
  icon: LucideIcon;
  title: string;
  reason: string;
  detail: string;
  systemBody: string;
  deniedBody: string;
};

// First-Time Setup (Onboarding) Permissions
export const PERMISSIONS: PermissionSpec[] = [
  {
    key: "location",
    icon: MapPin,
    title: "Location Monitoring",
    reason: "We will monitor your location during SOS Mode and Safety Mode.",
    detail:
      "Selecting 'Allow all the time' lets Aegis monitor your live location during SOS Mode and Safety Mode. This ensures your route is continuously tracked and emergency contacts receive live GPS updates even when your phone screen is locked or in your bag.",
    systemBody: "Allow Aegis to access your location all the time?",
    deniedBody: "Without background location, live GPS tracking cannot monitor your location during SOS Mode or Safety Mode when your screen is locked.",
  },
  {
    key: "notifications",
    icon: Bell,
    title: "Send you alerts",
    reason: "So you hear about safety risks in real time.",
    detail:
      "Aegis notifies you when a contact responds to an SOS, during journey updates, and for real-time safety alerts.",
    systemBody: "Allow Aegis to send you notifications?",
    deniedBody: "You will not receive instant safety updates or SOS status responses.",
  },
  {
    key: "camera",
    icon: CameraIcon,
    title: "Camera Access",
    reason: "To record video evidence or photo reports when requested.",
    detail:
      "Used to attach photos to safety reports or capture video evidence during an active SOS emergency.",
    systemBody: "Allow Aegis to access the camera?",
    deniedBody: "You won't be able to record video evidence or attach photo reports.",
  },
  {
    key: "microphone",
    icon: MicIcon,
    title: "Microphone Access",
    reason: "To record audio evidence during an emergency.",
    detail:
      "Used for audio recording during an active SOS emergency or voice trigger activation.",
    systemBody: "Allow Aegis to access the microphone?",
    deniedBody: "Audio evidence will not be recorded during an SOS.",
  },
];

// Feature-Based Just-In-Time Permissions (Ask Later when feature is used)
export const JUST_IN_TIME_PERMISSIONS: Record<string, PermissionSpec> = {
  contacts: {
    key: "contacts",
    icon: Users,
    title: "Access emergency contacts",
    reason: "To select trusted emergency contacts.",
    detail: "Choose trusted contacts from your phone to notify instantly during an emergency SOS alert.",
    systemBody: "Allow Aegis to access your contacts?",
    deniedBody: "You won't be able to select emergency contacts directly from your phonebook.",
  },
  activity: {
    key: "activity",
    icon: Footprints,
    title: "Motion & Activity",
    reason: "To detect sudden stops or fall events.",
    detail: "Enables Safety Mode to notice fall events or sudden stops.",
    systemBody: "Allow Aegis to detect motion & activity?",
    deniedBody: "Safety Mode will not be able to auto-detect falls.",
  },
};

export async function requestNativePermission(key: PermissionKey): Promise<boolean> {
  try {
    if (key === "location") {
      if (typeof Location?.requestForegroundPermissionsAsync === "function") {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus === "granted" && typeof Location?.requestBackgroundPermissionsAsync === "function") {
          try {
            await Location.requestBackgroundPermissionsAsync();
          } catch (bgErr) {
            console.warn("Background location request fallback:", bgErr);
          }
        }
        return fgStatus === "granted";
      }
    } else if (key === "notifications") {
      if (typeof Notifications?.requestPermissionsAsync === "function") {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === "granted";
      }
    } else if (key === "contacts") {
      if (typeof Contacts?.requestPermissionsAsync === "function") {
        const { status } = await Contacts.requestPermissionsAsync();
        return status === "granted";
      }
    } else if (key === "camera") {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Access Required",
            message: "Aegis requires camera access to attach photos to safety reports.",
            buttonPositive: "Allow",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } else if (key === "microphone") {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Access Required",
            message: "Aegis requires microphone access to record audio during emergency alerts and for voice activation.",
            buttonPositive: "Allow",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    }
  } catch (err) {
    console.warn(`Native permission request failed for ${key}:`, err);
  }
  return true;
}

export function PermissionScreen({
  index = 0,
  state = "ask",
  onAllow,
  onSkip,
}: {
  index?: number;
  state?: PermissionState;
  onAllow?: () => void;
  onSkip?: () => void;
}) {
  const spec = PERMISSIONS[index] || PERMISSIONS[0];
  const Icon = spec.icon;
  const [local, setLocal] = useState<PermissionState>(state);
  const animValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    animValue.setValue(0.85);
    Animated.spring(animValue, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [local, animValue]);

  const handleAllowPress = async () => {
    if (local === "granted") {
      onAllow?.();
      return;
    }
    setLocal("requesting");
    const granted = await requestNativePermission(spec.key);
    if (granted) {
      setLocal("granted");
      onAllow?.();
    } else {
      setLocal("denied");
    }
  };

  const iconBubbleStyle =
    local === "granted" ? styles.bubbleGranted : local === "denied" ? styles.bubbleDenied : styles.bubbleAsk;
  const iconColor = local === "granted" ? colors.success : local === "denied" ? colors.warning : colors.primary;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <ProgressBar value={(index + 1) / PERMISSIONS.length} />
        <Text style={styles.stepCaption}>
          Permission {index + 1} of {PERMISSIONS.length}
        </Text>
      </View>

      <View style={styles.content}>
        <Animated.View style={[styles.bubble, iconBubbleStyle, { transform: [{ scale: animValue }] }]}>
          {local === "granted" ? <ShieldCheck size={32} color={colors.success} strokeWidth={1.5} /> : <Icon size={32} color={iconColor} strokeWidth={1.5} />}
        </Animated.View>

        <Text style={styles.title}>{local === "granted" ? "Thank you" : spec.title}</Text>
        <Text style={styles.reason}>{local === "granted" ? "Permission granted. Next one." : spec.reason}</Text>

        <Card style={styles.detailCard}>
          <Text style={styles.detailText}>{local === "denied" ? spec.deniedBody : spec.detail}</Text>
        </Card>
      </View>

      <View style={styles.footer}>
        <AppButton
          loading={local === "requesting"}
          onPress={handleAllowPress}
        >
          {local === "denied" ? "Open settings" : local === "granted" ? "Continue" : "Allow"}
        </AppButton>
        <AppButton variant="ghost" size="md" onPress={onSkip}>
          Not now
        </AppButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 32, paddingTop: 16 },
  stepCaption: { marginTop: 12, fontSize: 13, fontWeight: "500", letterSpacing: 0.52, textTransform: "uppercase", color: colors.mutedForeground },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  bubble: { marginBottom: 32, width: 76, height: 76, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  bubbleAsk: { backgroundColor: `${colors.primary}0a` },
  bubbleGranted: { backgroundColor: `${colors.success}0f` },
  bubbleDenied: { backgroundColor: `${colors.warning}0f` },
  title: { fontSize: 30, lineHeight: 35, fontWeight: "600", letterSpacing: -0.9, color: colors.foreground },
  reason: { marginTop: 12, fontSize: 16, lineHeight: 26, color: colors.mutedForeground },
  detailCard: { marginTop: 24 },
  detailText: { fontSize: 15, lineHeight: 24, color: colors.mutedForeground },
  footer: { gap: 8, paddingHorizontal: 32, paddingBottom: 8 },
});
