import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Platform } from "react-native";
import { colors } from "../theme/tokens";
import { Card } from "../components/ds/Card";
import { NavBar } from "../components/ds/NavBar";
import { Screen } from "../components/ds/Screen";
import { Badge } from "../components/ds/Badge";
import { SectionHeader } from "../components/ds/SectionHeader";
import { SkeletonLine } from "../components/ds/SkeletonLine";
import { StatTile } from "../components/ds/StatTile";
import { BarChart } from "../components/ds/BarChart";
import { LineChart } from "../components/ds/LineChart";
import { AdminWebOnly } from "./AdminDashboardScreen";
import { getIncidentAnalytics } from "../data/admin";
import type { IncidentAnalytics } from "../data/models";
import { formatDuration } from "../data/format";

export function AdminIncidentsScreen({ onBack }: { onBack?: () => void }) {
  if (Platform.OS !== "web") return <AdminWebOnly onBack={onBack} />;
  return <AdminIncidentsContent onBack={onBack} />;
}

export function AdminIncidentsContent({ onBack }: { onBack?: () => void }) {
  const [data, setData] = useState<IncidentAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getIncidentAnalytics()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e?.message ?? "Could not load analytics"));
    return () => {
      alive = false;
    };
  }, []);

  const total = (data?.by_type ?? []).reduce((s, t) => s + t.incident_count, 0);
  const peak = Math.max(0, ...(data?.daily ?? []).map((d) => d.incident_count));

  return (
    <Screen>
      <NavBar title="Incident analytics" onBack={onBack} action={<Badge tone="brand">Admin</Badge>} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {error ? (
            <Card style={styles.card}>
              <Text style={styles.errTitle}>{error.includes("admin") ? "Admins only" : "Couldn’t load analytics"}</Text>
              <Text style={styles.errBody}>{error}</Text>
            </Card>
          ) : !data ? (
            <Card style={styles.card}>
              <SkeletonLine style={{ width: "45%" }} />
              <SkeletonLine style={{ width: "75%", marginTop: 12 }} />
            </Card>
          ) : (
            <>
              <View style={styles.kpiGrid}>
                <StatTile label="Incidents (30d)" value={String(total)} icon={undefined} />
                <StatTile label="Busiest day" value={String(peak)} tone="warning" />
                <StatTile label="Avg response" value={formatDuration(data.avg_response_seconds) ?? "—"} tone="success" />
              </View>

              <View style={styles.section}>
                <SectionHeader title="Daily trend (30 days)" />
                <Card style={styles.card}>
                  <LineChart data={data.daily.map((d) => d.incident_count)} height={140} dots />
                </Card>
              </View>

              <View style={styles.section}>
                <SectionHeader title="Incidents by type" />
                <Card style={styles.card}>
                  <BarChart data={data.by_type.map((t) => ({ label: t.type, value: t.incident_count }))} height={170} />
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  container: { width: "100%", maxWidth: 1040, alignSelf: "center", marginTop: 8 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  section: { marginTop: 20 },
  card: { padding: 16 },
  errTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  errBody: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
});
