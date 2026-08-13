import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { Plus, ChevronRight, MapPin } from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { Card } from "../components/ds/Card";
import { Badge } from "../components/ds/Badge";
import { NavBar } from "../components/ds/NavBar";
import { Screen } from "../components/ds/Screen";
import { AppButton } from "../components/ds/AppButton";
import { SkeletonLine } from "../components/ds/SkeletonLine";
import { INCIDENT_META, INCIDENT_STATUS, EVIDENCE_META } from "../components/app/entityMeta";
import { listIncidents } from "../data/incidents";
import { listEvidence } from "../data/evidence";
import type { Incident, Evidence } from "../data/models";
import { formatDateTime, formatBytes, formatDuration } from "../data/format";

export function IncidentDetailScreen({
  id,
  onBack,
  onOpenEvidence,
  onAddEvidence,
}: {
  id?: string;
  onBack?: () => void;
  onOpenEvidence?: (evidenceId: string) => void;
  onAddEvidence?: (incidentId: string) => void;
}) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [evidence, setEvidence] = useState<Evidence[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { pull?: boolean }) => {
      if (!id) {
        setError("No incident selected");
        return;
      }
      if (opts?.pull) setRefreshing(true);
      setError(null);
      try {
        const [incidents, ev] = await Promise.all([listIncidents(), listEvidence({ incidentId: id })]);
        setIncident(incidents.find((i) => i.id === id) ?? null);
        setEvidence(ev);
      } catch (e) {
        setError((e as Error)?.message ?? "Could not load incident");
      } finally {
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const meta = incident ? INCIDENT_META[incident.type] : null;
  const st = incident ? INCIDENT_STATUS[incident.status] : null;

  return (
    <Screen>
      <NavBar title="Incident" onBack={onBack} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ pull: true })} tintColor={colors.primary} />}
      >
        {error ? (
          <Card style={styles.card}>
            <Text style={styles.errTitle}>Something went wrong</Text>
            <Text style={styles.errBody}>{error}</Text>
          </Card>
        ) : !incident || !meta || !st ? (
          <Card style={styles.card}>
            <SkeletonLine style={{ width: "50%" }} />
            <SkeletonLine style={{ width: "75%", marginTop: 12 }} />
          </Card>
        ) : (
          <>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={[styles.headerIcon, { backgroundColor: `${meta.color}15` }]}>
                <meta.Icon size={24} color={meta.color} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>{meta.label}</Text>
                <Text style={styles.headerSub}>{formatDateTime(incident.started_at)}</Text>
                <View style={styles.badgeRow}>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </View>
              </View>
            </View>

            {/* Meta */}
            <Card style={styles.card}>
              <View style={styles.metaRow}>
                <MapPin size={16} color={colors.mutedForeground} />
                <Text style={styles.metaText}>{incident.address || "No location recorded"}</Text>
              </View>
              <View style={styles.severityRow}>
                <Text style={styles.metaLabel}>Severity</Text>
                <Text style={styles.severityVal}>{incident.severity} / 100</Text>
              </View>
            </Card>

            {/* Evidence */}
            <View style={styles.evHeader}>
              <Text style={styles.sectionHeading}>EVIDENCE {evidence ? `· ${evidence.length}` : ""}</Text>
            </View>

            {evidence === null ? (
              <Card style={styles.card}>
                <SkeletonLine style={{ width: "60%" }} />
              </Card>
            ) : evidence.length === 0 ? (
              <Card style={styles.card}>
                <Text style={styles.emptyText}>No evidence attached yet. Add the first piece below.</Text>
              </Card>
            ) : (
              <View style={styles.evList}>
                {evidence.map((e) => {
                  const em = EVIDENCE_META[e.type];
                  return (
                    <Pressable key={e.id} onPress={() => onOpenEvidence?.(e.id)} style={styles.evCard}>
                      <View style={styles.evIcon}>
                        <em.Icon size={18} color={colors.primary} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.evName} numberOfLines={1}>
                          {e.file_name ?? em.label}
                        </Text>
                        <Text style={styles.evSub} numberOfLines={1}>
                          {em.label} · {formatDuration(e.duration_seconds) ?? formatBytes(e.size_bytes)}
                          {e.is_encrypted ? " · Encrypted" : ""}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.mutedForeground} opacity={0.6} />
                    </Pressable>
                  );
                })}
              </View>
            )}

            <AppButton size="lg" onPress={() => onAddEvidence?.(incident.id)} leading={<Plus size={16} color={colors.primaryForeground} />}>
              Add evidence
            </AppButton>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 4 },
  card: { padding: 16, marginBottom: 12 },
  headerRow: { flexDirection: "row", gap: 14, marginVertical: 12 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  headerSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  badgeRow: { marginTop: 8, alignSelf: "flex-start" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 14, color: colors.foreground, flex: 1 },
  severityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  metaLabel: { fontSize: 13, color: colors.mutedForeground },
  severityVal: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  evHeader: { marginTop: 4 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5, marginBottom: 8 },
  evList: { gap: 10, marginBottom: 12 },
  evCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 14,
  },
  evIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.primary}15`, alignItems: "center", justifyContent: "center" },
  evName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  evSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  emptyText: { fontSize: 13, color: colors.mutedForeground },
  errTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  errBody: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
});
