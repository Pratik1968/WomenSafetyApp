import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
} from "react-native";
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
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Camera } from "expo-camera";
import { colors, radii } from "../theme/tokens";
import { AppButton } from "../components/ds/AppButton";
import { Card } from "../components/ds/Card";
import { Dialog } from "../components/ds/Dialog";
import { SuccessCheck } from "../components/ds/SuccessCheck";
import { Aurora } from "../components/ds/Aurora";
import {
  triggerSOS,
  cancelSOS,
  getActiveIncidentId,
  type SOSTriggerSource,
} from "../services/sosOrchestratorService";
import { contactStorageService } from "../services/contactStorageService";

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
          <Circle
            size={8}
            color={colors.emergencyForeground}
            fill={colors.emergencyForeground}
          />
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      ) : (
        <Check size={18} color={colors.emergencyForeground} strokeWidth={2.5} />
      )}
    </View>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SosScreen({
  state = "active",
  triggerSource = "BUTTON",
  onEnd,
  onCancelConfirm,
  onDone,
  onDeleteRecordings,
}: {
  state?: SosState;
  triggerSource?: SOSTriggerSource;
  onEnd?: () => void;
  onCancelConfirm?: () => void;
  onDone?: () => void;
  onDeleteRecordings?: () => void;
}) {
  const [mapLabel, setMapLabel] = useState<string | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const [finalDuration, setFinalDuration] = useState<string | null>(null);
  const [contactNames, setContactNames] = useState<string>("Loading…");
  const incidentIdRef = useRef<string | null>(null);

  useEffect(() => {
    contactStorageService.getStoredEmergencyContacts().then((contacts) => {
      if (contacts.length === 0) {
        setContactNames("No contacts configured");
        return;
      }
      const names = contacts
        .map((c) => c.name ?? c.phone ?? "Unknown")
        .join(", ");
      setContactNames(names);
    });
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSecs(elapsedRef.current);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (state !== "active") return;

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

    elapsedRef.current = 0;
    setElapsedSecs(0);
    startTimer();

    let mounted = true;

    const runSOS = async () => {
      try {
        const incidentId = await triggerSOS(triggerSource);
        if (!mounted) return;
        incidentIdRef.current = incidentId;
      } catch (err) {
        console.error("[SosScreen] triggerSOS pipeline error:", err);
      }
    };

    runSOS();

    return () => {
      mounted = false;
      stopTimer();
    };
  }, [state, triggerSource, startTimer, stopTimer]);

  useEffect(() => {
    if (state === "cancelled") {
      setFinalDuration(formatElapsed(elapsedRef.current));
      stopTimer();

      const id = incidentIdRef.current ?? getActiveIncidentId();
      if (id) {
        cancelSOS(id, "resolved").catch(console.warn);
      }
    }
  }, [state, stopTimer]);

  if (state === "cancelled") {
    return (
      <View style={styles.cancelledScreen}>
        <Aurora />
        <View style={styles.cancelledContent}>
          <SuccessCheck size={96} />
          <Text style={styles.cancelledTitle}>Emergency ended</Text>
          <Text style={styles.cancelledSub}>
            Your contacts have been told you're safe.
            {finalDuration ? ` Active for ${finalDuration}.` : ""}
          </Text>
          <Card style={styles.evidenceCard}>
            <Text style={styles.evidenceTitle}>Evidence saved privately</Text>
            <Text style={styles.evidenceSub}>
              Audio and video clips are stored on your device only. Delete them
              now, or request a full wipe from Data & Privacy.
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

        <Text style={styles.timerText}>{formatElapsed(elapsedSecs)}</Text>
        <Text style={styles.timerSub}>Help is being coordinated. Stay with us.</Text>

        <View style={styles.mapStub}>
          <MapPin size={16} color={colors.emergency} />
          <Text style={styles.mapStubText} numberOfLines={1}>
            {mapLabel ?? "Acquiring location…"}
          </Text>
        </View>

        <ScrollView
          style={styles.rowsContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.rowsCard}>
            <LiveRow
              icon={Mic}
              label="Audio recording"
              value="Continuous since SOS activated"
              live
            />
            <LiveRow
              icon={Video}
              label="Video recording"
              value="Background camera active"
              live
            />
            <LiveRow
              icon={ShieldAlert}
              label="Monitoring"
              value="Route and movement tracked"
              live
            />
            <LiveRow
              icon={Users}
              label="Contacts notified"
              value={contactNames}
            />
          </View>
        </ScrollView>

        <View style={styles.footerActions}>
          <View style={styles.helplineButtonsRow}>
            <Pressable
              style={styles.callHelplineBtn}
              onPress={() => Linking.openURL("tel:112").catch(console.warn)}
              accessibilityLabel="Call Police Helpline 112"
            >
              <PhoneCall size={18} color={colors.emergencyForeground} strokeWidth={2} />
              <Text style={styles.callPoliceText}>Call police · 112</Text>
            </Pressable>

            <Pressable
              style={[styles.callHelplineBtn, { backgroundColor: `${colors.emergencyForeground}30` }]}
              onPress={() => Linking.openURL("tel:1091").catch(console.warn)}
              accessibilityLabel="Call Women Helpline 1091"
            >
              <HeartHandshake size={18} color={colors.emergencyForeground} strokeWidth={2} />
              <Text style={styles.callPoliceText}>Women Helpline · 1091</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onEnd}
            onLongPress={onEnd}
            delayLongPress={800}
            style={styles.endEmergencyBtn}
            accessibilityLabel="Hold to end emergency"
          >
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
  activeContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
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
  headerBadgeText: {
    color: colors.emergencyForeground,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  timerText: {
    fontSize: 52,
    fontWeight: "700",
    color: colors.emergencyForeground,
    textAlign: "center",
    marginTop: 20,
    fontVariant: ["tabular-nums"],
  },
  timerSub: {
    fontSize: 14,
    color: `${colors.emergencyForeground}b3`,
    textAlign: "center",
    marginTop: 4,
  },
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
    maxWidth: "90%",
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
  liveLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.emergencyForeground,
  },
  liveValue: { fontSize: 13, color: `${colors.emergencyForeground}a0` },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.emergencyForeground,
  },
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
  endEmergencyText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.emergency,
  },
  disclaimerText: {
    fontSize: 12,
    color: `${colors.emergencyForeground}80`,
    textAlign: "center",
  },
  cancelledScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "space-between",
  },
  cancelledContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cancelledTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 24,
    textAlign: "center",
  },
  cancelledSub: {
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  evidenceCard: { width: "100%", marginTop: 24, padding: 16 },
  evidenceTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  evidenceSub: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 6,
    lineHeight: 18,
  },
  cancelledFooter: { paddingHorizontal: 24, paddingBottom: 24, gap: 8 },
  dialogActions: { gap: 10, width: "100%" },
});
