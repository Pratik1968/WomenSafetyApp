import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  MapPin,
  Search,
  Check,
  Footprints,
  Bike,
  Car,
  Bus,
  Eye,
  TriangleAlert,
  ShieldCheck,
  Trash2,
  Navigation,
  BatteryMedium,
  Users,
  PhoneCall,
  Siren,
} from "lucide-react-native";
import { colors, gradientBrand, radii } from "../theme/tokens";
import { AppButton } from "../components/ds/AppButton";
import { Badge } from "../components/ds/Badge";
import { Card } from "../components/ds/Card";
import { NavBar } from "../components/ds/NavBar";
import { ProgressBar } from "../components/ds/ProgressBar";
import { SectionHeader } from "../components/ds/SectionHeader";
import { SuccessCheck } from "../components/ds/SuccessCheck";
import { Aurora } from "../components/ds/Aurora";

const STEP_COUNT = 4;

const PLACES = [
  { id: "p1", name: "Home", detail: "100 Ft Road, Indiranagar", tag: "Saved" },
  { id: "p2", name: "Office", detail: "Koramangala 5th Block", tag: "Saved" },
  { id: "p3", name: "Starbucks Indiranagar", detail: "12th Main Road", tag: "Recent" },
];

const TRANSPORT = [
  { id: "walk", label: "Walking", detail: "Detailed step pacing & dark spot alerts", icon: Footprints },
  { id: "bike", label: "Two-wheeler", detail: "Helmet impact & speed drop detection", icon: Bike },
  { id: "cab", label: "Cab / Auto", detail: "Route drift & unexpected stop checks", icon: Car },
  { id: "transit", label: "Public Transit", detail: "Stop notifications & safe exit monitoring", icon: Bus },
];

const PHONE_CONTACTS = [
  { id: "c1", name: "Amma", relation: "Mother", initials: "A" },
  { id: "c2", name: "Meera", relation: "Sister", initials: "M" },
  { id: "c3", name: "Nanna", relation: "Father", initials: "N" },
];

function StepHeader({ step, title, body, onBack }: { step: number; title: string; body: string; onBack?: () => void }) {
  return (
    <>
      <NavBar onBack={onBack} title={`Step ${step} of ${STEP_COUNT}`} />
      <View style={styles.stepHeaderWrap}>
        <ProgressBar value={step / STEP_COUNT} />
        <Text style={styles.stepHeaderTitle}>{title}</Text>
        <Text style={styles.stepHeaderBody}>{body}</Text>
      </View>
    </>
  );
}

