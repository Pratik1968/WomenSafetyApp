import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from "react-native";
import {
  Mic,
  Video,
  ShieldAlert,
  Users,
  Check,
  Circle,
  PhoneCall,
  Waves,
  MapPin,
  HeartHandshake,
} from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { AppButton } from "../components/ds/AppButton";
import { Card } from "../components/ds/Card";
import { Dialog } from "../components/ds/Dialog";
import { SuccessCheck } from "../components/ds/SuccessCheck";
import { Aurora } from "../components/ds/Aurora";

export type SosState = "active" | "confirm" | "cancelled";

function LiveRow({
  icon: Icon,
  label,
  value,
  live,
}: {
  icon: typeof Mic;
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <View style={styles.liveRow}>
      <View style={styles.liveIconWrap}>
        <Icon size={17} color={colors.emergencyForeground} strokeWidth={2} />
      </View>
      <View style={styles.liveTextWrap}>
        <Text style={styles.liveLabel}>{label}</Text>
        <Text style={styles.liveValue}>{value}</Text>
      </View>
      {live ? (
        <View style={styles.liveBadge}>
          <Circle size={8} color={colors.emergencyForeground} fill={colors.emergencyForeground} />
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      ) : (
        <Check size={18} color={colors.emergencyForeground} strokeWidth={2.5} />
      )}
    </View>
  );
}

import { useEffect } from "react";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Camera } from "expo-camera";

