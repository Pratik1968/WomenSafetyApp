import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import {
  Clock,
  Lightbulb,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { AppButton } from "../components/ds/AppButton";
import { Badge } from "../components/ds/Badge";
import { Card } from "../components/ds/Card";
import { NavBar } from "../components/ds/NavBar";

export type SafeRouteState = "search" | "results" | "loading";

const PLACES = [
  { id: "p1", name: "Home", detail: "100 Ft Road, Indiranagar" },
  { id: "p2", name: "Office", detail: "Koramangala 5th Block" },
  { id: "p3", name: "Starbucks Indiranagar", detail: "12th Main Road" },
];

const SAFE_ROUTES = [
  { id: "sr1", label: "Lit Corridor Main Rd", risk: "low" as const, detail: "98% well lit · High CCTV coverage", time: "18 min", distance: "4.2 km" },
  { id: "sr2", label: "Inner Link Road", risk: "medium" as const, detail: "72% well lit · Medium traffic", time: "14 min", distance: "3.6 km" },
];

const RISK_TONE = {
  low: { label: "Low risk", tone: "success" as const },
  medium: { label: "Some risk", tone: "warning" as const },
  high: { label: "High risk", tone: "emergency" as const },
};

export function SafeRouteScreen({
  state = "results",
  onBack,
  onStartNavigation,
}: {
  state?: SafeRouteState;
  onBack?: () => void;
  onStartNavigation?: () => void;
}) {
  const [picked, setPicked] = useState("sr1");

  if (state === "search") {
    return (
      <View style={styles.screen}>
        <NavBar title="Safe route" onBack={onBack} />
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.mutedForeground} />
            <Text style={styles.searchPlaceholder}>Where are you going?</Text>
          </View>
          <Text style={styles.sectionHeaderTitle}>Saved & recent</Text>
          <View style={styles.placesList}>
            {PLACES.map((p) => (
              <Pressable key={p.id} style={styles.placeCard}>
                <View style={styles.placeIcon}>
                  <MapPin size={18} color={colors.primary} />
                </View>
                <View style={styles.placeTextWrap}>
                  <Text style={styles.placeName}>{p.name}</Text>
                  <Text style={styles.placeDetail}>{p.detail}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <NavBar title="Safe route" onBack={onBack} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Map corridor stub */}
        <View style={styles.mapStub}>
          <MapPin size={24} color={colors.primary} />
          <Text style={styles.mapStubText}>Safe Corridor View</Text>
          <View style={styles.mapOverlayPill}>
            <View style={styles.mapDotPrimary} />
            <Text style={styles.mapDotText}>Current location</Text>
          </View>
          <View style={styles.mapOverlayPill}>
            <View style={styles.mapDotSuccess} />
            <Text style={styles.mapDotText}>Home · Nandi Layout</Text>
          </View>
        </View>

        <Text style={styles.routesTitle}>Suggested Routes</Text>
        <View style={styles.routesList}>
          {SAFE_ROUTES.map((r) => {
            const risk = RISK_TONE[r.risk];
            const active = picked === r.id;
            return (
              <Pressable
                key={r.id}
                onPress={() => setPicked(r.id)}
                style={[styles.routeCard, active && styles.routeCardActive]}
              >
                <View style={styles.routeHeader}>
                  <Text style={styles.routeLabel}>{r.label}</Text>
                  <Badge tone={risk.tone}>{risk.label}</Badge>
                </View>
                <Text style={styles.routeDetail}>{r.detail}</Text>
                <View style={styles.routeMetaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={14} color={colors.mutedForeground} />
                    <Text style={styles.metaText}>{r.time}</Text>
                  </View>
                  <Text style={styles.metaText}>{r.distance}</Text>
                  <View style={styles.metaItem}>
                    {r.risk === "low" ? (
                      <Lightbulb size={14} color={colors.success} />
                    ) : (
                      <TriangleAlert size={14} color={colors.warning} />
                    )}
                    <Text style={styles.metaText}>{r.risk === "low" ? "Well lit" : "Check lighting"}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.disclaimerBox}>
          <ShieldCheck size={14} color={colors.mutedForeground} />
          <Text style={styles.disclaimerText}>
            Safety Mode turns on automatically when you start.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton onPress={onStartNavigation}>Start navigation</AppButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchContainer: { paddingHorizontal: 20, paddingTop: 12 },
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
    marginBottom: 20,
  },
  searchPlaceholder: { fontSize: 15, color: colors.mutedForeground },
  sectionHeaderTitle: { fontSize: 13, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5, marginBottom: 12 },
  placesList: { gap: 10 },
  placeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 14,
    gap: 12,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  placeTextWrap: { flex: 1 },
  placeName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  placeDetail: { fontSize: 13, color: colors.mutedForeground },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  mapStub: {
    height: 180,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl2,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 16,
  },
  mapStubText: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  mapOverlayPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  mapDotPrimary: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  mapDotSuccess: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  mapDotText: { fontSize: 13, fontWeight: "500", color: colors.foreground },
  routesTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground, marginBottom: 12 },
  routesList: { gap: 12 },
  routeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl2,
    padding: 16,
    gap: 8,
  },
  routeCardActive: { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}50` },
  routeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  routeLabel: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  routeDetail: { fontSize: 13, color: colors.mutedForeground },
  routeMetaRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: colors.mutedForeground },
  disclaimerBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginVertical: 16 },
  disclaimerText: { fontSize: 12, color: colors.mutedForeground },
  footer: { paddingHorizontal: 20, paddingBottom: 20 },
});
