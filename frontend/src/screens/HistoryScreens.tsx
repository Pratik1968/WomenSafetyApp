import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import {
  Siren,
  Route as RouteIcon,
  Flag,
  AlertTriangle,
  Search,
  Download,
  Sparkles,
  Mic,
  Video,
} from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { AppButton } from "../components/ds/AppButton";
import { Badge } from "../components/ds/Badge";
import { Card } from "../components/ds/Card";
import { Chip } from "../components/ds/Chip";
import { EmptyState } from "../components/ds/EmptyState";
import { NavBar } from "../components/ds/NavBar";
import { TimelineItem } from "../components/ds/TimelineItem";
import { BottomNav, type TabKey } from "../components/app/BottomNav";

export type HistoryState = "default" | "empty" | "loading";

const INCIDENTS = [
  { id: "1", kind: "sos" as const, title: "SOS triggered", place: "100 Ft Road underpass", date: "12 Jun", status: "resolved" as const },
  { id: "2", kind: "journey" as const, title: "Monitored walk", place: "Indiranagar to Koramangala", date: "10 Jun", status: "safe" as const },
  { id: "3", kind: "report" as const, title: "Area report", place: "5th Cross stretch", date: "04 Jun", status: "under-review" as const },
];

const INCIDENT_TIMELINE = [
  { id: "s1", time: "9:42 PM", title: "SOS button held", detail: "Pressed for 3 seconds on 100 Ft Road.", tone: "emergency" as const },
  { id: "s2", time: "9:42 PM", title: "Contacts notified", detail: "Amma, Meera & Nanna received SMS and call alert.", tone: "brand" as const },
  { id: "s3", time: "9:43 PM", title: "Audio & video started", detail: "Continuous encrypted background recording.", tone: "brand" as const },
  { id: "s4", time: "9:46 PM", title: "Marked safe", detail: "You entered PIN and ended the emergency.", tone: "success" as const },
];

const STATUS = {
  resolved: { label: "Resolved", tone: "success" as const },
  safe: { label: "Arrived safely", tone: "success" as const },
  "under-review": { label: "Under review", tone: "warning" as const },
  cancelled: { label: "Cancelled", tone: "neutral" as const },
};

const FILTERS = ["All", "SOS", "Journeys", "Reports"];

