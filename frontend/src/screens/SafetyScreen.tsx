import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronRight,
  Flame,
  Hospital,
  Lightbulb,
  MapPinned,
  Route as RouteIcon,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import { colors, gradientBrand, radii } from "../theme/tokens";
import { Badge } from "../components/ds/Badge";
import { Card } from "../components/ds/Card";
import { ListItem } from "../components/ds/ListItem";
import { SectionHeader } from "../components/ds/SectionHeader";
import { BottomNav, type TabKey } from "../components/app/BottomNav";

export type SafetyState = "default" | "elevated" | "loading";

const RISK = {
  default: { score: 22, label: "Low risk", tone: "success" as const, note: "Indiranagar · 9:41 PM" },
  elevated: { score: 64, label: "Elevated risk", tone: "warning" as const, note: "Indiranagar · after 10 PM" },
  loading: { score: 0, label: "Reading your area", tone: "brand" as const, note: "" },
};

const CRIME_ZONES = [
  { id: "1", name: "100 Ft Road Rear Alley", detail: "Low street lighting · 2 reports", level: "high" },
  { id: "2", name: "Metro Station Exit 3", detail: "Under construction area", level: "medium" },
];

const HELP_PLACES = [
  { id: "1", name: "Indiranagar Police Station", kind: "police", distance: "400 m", open: true },
  { id: "2", name: "Manipal Hospital Emergency", kind: "hospital", distance: "1.2 km", open: true },
];

const PHONE_CONTACTS = [
  { id: "c1", name: "Amma", relation: "Mother", phone: "+91 98765 43210", initials: "A" },
  { id: "c2", name: "Meera", relation: "Sister", phone: "+91 98765 43211", initials: "M" },
];

const SAFETY_TIPS = [
  { id: "t1", title: "Share your live route early", body: "Sending journey tracking before getting into a cab gives your trusted contacts time to check in.", minutes: 2 },
  { id: "t2", title: "Enable Voice SOS key phrase", body: "Setting up a discreet keyword lets your phone activate emergency mode even inside your bag.", minutes: 3 },
];

function RiskDial({ score, tone }: { score: number; tone: "success" | "warning" | "brand" }) {
  const color = tone === "warning" ? colors.warning : tone === "success" ? colors.success : colors.primary;
  return (
    <View style={styles.dialContainer}>
      <View style={[styles.dialRing, { borderColor: `${color}30` }]}>
        <View style={[styles.dialCore, { borderColor: color }]}>
          <Text style={styles.dialScoreText}>{score}</Text>
          <Text style={styles.dialScoreLabel}>of 100</Text>
        </View>
      </View>
    </View>
  );
}

