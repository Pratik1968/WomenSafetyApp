import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Bell, Route as RouteIcon, AlertTriangle, CheckCircle2, Siren } from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { EmptyState } from "../components/ds/EmptyState";
import { NavBar } from "../components/ds/NavBar";

export type NotificationsState = "default" | "empty";
export type NotificationTone = "warning" | "brand" | "success" | "emergency";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: NotificationTone;
  unread: boolean;
}

const NOTIFICATIONS: NotificationItem[] = [
  { id: "1", title: "Area safety update", body: "3 reports of low street lighting submitted in Indiranagar 5th Block.", time: "10m ago", tone: "warning", unread: true },
  { id: "2", title: "Amma started watching", body: "Amma is tracking your live route to Home.", time: "1h ago", tone: "brand", unread: false },
  { id: "3", title: "Test SOS successful", body: "Pulse test reached all 3 trusted contacts.", time: "3h ago", tone: "success", unread: false },
];

export function NotificationsScreen({
  state = "default",
  onBack,
}: {
  state?: NotificationsState;
  onBack?: () => void;
}) {
  return (
    <View style={styles.screen}>
      <NavBar
        title="Notifications"
        onBack={onBack}
        action={state === "default" ? <Text style={styles.readAllText}>Read all</Text> : null}
      />

      {state === "empty" ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Nothing needs you"
            body="Alerts about your journeys, contacts and nearby reports will appear here."
          />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.list}>
            {NOTIFICATIONS.map((n: NotificationItem) => {
              const Icon =
                n.tone === "warning"
                  ? AlertTriangle
                  : n.tone === "success"
                  ? CheckCircle2
                  : n.tone === "emergency"
                  ? Siren
                  : RouteIcon;
              const iconColor =
                n.tone === "warning"
                  ? colors.warning
                  : n.tone === "success"
                  ? colors.success
                  : n.tone === "emergency"
                  ? colors.emergency
                  : colors.primary;

              return (
                <View key={n.id} style={[styles.notificationCard, n.unread && styles.unreadCard]}>
                  <View style={[styles.iconWrap, { backgroundColor: `${iconColor}15` }]}>
                    <Icon size={18} color={iconColor} strokeWidth={2} />
                  </View>
                  <View style={styles.textWrap}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle}>{n.title}</Text>
                      {n.unread ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <Text style={styles.cardBody}>{n.body}</Text>
                    <Text style={styles.cardTime}>{n.time}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  readAllText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  emptyWrap: { flex: 1, justifyContent: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  list: { gap: 10 },
  notificationCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl2,
    padding: 16,
  },
  unreadCard: { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}30` },
  iconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  cardBody: { fontSize: 13, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 },
  cardTime: { fontSize: 11, color: `${colors.mutedForeground}90`, marginTop: 6 },
});