export function HistoryScreen({
  state = "default",
  onTab,
  onOpen,
  onAssistant,
  onSos,
}: {
  state?: HistoryState;
  onTab?: (t: TabKey) => void;
  onOpen?: () => void;
  onAssistant?: () => void;
  onSos?: () => void;
}) {
  const [filter, setFilter] = useState("All");

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.headerSub}>Every journey, alert and report — kept only on your account.</Text>
      </View>

      {state !== "empty" ? (
        <>
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Search size={17} color={colors.mutedForeground} />
              <Text style={styles.searchText}>Search history</Text>
            </View>
          </View>
          <View style={styles.filtersRow}>
            {FILTERS.map((f) => (
              <Chip key={f} active={filter === f} onPress={() => setFilter(f)}>
                {f}
              </Chip>
            ))}
          </View>
        </>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {state === "empty" ? (
          <EmptyState
            title="Nothing here yet"
            body="Your journeys, alerts and reports will appear here as a simple timeline."
            action={<AppButton size="md">Start a journey</AppButton>}
          />
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.monthHeader}>JUNE 2026</Text>
            {INCIDENTS.map((it) => {
              const Icon = it.kind === "sos" ? Siren : it.kind === "journey" ? RouteIcon : Flag;
              const st = STATUS[it.status];
              return (
                <Pressable key={it.id} onPress={onOpen} style={styles.incidentCard}>
                  <View style={[styles.incidentIconWrap, it.kind === "sos" && styles.iconWrapSos]}>
                    <Icon size={20} color={it.kind === "sos" ? colors.emergency : colors.primary} />
                  </View>
                  <View style={styles.incidentTextWrap}>
                    <View style={styles.incidentTopRow}>
                      <Text style={styles.incidentTitle}>{it.title}</Text>
                      <Text style={styles.incidentDate}>{it.date}</Text>
                    </View>
                    <Text style={styles.incidentPlace}>{it.place}</Text>
                    <View style={styles.badgeWrap}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomNav active="history" onSelect={onTab} onAssistant={onAssistant} onSos={onSos} />
    </View>
  );
}

export function IncidentDetailScreen({
  id,
  incidentId,
  onBack,
}: {
  id?: string;
  incidentId?: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.screen}>
      <NavBar
        title="Incident details"
        onBack={onBack}
        action={
          <View style={styles.downloadIconBtn}>
            <Download size={17} color={colors.foreground} />
          </View>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.detailHeaderRow}>
          <View style={styles.sosHeaderIcon}>
            <Siren size={24} color={colors.emergency} />
          </View>
          <View style={styles.detailHeaderTextWrap}>
            <Text style={styles.detailHeaderTitle}>SOS triggered</Text>
            <Text style={styles.detailHeaderSub}>12 Jun 2026 · 9:42 PM · 100 Ft Road underpass</Text>
            <View style={styles.badgeWrap}>
              <Badge tone="success">Resolved · you marked yourself safe</Badge>
            </View>
          </View>
        </View>

        {/* Danger Score */}
        <Card style={styles.sectionCard}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreTitle}>Danger score</Text>
            <Text style={styles.scoreValue}>78</Text>
          </View>
          <View style={styles.scoreBarTrack}>
            <View style={[styles.scoreBarFill, { width: "78%" }]} />
          </View>
          <Text style={styles.scoreDesc}>
            Based on time of day, past reports in this stretch and distance from lit roads.
          </Text>
        </Card>

        {/* Aegis AI observations */}
        <Card style={styles.sectionCard}>
          <View style={styles.aiTitleRow}>
            <Sparkles size={17} color={colors.primary} />
            <Text style={styles.aiTitle}>What Aegis noticed</Text>
          </View>
          <Text style={styles.aiBullet}>• Stopped moving for 4 minutes in a normally walked stretch.</Text>
          <Text style={styles.aiBullet}>• Route deviated 180 m from the planned path.</Text>
          <Text style={styles.aiBullet}>• Similar reports here peak between 9 PM and 11 PM.</Text>
        </Card>

        {/* Timeline */}
        <Text style={styles.sectionHeading}>TIMELINE</Text>
        <Card style={styles.sectionCard}>
          {INCIDENT_TIMELINE.map((s, i) => (
            <TimelineItem
              key={s.id}
              time={s.time}
              title={s.title}
              detail={s.detail}
              tone={s.tone}
              last={i === INCIDENT_TIMELINE.length - 1}
            />
          ))}
        </Card>

        {/* Evidence */}
        <Text style={styles.sectionHeading}>EVIDENCE</Text>
        <Card style={styles.evidenceCard}>
          <View style={styles.evidenceIconWrap}>
            <Mic size={20} color={colors.primary} />
          </View>
          <View style={styles.evidenceTextWrap}>
            <Text style={styles.evidenceTitle}>Audio · 8 min 42 s</Text>
            <Text style={styles.evidenceSub}>Encrypted · stored on your device only</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: colors.foreground, letterSpacing: -0.3 },
  headerSub: { fontSize: 15, color: colors.mutedForeground, marginTop: 4 },
  searchWrap: { paddingHorizontal: 20, marginBottom: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchText: { fontSize: 15, color: colors.mutedForeground },
  filtersRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  listSection: { gap: 12, marginTop: 8 },
  monthHeader: { fontSize: 13, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5 },
  incidentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl2,
    padding: 16,
    gap: 12,
  },
  incidentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSos: { backgroundColor: `${colors.emergency}15` },
  incidentTextWrap: { flex: 1 },
  incidentTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  incidentTitle: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  incidentDate: { fontSize: 12, color: colors.mutedForeground },
  incidentPlace: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  badgeWrap: { marginTop: 8, alignSelf: "flex-start" },
  downloadIconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  detailHeaderRow: { flexDirection: "row", gap: 14, marginVertical: 12 },
  sosHeaderIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: `${colors.emergency}15`, alignItems: "center", justifyContent: "center" },
  detailHeaderTextWrap: { flex: 1 },
  detailHeaderTitle: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  detailHeaderSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  sectionCard: { padding: 16, marginBottom: 14 },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scoreTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  scoreValue: { fontSize: 22, fontWeight: "700", color: colors.emergency },
  scoreBarTrack: { height: 8, backgroundColor: colors.surface, borderRadius: 4, marginVertical: 10, overflow: "hidden" },
  scoreBarFill: { height: "100%", backgroundColor: colors.emergency, borderRadius: 4 },
  scoreDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
  aiTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  aiTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  aiBullet: { fontSize: 13, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
  evidenceCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  evidenceIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.primary}15`, alignItems: "center", justifyContent: "center" },
  evidenceTextWrap: { flex: 1 },
  evidenceTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  evidenceSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
});