/* Step 1: Destination */
export function JourneyDestinationScreen({
  state = "empty",
  onBack,
  onNext,
}: {
  state?: "empty" | "selected";
  onBack?: () => void;
  onNext?: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(state === "selected" ? "p1" : null);

  return (
    <View style={styles.screen}>
      <StepHeader
        step={1}
        title="Where are you headed?"
        body="We set the destination first, so we can tell the moment you drift off your route."
        onBack={onBack}
      />

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.mutedForeground} />
          <Text style={[styles.searchText, picked ? styles.textForeground : styles.textMuted]}>
            {picked ? PLACES.find((p) => p.id === picked)?.name : "Search a place or address"}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <SectionHeader title="Saved & recent" />
        <View style={styles.placesList}>
          {PLACES.map((p) => {
            const isPicked = picked === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPicked(p.id)}
                style={[styles.placeItem, isPicked && styles.placeItemPicked]}
              >
                <View style={styles.placeIcon}>
                  <MapPin size={18} color={colors.mutedForeground} />
                </View>
                <View style={styles.placeText}>
                  <Text style={styles.placeTitle}>{p.name}</Text>
                  <Text style={styles.placeDetail}>{p.detail}</Text>
                </View>
                {isPicked ? (
                  <LinearGradient colors={gradientBrand as unknown as [string, string, ...string[]]} style={styles.checkBadge}>
                    <Check size={14} color={colors.primaryForeground} strokeWidth={3} />
                  </LinearGradient>
                ) : (
                  <Badge>{p.tag}</Badge>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton disabled={!picked} onPress={onNext}>
          Continue
        </AppButton>
      </View>
    </View>
  );
}

/* Step 2: Transport */
export function JourneyTransportScreen({
  onBack,
  onNext,
}: {
  onBack?: () => void;
  onNext?: () => void;
}) {
  const [mode, setMode] = useState("cab");

  return (
    <View style={styles.screen}>
      <StepHeader
        step={2}
        title="How are you travelling?"
        body="This tunes how closely we follow your route and what counts as unusual."
        onBack={onBack}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.transportList}>
          {TRANSPORT.map((t) => {
            const Icon = t.icon;
            const selected = mode === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setMode(t.id)}
                style={[styles.transportItem, selected && styles.transportItemSelected]}
              >
                {selected ? (
                  <LinearGradient colors={gradientBrand as unknown as [string, string, ...string[]]} style={styles.transportIconSelected}>
                    <Icon size={20} color={colors.primaryForeground} strokeWidth={2} />
                  </LinearGradient>
                ) : (
                  <View style={styles.transportIcon}>
                    <Icon size={20} color={colors.mutedForeground} strokeWidth={2} />
                  </View>
                )}
                <View style={styles.transportText}>
                  <Text style={styles.transportLabel}>{t.label}</Text>
                  <Text style={styles.transportDetail}>{t.detail}</Text>
                </View>
                {selected ? (
                  <LinearGradient colors={gradientBrand as unknown as [string, string, ...string[]]} style={styles.checkBadge}>
                    <Check size={14} color={colors.primaryForeground} strokeWidth={3} />
                  </LinearGradient>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton onPress={onNext}>Continue</AppButton>
      </View>
    </View>
  );
}

/* Step 3: Contacts */
export function JourneyContactsScreen({
  onBack,
  onNext,
}: {
  onBack?: () => void;
  onNext?: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(["c1", "c2"]);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <View style={styles.screen}>
      <StepHeader
        step={3}
        title="Who should know?"
        body="Optional. Chosen contacts see your live journey — nobody else does."
        onBack={onBack}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contactsList}>
          {PHONE_CONTACTS.map((c) => {
            const on = selected.includes(c.id);
            return (
              <Pressable key={c.id} onPress={() => toggle(c.id)} style={styles.contactItem}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactInitials}>{c.initials}</Text>
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactRelation}>{c.relation}</Text>
                </View>
                {on ? (
                  <LinearGradient colors={gradientBrand as unknown as [string, string, ...string[]]} style={styles.checkboxOn}>
                    <Check size={14} color={colors.primaryForeground} strokeWidth={3} />
                  </LinearGradient>
                ) : (
                  <View style={styles.checkboxOff} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footerStack}>
        <AppButton onPress={onNext}>
          Continue with {selected.length} contact{selected.length === 1 ? "" : "s"}
        </AppButton>
        <AppButton variant="ghost" size="md" onPress={onNext}>
          Skip for now
        </AppButton>
      </View>
    </View>
  );
}

/* Step 4: Consent */
export function JourneyConsentScreen({
  onBack,
  onStart,
}: {
  onBack?: () => void;
  onStart?: () => void;
}) {
  const PROMISES = [
    { icon: Eye, title: "We're watching over you", body: "From the moment you start until you arrive, your route is checked continuously." },
    { icon: TriangleAlert, title: "We speak up if something feels off", body: "Off your route, an unusual stop, or no movement — we check in first, then escalate." },
    { icon: ShieldCheck, title: "Your data stays yours", body: "Nothing is sold, shared or published. Only chosen contacts can see this journey." },
    { icon: Trash2, title: "Wipe it whenever you want", body: "Request a full wipe of your journeys anytime from Data & Privacy." },
  ];

  return (
    <View style={styles.screen}>
      <NavBar onBack={onBack} />
      <Aurora />

      <View style={styles.consentHeader}>
        <Text style={styles.consentHeading}>We're here</Text>
        <Text style={styles.consentGradientHeading}>with you.</Text>
        <Text style={styles.consentSub}>Before we begin, here's exactly what happens during a monitored journey.</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.promisesList}>
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <Card key={title} style={styles.promiseCard}>
              <View style={styles.promiseIconWrap}>
                <Icon size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.promiseTextWrap}>
                <Text style={styles.promiseTitle}>{title}</Text>
                <Text style={styles.promiseBody}>{body}</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton onPress={onStart}>Start monitored journey</AppButton>
      </View>
    </View>
  );
}

import { useEffect } from "react";
import * as Location from "expo-location";

/* Active Monitored Journey */
export function JourneyActiveScreen({
  state = "active",
  onEnd,
  onSos,
}: {
  state?: "active" | "offroute" | "escalating";
  onEnd?: () => void;
  onSos?: () => void;
}) {
  const offRoute = state !== "active";

  useEffect(() => {
    (async () => {
      try {
        if (typeof Location?.requestForegroundPermissionsAsync === "function") {
          const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
          if (fgStatus === "granted" && typeof Location?.requestBackgroundPermissionsAsync === "function") {
            await Location.requestBackgroundPermissionsAsync();
          }
        }
      } catch (err) {
        console.warn("Safety mode location permission request error:", err);
      }
    })();
  }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.activeHeader}>
        <View style={[styles.activePill, offRoute && styles.activePillWarning]}>
          <View style={[styles.activeDot, offRoute && styles.activeDotWarning]} />
          <Text style={styles.activePillText}>
            {offRoute ? "Checking on you" : "We're watching over you"}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.mapContainerStub}>
          <MapPin size={24} color={offRoute ? colors.warning : colors.primary} />
          <Text style={styles.mapStubHeading}>Live Journey Track</Text>
          <Text style={styles.mapStubDetail}>5.7 km travelled · 2.7 km to go</Text>
        </View>

        {state === "escalating" ? (
          <View style={styles.escalatingBox}>
            <View style={styles.warningRow}>
              <Siren size={18} color={colors.emergency} />
              <Text style={styles.escalatingTitle}>Auto-SOS in 00:18</Text>
            </View>
            <Text style={styles.escalatingBody}>
              You've been off your route for 6 minutes. If you don't respond, we'll alert contacts.
            </Text>
            <View style={styles.escalatingButtons}>
              <AppButton variant="secondary" size="md" style={{ flex: 1 }}>
                I'm safe
              </AppButton>
              <AppButton variant="destructive" size="md" style={{ flex: 1 }} onPress={onSos}>
                Send now
              </AppButton>
            </View>
          </View>
        ) : offRoute ? (
          <View style={styles.offRouteBox}>
            <TriangleAlert size={18} color={colors.warning} />
            <View style={styles.offRouteText}>
              <Text style={styles.offRouteTitle}>You're off the route</Text>
              <Text style={styles.offRouteBody}>You turned away from your route to Home.</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.journeyMetaRow}>
          <Text style={styles.journeyMetaTitle}>Office → Home</Text>
          <Badge tone={offRoute ? "warning" : "success"}>{offRoute ? "Attention" : "On track"}</Badge>
        </View>

        <ProgressBar value={offRoute ? 0.52 : 0.68} />

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Navigation size={16} color={colors.primary} />
            <Text style={styles.metricValue}>9:36 PM</Text>
            <Text style={styles.metricLabel}>Arriving</Text>
          </View>
          <View style={styles.metricCard}>
            <BatteryMedium size={16} color={colors.success} />
            <Text style={styles.metricValue}>62%</Text>
            <Text style={styles.metricLabel}>Battery</Text>
          </View>
          <View style={styles.metricCard}>
            <Users size={16} color={colors.primary} />
            <Text style={styles.metricValue}>2</Text>
            <Text style={styles.metricLabel}>Watching</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.activeActionsRow}>
        <Pressable style={styles.activeActionBtn} onPress={onSos}>
          <Siren size={18} color={colors.emergencyForeground} />
          <Text style={styles.activeActionBtnSosText}>SOS</Text>
        </Pressable>
        <Pressable style={[styles.activeActionBtn, styles.activeActionBtnArrived]} onPress={onEnd}>
          <Check size={18} color={colors.foreground} />
          <Text style={styles.activeActionBtnArrivedText}>Arrived</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* Journey Summary */
export function JourneySummaryScreen({ onDone }: { onDone?: () => void }) {
  return (
    <View style={styles.summaryScreen}>
      <Aurora />
      <View style={styles.summaryContent}>
        <SuccessCheck size={96} />
        <Text style={styles.summaryTitle}>You arrived safely</Text>
        <Text style={styles.summarySub}>
          Safety Mode ended automatically. Amma and Meera have been told you're home.
        </Text>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryMetricsGrid}>
            <View>
              <Text style={styles.summaryMetricValue}>24 min</Text>
              <Text style={styles.summaryMetricLabel}>Duration</Text>
            </View>
            <View>
              <Text style={styles.summaryMetricValue}>8.4 km</Text>
              <Text style={styles.summaryMetricLabel}>Distance</Text>
            </View>
            <View>
              <Text style={[styles.summaryMetricValue, { color: colors.success }]}>Calm</Text>
              <Text style={styles.summaryMetricLabel}>Route rating</Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.footer}>
        <AppButton onPress={onDone}>Done</AppButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  stepHeaderWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  stepHeaderTitle: { fontSize: 28, fontWeight: "700", color: colors.foreground, marginTop: 16 },
  stepHeaderBody: { fontSize: 15, color: colors.mutedForeground, marginTop: 6, lineHeight: 22 },
  searchWrap: { paddingHorizontal: 20, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchText: { fontSize: 15 },
  textForeground: { color: colors.foreground, fontWeight: "500" },
  textMuted: { color: colors.mutedForeground },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  placesList: { gap: 10, marginTop: 8 },
  placeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 14,
    gap: 12,
  },
  placeItemPicked: { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}50` },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  placeText: { flex: 1 },
  placeTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  placeDetail: { fontSize: 13, color: colors.mutedForeground },
  checkBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  footer: { paddingHorizontal: 20, paddingBottom: 20 },
  footerStack: { paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  transportList: { gap: 12 },
  transportItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl2,
    padding: 16,
    gap: 14,
  },
  transportItemSelected: { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}50` },
  transportIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  transportIconSelected: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  transportText: { flex: 1 },
  transportLabel: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  transportDetail: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  contactsList: { gap: 8 },
  contactItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInitials: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  contactText: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  contactRelation: { fontSize: 13, color: colors.mutedForeground },
  checkboxOn: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  checkboxOff: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  consentHeader: { paddingHorizontal: 20, paddingTop: 16, marginBottom: 16 },
  consentHeading: { fontSize: 32, fontWeight: "800", color: colors.foreground },
  consentGradientHeading: { fontSize: 32, fontWeight: "800", color: colors.primary },
  consentSub: { fontSize: 15, color: colors.mutedForeground, marginTop: 8, lineHeight: 22 },
  promisesList: { gap: 12 },
  promiseCard: { flexDirection: "row", gap: 14, padding: 16 },
  promiseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  promiseTextWrap: { flex: 1 },
  promiseTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  promiseBody: { fontSize: 13, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 },
  activeHeader: { paddingHorizontal: 20, paddingTop: 20, alignItems: "center" },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.success}15`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  activePillWarning: { backgroundColor: `${colors.warning}20` },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  activeDotWarning: { backgroundColor: colors.warning },
  activePillText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  mapContainerStub: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl2,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    gap: 6,
  },
  mapStubHeading: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  mapStubDetail: { fontSize: 13, color: colors.mutedForeground },
  offRouteBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.warning}15`,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
    borderRadius: radii.xl,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  offRouteText: { flex: 1 },
  offRouteTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  offRouteBody: { fontSize: 13, color: colors.mutedForeground },
  escalatingBox: {
    backgroundColor: `${colors.emergency}15`,
    borderWidth: 1,
    borderColor: `${colors.emergency}40`,
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  warningRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  escalatingTitle: { fontSize: 16, fontWeight: "700", color: colors.emergency },
  escalatingBody: { fontSize: 13, color: colors.foreground },
  escalatingButtons: { flexDirection: "row", gap: 10, marginTop: 8 },
  journeyMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  journeyMetaTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  metricsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  metricValue: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  metricLabel: { fontSize: 11, color: colors.mutedForeground },
  activeActionsRow: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  activeActionBtn: {
    flex: 1,
    height: 54,
    backgroundColor: colors.emergency,
    borderRadius: radii.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  activeActionBtnArrived: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  activeActionBtnSosText: { fontSize: 16, fontWeight: "700", color: colors.emergencyForeground },
  activeActionBtnArrivedText: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  summaryScreen: { flex: 1, backgroundColor: colors.background, justifyContent: "space-between" },
  summaryContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  summaryTitle: { fontSize: 26, fontWeight: "700", color: colors.foreground, marginTop: 20, textAlign: "center" },
  summarySub: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", marginTop: 8, lineHeight: 22 },
  summaryCard: { width: "100%", marginTop: 24, padding: 20 },
  summaryMetricsGrid: { flexDirection: "row", justifyContent: "space-around", textAlign: "center" },
  summaryMetricValue: { fontSize: 18, fontWeight: "700", color: colors.foreground, textAlign: "center" },
  summaryMetricLabel: { fontSize: 12, color: colors.mutedForeground, textAlign: "center", marginTop: 2 },
});
