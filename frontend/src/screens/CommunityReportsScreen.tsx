import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, Image, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { MapPin } from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { AppButton } from "../components/ds/AppButton";
import { Badge } from "../components/ds/Badge";
import { Card } from "../components/ds/Card";
import { Chip } from "../components/ds/Chip";
import { EmptyState } from "../components/ds/EmptyState";
import { NavBar } from "../components/ds/NavBar";
import { Screen } from "../components/ds/Screen";
import { REPORT_TYPE_META } from "../components/app/reportMeta";
import { fetchMyReports, fetchNearbyReports, type IncidentReport } from "../data/reports";
import { timeAgo } from "../data/format";

type FeedTab = "nearby" | "mine";

// Same default as MapPicker.tsx — Bengaluru.
const FALLBACK_COORDS = { lat: 12.9719, lng: 77.5937 };

export function CommunityReportsScreen({
  onBack,
  onReportNew,
}: {
  onBack?: () => void;
  onReportNew?: () => void;
}) {
  const [tab, setTab] = useState<FeedTab>("nearby");
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (activeTab: FeedTab, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      if (activeTab === "mine") {
        setReports(await fetchMyReports());
      } else {
        let coords = FALLBACK_COORDS;
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          try {
            const pos = await Location.getCurrentPositionAsync({});
            coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          } catch {
            /* fall back to default */
          }
        }
        setReports(await fetchNearbyReports(coords.lat, coords.lng, 5));
      }
    } catch (e) {
      setReports([]);
      setError(
        (e as Error)?.message ??
          (activeTab === "mine"
            ? "Couldn't load your reports. Check your connection and try again."
            : "Couldn't load nearby reports. Check your connection and try again."),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <Screen>
      <NavBar title="Community reports" onBack={onBack} />

      <View style={styles.tabsRow}>
        <Chip active={tab === "nearby"} onPress={() => setTab("nearby")}>
          Nearby
        </Chip>
        <Chip active={tab === "mine"} onPress={() => setTab("mine")}>
          Mine
        </Chip>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(tab, true)} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading reports…</Text>
          </View>
        ) : error ? (
          <EmptyState
            title="Something went wrong"
            body={error}
            action={
              <AppButton size="md" onPress={() => load(tab)}>
                Try again
              </AppButton>
            }
          />
        ) : reports.length === 0 ? (
          <EmptyState
            title={tab === "mine" ? "You haven't reported anything yet" : "No reports nearby"}
            body={
              tab === "mine"
                ? "Reports you submit will show up here so you can track them."
                : "Nobody has reported an unsafe area near you recently — that's a good sign."
            }
            action={
              <AppButton size="md" onPress={onReportNew}>
                Report an area
              </AppButton>
            }
          />
        ) : (
          <View style={styles.list}>
            {reports.map((r) => {
              const meta = REPORT_TYPE_META[r.report_type];
              const Icon = meta?.Icon ?? MapPin;
              const iconColor = meta?.color ?? colors.primary;
              const photo = r.media?.find((m) => m.type === "photo");
              return (
                <Card key={r.id} style={styles.reportCard}>
                  <View style={styles.reportTopRow}>
                    <View style={[styles.iconWrap, { backgroundColor: `${iconColor}15` }]}>
                      <Icon size={18} color={iconColor} strokeWidth={2} />
                    </View>
                    <View style={styles.reportTextWrap}>
                      <Text style={styles.reportTitle}>{meta?.label ?? r.report_type}</Text>
                      <Text style={styles.reportMeta} numberOfLines={1}>
                        {r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                        {r.created_at ? ` · ${timeAgo(r.created_at)}` : ""}
                      </Text>
                    </View>
                    {tab === "mine" ? (
                      <Badge tone={r.status === "resolved" ? "success" : r.status === "reviewed" ? "brand" : "neutral"}>
                        {r.status}
                      </Badge>
                    ) : null}
                  </View>
                  {r.description ? <Text style={styles.reportDescription}>{r.description}</Text> : null}
                  {photo ? <Image source={{ uri: photo.url }} style={styles.reportPhoto} /> : null}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton onPress={onReportNew}>Report an unsafe area</AppButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  loadingWrap: { alignItems: "center", paddingVertical: 48, gap: 12 },
  loadingText: { fontSize: 14, color: colors.mutedForeground },
  list: { gap: 12 },
  reportCard: { padding: 14, gap: 10 },
  reportTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  reportTextWrap: { flex: 1 },
  reportTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  reportMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  reportDescription: { fontSize: 13, color: colors.foreground, lineHeight: 18 },
  reportPhoto: { width: "100%", height: 160, borderRadius: radii.lg, backgroundColor: colors.surface },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8 },
});