export function SafetyScreen({
  state = "default",
  onTab,
  onSafetyMode,
  onSafeRoute,
  onNearby,
  onContacts,
  onAssistant,
  onSos,
}: {
  state?: SafetyState;
  onTab?: (t: TabKey) => void;
  onSafetyMode?: () => void;
  onSafeRoute?: () => void;
  onNearby?: () => void;
  onContacts?: () => void;
  onAssistant?: () => void;
  onSos?: () => void;
}) {
  const risk = RISK[state];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety</Text>
        <Text style={styles.headerSub}>Everything that keeps tonight predictable.</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Risk Card */}
        <Card style={styles.riskCard}>
          <RiskDial score={risk.score} tone={risk.tone} />
          <View style={styles.riskTextWrap}>
            <Badge tone={risk.tone === "warning" ? "warning" : "success"}>{risk.label}</Badge>
            <Text style={styles.riskHeading}>
              {risk.tone === "warning" ? "Prefer lit roads tonight" : "This area is calm right now"}
            </Text>
            <Text style={styles.riskNote}>{risk.note}</Text>
          </View>
        </Card>

        {/* Safety Mode Banner */}
        <Pressable onPress={onSafetyMode} style={styles.safetyModeCard}>
          <LinearGradient colors={gradientBrand as unknown as [string, string, ...string[]]} style={styles.safetyModeIcon}>
            <ShieldCheck size={24} color={colors.primaryForeground} strokeWidth={2} />
          </LinearGradient>
          <View style={styles.safetyModeText}>
            <Text style={styles.safetyModeTitle}>Safety Mode</Text>
            <Text style={styles.safetyModeSub}>We watch your route and step in if you drift.</Text>
          </View>
          <ChevronRight size={20} color={colors.mutedForeground} />
        </Pressable>

        {/* Zones to avoid */}
        <View style={styles.section}>
          <SectionHeader title="Zones to avoid nearby" action="Map" />
          <Card style={styles.zonesCard}>
            {CRIME_ZONES.map((z) => (
              <ListItem
                key={z.id}
                icon={
                  <Flame
                    size={18}
                    color={z.level === "high" ? colors.emergency : colors.warning}
                    strokeWidth={2}
                  />
                }
                title={z.name}
                subtitle={z.detail}
              />
            ))}
          </Card>
        </View>

        {/* Safe places horizontal scroll */}
        <View style={styles.section}>
          <SectionHeader title="Safe places nearby" action="See all" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {HELP_PLACES.map((p) => (
              <Pressable key={p.id} onPress={onNearby} style={styles.placeCard}>
                <View style={styles.placeIconWrap}>
                  {p.kind === "hospital" ? (
                    <Hospital size={18} color={colors.primary} strokeWidth={2} />
                  ) : (
                    <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
                  )}
                </View>
                <Text style={styles.placeName}>{p.name}</Text>
                <Text style={styles.placeDetail}>{p.distance} · {p.open ? "Open now" : "Closed"}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Quick Links */}
        <View style={[styles.section, styles.linksRow]}>
          <Pressable onPress={onSafeRoute} style={styles.linkCard}>
            <RouteIcon size={22} color={colors.primary} strokeWidth={2} />
            <Text style={styles.linkTitle}>Safe route</Text>
            <Text style={styles.linkSub}>Plan the lit way home</Text>
          </Pressable>
          <Pressable onPress={onNearby} style={styles.linkCard}>
            <MapPinned size={22} color={colors.primary} strokeWidth={2} />
            <Text style={styles.linkTitle}>Nearby help</Text>
            <Text style={styles.linkSub}>Police, hospitals, NGOs</Text>
          </Pressable>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <SectionHeader title="Emergency contacts" action="Manage" />
          <Card style={styles.contactsCard}>
            {PHONE_CONTACTS.map((c) => (
              <ListItem
                key={c.id}
                onPress={onContacts}
                icon={<Text style={styles.contactInitials}>{c.initials}</Text>}
                title={c.name}
                subtitle={`${c.relation} · ${c.phone}`}
              />
            ))}
            <ListItem
              onPress={onContacts}
              icon={<Users size={18} color={colors.primary} strokeWidth={2} />}
              title="Add a contact"
              subtitle="Up to 5 people"
            />
          </Card>
        </View>

        {/* Safety Tips */}
        <View style={styles.section}>
          <SectionHeader title="Safety tips" action="All tips" />
          <View style={styles.tipsList}>
            {SAFETY_TIPS.map((t) => (
              <Card key={t.id} style={styles.tipCard}>
                <View style={styles.tipIconWrap}>
                  <Lightbulb size={18} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.tipTextWrap}>
                  <Text style={styles.tipTitle}>{t.title}</Text>
                  <Text style={styles.tipBody}>{t.body}</Text>
                  <Text style={styles.tipMinutes}>{t.minutes} min read</Text>
                </View>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>

      <BottomNav active="safety" onSelect={onTab} onAssistant={onAssistant} onSos={onSos} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: colors.foreground, letterSpacing: -0.3 },
  headerSub: { fontSize: 15, color: colors.mutedForeground, marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  riskCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, marginBottom: 16 },
  dialContainer: { width: 110, height: 110, alignItems: "center", justifyContent: "center" },
  dialRing: { width: 110, height: 110, borderRadius: 55, borderWidth: 8, alignItems: "center", justifyContent: "center" },
  dialCore: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, alignItems: "center", justifyContent: "center" },
  dialScoreText: { fontSize: 26, fontWeight: "700", color: colors.foreground },
  dialScoreLabel: { fontSize: 11, color: colors.mutedForeground },
  riskTextWrap: { flex: 1, gap: 6 },
  riskHeading: { fontSize: 16, fontWeight: "600", color: colors.foreground, lineHeight: 20 },
  riskNote: { fontSize: 13, color: colors.mutedForeground },
  safetyModeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    borderRadius: radii.xl2,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  safetyModeIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  safetyModeText: { flex: 1 },
  safetyModeTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  safetyModeSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  section: { marginBottom: 24 },
  zonesCard: { padding: 8 },
  horizontalScroll: { gap: 12 },
  placeCard: {
    width: 200,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 14,
    gap: 6,
  },
  placeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  placeName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  placeDetail: { fontSize: 12, color: colors.mutedForeground },
  linksRow: { flexDirection: "row", gap: 12 },
  linkCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 16,
    gap: 6,
  },
  linkTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground, marginTop: 4 },
  linkSub: { fontSize: 12, color: colors.mutedForeground },
  contactsCard: { padding: 8 },
  contactInitials: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  tipsList: { gap: 10 },
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  tipIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  tipTextWrap: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  tipBody: { fontSize: 13, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 },
  tipMinutes: { fontSize: 11, color: `${colors.mutedForeground}90`, marginTop: 6 },
});
