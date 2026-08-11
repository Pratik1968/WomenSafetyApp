import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from "react-native";
import {
  Hospital,
  ShieldCheck,
  HeartHandshake,
  Navigation,
  PhoneCall,
  Map as MapIcon,
  List,
  MapPin,
} from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { Badge } from "../components/ds/Badge";
import { Card } from "../components/ds/Card";
import { Chip } from "../components/ds/Chip";
import { NavBar } from "../components/ds/NavBar";

export type NearbyState = "list" | "map" | "loading";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "police", label: "Police" },
  { id: "hospital", label: "Hospitals" },
  { id: "ngo", label: "NGOs" },
];

const HELP_PLACES = [
  { id: "1", name: "Indiranagar Police Station", kind: "police", detail: "100 Ft Road • 24/7 Desk", distance: "400 m", open: true },
  { id: "2", name: "Manipal Hospital Emergency", kind: "hospital", detail: "HAL Old Airport Rd • Trauma Unit", distance: "1.2 km", open: true },
  { id: "3", name: "St. John Women Safety Cell", kind: "ngo", detail: "Koramangala • Support & Shelter", distance: "2.4 km", open: true },
];

const EMERGENCY_NUMBERS = [
  { id: "e1", label: "National Emergency", number: "112", tag: "24/7 Police & Rescue" },
  { id: "e2", label: "Women's Helpline", number: "1091", tag: "Priority Toll-Free" },
  { id: "e3", label: "Ambulance Emergency", number: "108", tag: "Medical" },
];

export function NearbyHelpScreen({
  state = "list",
  onBack,
}: {
  state?: NearbyState;
  onBack?: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"list" | "map">(state === "map" ? "map" : "list");

  const places = HELP_PLACES.filter((p) => filter === "all" || p.kind === filter);

  return (
    <View style={styles.screen}>
      <NavBar
        title="Nearby help"
        onBack={onBack}
        action={
          <Pressable
            onPress={() => setView(view === "map" ? "list" : "map")}
            accessibilityLabel="Toggle view"
            style={styles.toggleBtn}
          >
            {view === "map" ? (
              <List size={18} color={colors.foreground} />
            ) : (
              <MapIcon size={18} color={colors.foreground} />
            )}
          </Pressable>
        }
      />

      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <Chip key={f.id} active={filter === f.id} onPress={() => setFilter(f.id)}>
            {f.label}
          </Chip>
        ))}
      </View>

      {view === "map" ? (
        <View style={styles.mapContainer}>
          <View style={styles.mapStub}>
            <MapPin size={32} color={colors.primary} />
            <Text style={styles.mapStubHeading}>Interactive Help Map</Text>
            <Text style={styles.mapStubSub}>{places.length} stations located nearby</Text>
          </View>
          {places[0] ? (
            <Card style={styles.mapBottomCard}>
              <View style={styles.placeIconWrap}>
                <ShieldCheck size={20} color={colors.primary} />
              </View>
              <View style={styles.placeTextWrap}>
                <Text style={styles.placeTitle}>{places[0].name}</Text>
                <Text style={styles.placeDetail}>{places[0].distance} • {places[0].open ? "Open now" : "Closed"}</Text>
              </View>
              <View style={styles.mapNavCircle}>
                <Navigation size={18} color={colors.primaryForeground} />
              </View>
            </Card>
          ) : null}
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.placesList}>
            {places.map((p) => {
              const Icon = p.kind === "hospital" ? Hospital : p.kind === "police" ? ShieldCheck : HeartHandshake;
              return (
                <Card key={p.id} style={styles.placeCard}>
                  <View style={styles.placeIconWrap}>
                    <Icon size={20} color={colors.primary} />
                  </View>
                  <View style={styles.placeTextWrap}>
                    <Text style={styles.placeTitle}>{p.name}</Text>
                    <Text style={styles.placeDetail}>{p.detail}</Text>
                    <View style={styles.placeBadgeRow}>
                      <Text style={styles.distanceText}>{p.distance}</Text>
                      <Badge tone={p.open ? "success" : "neutral"}>
                        {p.open ? "Open now" : "Closed"}
                      </Badge>
                    </View>
                  </View>
                  <View style={styles.actionButtonsCol}>
                    <Pressable style={styles.iconCircleBtn}>
                      <PhoneCall size={17} color={colors.foreground} />
                    </Pressable>
                    <Pressable style={styles.iconCircleNavBtn}>
                      <Navigation size={17} color={colors.primaryForeground} />
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>

          <Text style={styles.sectionHeading}>EMERGENCY NUMBERS</Text>
          <Card style={styles.numbersCard}>
            {EMERGENCY_NUMBERS.map((n) => (
              <Pressable
                key={n.id}
                style={styles.numberRow}
                onPress={() => Linking.openURL(`tel:${n.number}`)}
                accessibilityLabel={`Call ${n.label} ${n.number}`}
              >
                <View style={styles.phoneIconWrap}>
                  <PhoneCall size={17} color={colors.emergency} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.numberLabel}>{n.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{n.tag}</Text>
                </View>
                <Text style={styles.numberValue}>{n.number}</Text>
              </Pressable>
            ))}
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  placesList: { gap: 12 },
  placeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  placeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  placeTextWrap: { flex: 1 },
  placeTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  placeDetail: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  placeBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  distanceText: { fontSize: 12, color: colors.mutedForeground },
  actionButtonsCol: { gap: 8 },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5, marginTop: 24, marginBottom: 12 },
  numbersCard: { padding: 8 },
  numberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, gap: 12 },
  phoneIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.emergency}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  numberLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.foreground },
  numberValue: { fontSize: 17, fontWeight: "700", color: colors.emergency },
  mapContainer: { flex: 1, paddingHorizontal: 20, justifyContent: "space-between", paddingBottom: 20 },
  mapStub: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl2,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  mapStubHeading: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  mapStubSub: { fontSize: 14, color: colors.mutedForeground },
  mapBottomCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  mapNavCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