export function SosScreen({
  state = "active",
  onEnd,
  onCancelConfirm,
  onDone,
  onDeleteRecordings,
}: {
  state?: SosState;
  onEnd?: () => void;
  onCancelConfirm?: () => void;
  onDone?: () => void;
  onDeleteRecordings?: () => void;
}) {
  useEffect(() => {
    if (state === "active") {
      (async () => {
        try {
          if (typeof Location?.requestForegroundPermissionsAsync === "function") {
            await Location.requestForegroundPermissionsAsync();
          }
          if (typeof Notifications?.requestPermissionsAsync === "function") {
            await Notifications.requestPermissionsAsync();
          }
          if (typeof Camera?.requestCameraPermissionsAsync === "function") {
            await Camera.requestCameraPermissionsAsync();
          }
          if (typeof Camera?.requestMicrophonePermissionsAsync === "function") {
            await Camera.requestMicrophonePermissionsAsync();
          }
        } catch (err) {
          console.warn("SOS mode permission trigger error:", err);
        }
      })();
    }
  }, [state]);

  if (state === "cancelled") {
    return (
      <View style={styles.cancelledScreen}>
        <Aurora />
        <View style={styles.cancelledContent}>
          <SuccessCheck size={96} />
          <Text style={styles.cancelledTitle}>Emergency ended</Text>
          <Text style={styles.cancelledSub}>
            Your contacts have been told you're safe. Recording stopped after 4 minutes 12 seconds.
          </Text>
          <Card style={styles.evidenceCard}>
            <Text style={styles.evidenceTitle}>Evidence saved privately</Text>
            <Text style={styles.evidenceSub}>
              1 audio clip and 1 video clip are stored on your account only. Delete them now, or
              request a full wipe from Data & Privacy.
            </Text>
          </Card>
        </View>
        <View style={styles.cancelledFooter}>
          <AppButton onPress={onDone}>Back to Home</AppButton>
          <AppButton variant="ghost" size="md" onPress={onDeleteRecordings}>
            Delete the recordings
          </AppButton>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.activeScreen}>
      <View style={styles.activeContent}>
        <View style={styles.headerBadge}>
          <Waves size={14} color={colors.emergencyForeground} />
          <Text style={styles.headerBadgeText}>EMERGENCY ACTIVE</Text>
        </View>

        <Text style={styles.timerText}>04:12</Text>
        <Text style={styles.timerSub}>Help is being coordinated. Stay with us.</Text>

        <View style={styles.mapStub}>
          <MapPin size={16} color={colors.emergency} />
          <Text style={styles.mapStubText}>Location: 100 Ft Road, Indiranagar</Text>
        </View>

        <ScrollView style={styles.rowsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.rowsCard}>
            <LiveRow icon={Mic} label="Audio recording" value="Continuous since 9:12 PM" live />
            <LiveRow icon={Video} label="Video recording" value="Rear camera · 3 clips saved" live />
            <LiveRow icon={ShieldAlert} label="Monitoring" value="Route and movement watched" live />
            <LiveRow icon={Users} label="Contacts notified" value="Amma, Meera, Nanna" />
          </View>
        </ScrollView>

        <View style={styles.footerActions}>
          <View style={styles.helplineButtonsRow}>
            <Pressable
              style={styles.callHelplineBtn}
              onPress={() => Linking.openURL("tel:112")}
              accessibilityLabel="Call Police Helpline 112"
            >
              <PhoneCall size={18} color={colors.emergencyForeground} strokeWidth={2} />
              <Text style={styles.callPoliceText}>Call police · 112</Text>
            </Pressable>

            <Pressable
              style={[styles.callHelplineBtn, { backgroundColor: `${colors.emergencyForeground}30` }]}
              onPress={() => Linking.openURL("tel:1091")}
              accessibilityLabel="Call Women Helpline 1091"
            >
              <HeartHandshake size={18} color={colors.emergencyForeground} strokeWidth={2} />
              <Text style={styles.callPoliceText}>Women Helpline · 1091</Text>
            </Pressable>
          </View>

          <Pressable onPress={onEnd} style={styles.endEmergencyBtn}>
            <Text style={styles.endEmergencyText}>Hold to end emergency</Text>
          </Pressable>

          <Text style={styles.disclaimerText}>
            Ending needs a long press, so it can't happen by accident
          </Text>
        </View>
      </View>

      <Dialog
        open={state === "confirm"}
        onClose={() => undefined}
        title="End the emergency?"
        body="Your contacts will be told you're safe and recording will stop. You can start again any time."
        actions={
          <View style={styles.dialogActions}>
            <AppButton variant="destructive" onPress={onCancelConfirm}>
              Yes, I'm safe now
            </AppButton>
            <AppButton variant="ghost" size="md" onPress={onDone}>
              Keep it running
            </AppButton>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  activeScreen: { flex: 1, backgroundColor: colors.emergency },
  activeContent: { flex: 1, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: `${colors.emergencyForeground}20`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  headerBadgeText: { color: colors.emergencyForeground, fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  timerText: {
    fontSize: 52,
    fontWeight: "700",
    color: colors.emergencyForeground,
    textAlign: "center",
    marginTop: 20,
  },
  timerSub: { fontSize: 14, color: `${colors.emergencyForeground}b3`, textAlign: "center", marginTop: 4 },
  mapStub: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
    marginTop: 16,
    marginBottom: 16,
  },
  mapStubText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  rowsContainer: { flex: 1 },
  rowsCard: {
    backgroundColor: `${colors.emergencyForeground}15`,
    borderRadius: radii.xl2,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.emergencyForeground}15`,
  },
  liveIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${colors.emergencyForeground}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  liveTextWrap: { flex: 1 },
  liveLabel: { fontSize: 15, fontWeight: "600", color: colors.emergencyForeground },
  liveValue: { fontSize: 13, color: `${colors.emergencyForeground}a0` },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveBadgeText: { fontSize: 12, fontWeight: "700", color: colors.emergencyForeground },
  footerActions: { gap: 10, paddingTop: 16 },
  helplineButtonsRow: { flexDirection: "row", gap: 10 },
  callHelplineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    backgroundColor: `${colors.emergencyForeground}25`,
    borderRadius: radii.xl,
  },
  callPoliceText: { fontSize: 15, fontWeight: "700", color: colors.emergencyForeground },
  endEmergencyBtn: {
    height: 56,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  endEmergencyText: { fontSize: 17, fontWeight: "700", color: colors.emergency },
  disclaimerText: { fontSize: 12, color: `${colors.emergencyForeground}80`, textAlign: "center" },
  cancelledScreen: { flex: 1, backgroundColor: colors.background, justifyContent: "space-between" },
  cancelledContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  cancelledTitle: { fontSize: 28, fontWeight: "700", color: colors.foreground, marginTop: 24, textAlign: "center" },
  cancelledSub: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", marginTop: 12, lineHeight: 22 },
  evidenceCard: { width: "100%", marginTop: 24, padding: 16 },
  evidenceTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  evidenceSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 6, lineHeight: 18 },
  cancelledFooter: { paddingHorizontal: 24, paddingBottom: 24, gap: 8 },
  dialogActions: { gap: 10, width: "100%" },
});
