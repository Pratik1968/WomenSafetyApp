import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { Users, Siren, Timer, FolderLock, HardDrive, Flame, Activity, ChevronLeft, LogOut } from "lucide-react-native";
import { colors } from "../theme/tokens";
import { Card } from "../components/ds/Card";
import { NavBar } from "../components/ds/NavBar";
import { Screen } from "../components/ds/Screen";
import { Badge } from "../components/ds/Badge";
import { ListItem } from "../components/ds/ListItem";
import { ProgressBar } from "../components/ds/ProgressBar";
import { SectionHeader } from "../components/ds/SectionHeader";
import { EmptyState } from "../components/ds/EmptyState";
import { SkeletonLine } from "../components/ds/SkeletonLine";
import { StatTile } from "../components/ds/StatTile";
import { BarChart } from "../components/ds/BarChart";
import { LineChart } from "../components/ds/LineChart";
import { Heatmap } from "../components/ds/Heatmap";
import { getOverview, getIncidentAnalytics, getHotspots, getHealth } from "../data/admin";
import type { AdminOverview, CrimeHotspot, HealthMetric, IncidentAnalytics } from "../data/models";
import { formatBytes, formatDuration } from "../data/format";

/** Shown when the admin console is opened on a phone instead of the web. */
export function AdminWebOnly({ onBack }: { onBack?: () => void }) {
  return (
    <Screen>
      <NavBar title="Admin console" onBack={onBack} />
      <View style={styles.centerFill}>
        <EmptyState
          title="Open on the web"
          body="The administrative dashboard is designed for admins on a larger screen. Open the app in a browser to continue."
        />
      </View>
    </Screen>
  );
}

export type AdminScreenProps = {
  onBack?: () => void;
  onUsers?: () => void;
  onIncidents?: () => void;
  onSignOut?: () => void;
};

/** Web gate: renders the dashboard only on web, otherwise the "open on web" notice. */
export function AdminDashboardScreen(props: AdminScreenProps) {
  if (Platform.OS !== "web") return <AdminWebOnly onBack={props.onBack} />;
  return <AdminDashboardContent {...props} />;
}

