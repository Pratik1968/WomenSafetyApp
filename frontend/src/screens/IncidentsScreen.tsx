import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { Plus, ChevronRight } from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { Badge } from "../components/ds/Badge";
import { Card } from "../components/ds/Card";
import { Screen } from "../components/ds/Screen";
import { EmptyState } from "../components/ds/EmptyState";
import { SkeletonLine } from "../components/ds/SkeletonLine";
import { AppButton } from "../components/ds/AppButton";
import { BottomNav, type TabKey } from "../components/app/BottomNav";
import { INCIDENT_META, INCIDENT_STATUS } from "../components/app/entityMeta";
import { listIncidents } from "../data/incidents";
import type { Incident } from "../data/models";
import { formatDate } from "../data/format";

export function IncidentsScreen({
  onOpen,
  onNew,
  onTab,
  onAssistant,
  onSos,
}: {
  onOpen?: (id: string) => void;
  onNew?: () => void;
  onTab?: (t: TabKey) => void;
  onAssistant?: () => void;
  onSos?: () => void;
}) {
  const [items, setItems] = useState<Incident[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { pull?: boolean }) => {
    if (opts?.pull) setRefreshing(true);
    else setItems(null);
    setError(null);
    try {
      setItems(await listIncidents());
    } catch (e) {
      setError((e as Error)?.message ?? "Could not load incidents");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Incidents</Text>
          <Text style={styles.headerSub}>Your reports and the evidence attached to them.</Text>
        </View>
        <Pressable onPress={onNew} style={styles.addBtn} accessibilityLabel="Report incident">
          <Plus size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ pull: true })} tintColor={colors.primary} />}
      >
        {error ? (
          <Card style={styles.card}>
            <Text style={styles.errTitle}>Couldn’t load incidents</Text>
            <Text style={styles.errBody}>{error}</Text>
          </Card>
        ) : items === null ? (
          <View style={styles.list}>
            {[0, 1, 2].map((i) => (
              <Card key={i} style={styles.card}>
                <SkeletonLine style={{ width: "55%" }} />
                <SkeletonLine style={{ width: "35%", marginTop: 10 }} />
              </Card>
            ))}
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            title="No incidents yet"
            body="Report an incident to start capturing encrypted evidence — audio, video, photos and GPS."
            action={<AppButton size="md" onPress={onNew}>Report an incident</AppButton>}
          />
        ) : (
          <View style={styles.list}>
            {items.map((it) => {
              const meta = INCIDENT_META[it.type];
              const st = INCIDENT_STATUS[it.status];
              return (
                <Pressable key={it.id} onPress={() => onOpen?.(it.id)} style={styles.itemCard}>
                  <View style={[styles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
                    <meta.Icon size={20} color={meta.color} strokeWidth={2} />
                  </View>
                  <View style={styles.itemText}>
                    <View style={styles.topRow}>
                      <Text style={styles.title}>{meta.label}</Text>
                      <Text style={styles.date}>{formatDate(it.started_at)}</Text>
                    </View>
                    <Text style={styles.place} numberOfLines={1}>
                      {it.address || "No location"}
                    </Text>
                    <View style={styles.badgeRow}>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.mutedForeground} opacity={0.6} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomNav active="history" onSelect={onTab} onAssistant={onAssistant} onSos={onSos} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 12 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: colors.foreground, letterSpacing: -0.3 },
  headerSub: { fontSize: 15, color: colors.mutedForeground, marginTop: 4 },
  addBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  list: { gap: 12 },
  card: { padding: 16 },
  itemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl2,
    padding: 16,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  date: { fontSize: 12, color: colors.mutedForeground },
  place: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  badgeRow: { marginTop: 8, alignSelf: "flex-start" },
  errTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  errBody: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
});