export function AdminDashboardContent({ onBack, onUsers, onIncidents, onSignOut }: AdminScreenProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [analytics, setAnalytics] = useState<IncidentAnalytics | null>(null);
  const [hotspots, setHotspots] = useState<CrimeHotspot[]>([]);
  const [health, setHealth] = useState<HealthMetric[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getOverview(), getIncidentAnalytics(), getHotspots(), getHealth()])
      .then(([o, a, h, hp]) => {
        if (!alive) return;
        setOverview(o);
        setAnalytics(a);
        setHotspots(h);
        setHealth(hp);
      })
      .catch((e) => alive && setError(e?.message ?? "Could not load dashboard"));
    return () => {
      alive = false;
    };
  }, []);

  const uptime = health.filter((h) => h.metric === "uptime");

  return (
    <Screen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Header (inside the centered container so nothing clips at the edge) */}
          <View style={styles.header}>
            {onBack ? (
              <Pressable onPress={onBack} style={styles.backBtn} accessibilityLabel="Back">
                <ChevronLeft size={20} color={colors.foreground} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>Admin dashboard</Text>
              <Text style={styles.h1sub}>Users, incidents, hotspots & system health</Text>
            </View>
            <Badge tone="brand">Admin</Badge>
            {onSignOut ? (
              <Pressable onPress={onSignOut} style={styles.signOutBtn} accessibilityLabel="Sign out" accessibilityRole="button">
                <LogOut size={16} color={colors.mutedForeground} />
                <Text style={styles.signOutText}>Sign out</Text>
              </Pressable>
            ) : null}
          </View>

          {error ? (
            <Card style={styles.card}>
              <Text style={styles.errTitle}>{error.includes("admin") ? "Admins only" : "Couldn’t load dashboard"}</Text>
              <Text style={styles.errBody}>{error}</Text>
            </Card>
          ) : !overview ? (
            <Card style={styles.card}>
              <SkeletonLine style={{ width: "40%" }} />
              <SkeletonLine style={{ width: "70%", marginTop: 12 }} />
              <SkeletonLine style={{ width: "55%", marginTop: 12 }} />
            </Card>
          ) : (
            <>
              {/* KPIs */}
              <View style={styles.kpiGrid}>
                <StatTile label="Total users" value={String(overview.total_users)} delta={`${overview.active_users_7d} active (7d)`} icon={<Users size={18} color={colors.primary} />} />
                <StatTile label="Active incidents" value={String(overview.active_incidents)} delta={`${overview.total_incidents} all-time`} tone="emergency" icon={<Siren size={18} color={colors.emergency} />} />
                <StatTile label="Avg response" value={formatDuration(overview.avg_response_seconds) ?? "—"} tone="warning" icon={<Timer size={18} color={colors.warning} />} />
                <StatTile label="Evidence items" value={String(overview.total_evidence)} tone="brand" icon={<FolderLock size={18} color={colors.primary} />} />
                <StatTile label="Storage used" value={formatBytes(overview.storage_bytes_used)} tone="success" icon={<HardDrive size={18} color={colors.success} />} />
              </View>

              {/* Incident analytics */}
              <View style={styles.section}>
                <SectionHeader title="Incident analytics" action={onIncidents ? "Details" : undefined} />
                <Card style={styles.card}>
                  <Text style={styles.chartLabel}>Last 30 days</Text>
                  <LineChart data={(analytics?.daily ?? []).map((d) => d.incident_count)} height={120} dots />
                  <View style={styles.divider} />
                  <Text style={styles.chartLabel}>By type</Text>
                  {(analytics?.by_type?.length ?? 0) === 0 ? (
                    <Text style={styles.empty}>No incidents recorded yet.</Text>
                  ) : (
                    <BarChart data={(analytics?.by_type ?? []).map((t) => ({ label: t.type, value: t.incident_count }))} height={170} />
                  )}
                </Card>
              </View>

              {/* Hotspots + Health (two columns on wide screens) */}
              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <SectionHeader title="Crime hotspots" />
                  <Card style={styles.card}>
                    {hotspots.length === 0 ? (
                      <Text style={styles.empty}>No hotspot data yet.</Text>
                    ) : (
                      <>
                        <Heatmap cells={hotspots.slice(0, 8).map((h) => ({ label: h.name, value: h.incident_count }))} />
                        <View style={styles.hotspotList}>
                          {hotspots.slice(0, 4).map((h) => {
                            const hot = h.risk_level === "hotspot" || h.risk_level === "high";
                            return (
                              <ListItem
                                key={h.id}
                                icon={<Flame size={18} color={hot ? colors.emergency : colors.warning} />}
                                title={h.name}
                                subtitle={`${h.incident_count} incidents · ${h.risk_level}`}
                                trailing={<Badge tone={hot ? "emergency" : "warning"}>{h.risk_level}</Badge>}
                              />
                            );
                          })}
                        </View>
                      </>
                    )}
                  </Card>
                </View>

                <View style={styles.col}>
                  <SectionHeader title="Service health" />
                  <Card style={styles.card}>
                    {uptime.length === 0 ? (
                      <Text style={styles.empty}>No health metrics yet.</Text>
                    ) : (
                      uptime.map((h) => (
                        <View key={h.service} style={styles.healthRow}>
                          <View style={styles.healthTop}>
                            <View style={styles.healthNameRow}>
                              <Activity size={15} color={colors.success} />
                              <Text style={styles.healthName}>{h.service}</Text>
                            </View>
                            <Text style={styles.healthVal}>{h.value}%</Text>
                          </View>
                          <ProgressBar value={h.value / 100} />
                        </View>
                      ))
                    )}
                  </Card>
                </View>
              </View>

              {/* User management entry */}
              <View style={styles.section}>
                <SectionHeader title="User management" action={onUsers ? "Open" : undefined} />
                <Card style={styles.card}>
                  <ListItem
                    icon={<Users size={18} color={colors.primary} />}
                    title="Manage users"
                    subtitle={`${overview.total_users} users · ${overview.suspended_users} suspended`}
                    onPress={onUsers}
                  />
                </Card>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centerFill: { flex: 1, justifyContent: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 24 },
  container: { width: "100%", maxWidth: 1080, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  signOutBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  signOutText: { fontSize: 14, fontWeight: "500", color: colors.mutedForeground },
  h1: { fontSize: 26, fontWeight: "700", color: colors.foreground, letterSpacing: -0.4 },
  h1sub: { fontSize: 14, color: colors.mutedForeground, marginTop: 2 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  twoCol: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 20 },
  col: { flex: 1, minWidth: 300 },
  section: { marginTop: 20 },
  card: { padding: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  empty: { fontSize: 13, color: colors.mutedForeground, paddingVertical: 10 },
  chartLabel: { fontSize: 12, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5, marginBottom: 8 },
  hotspotList: { marginTop: 8 },
  healthRow: { marginBottom: 14, gap: 6 },
  healthTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  healthNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  healthName: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  healthVal: { fontSize: 13, fontWeight: "600", color: colors.success },
  errTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  errBody: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
});
