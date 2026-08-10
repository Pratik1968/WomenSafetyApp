import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors } from "../theme/tokens";
import { Screen } from "../components/ds/Screen";
import { NavBar } from "../components/ds/NavBar";
import { Badge } from "../components/ds/Badge";
import { AppButton } from "../components/ds/AppButton";
import { BottomNav, type TabKey } from "../components/app/BottomNav";

export type NavLink = { label: string; onPress?: () => void };

/**
 * Generic not-yet-implemented screen: shows the screen name and buttons to navigate to the
 * screens it connects to. Used for every module owned by other teammates.
 *
 * Pass `tab` to render the app's BottomNav (like the reference app) for the top-level tab
 * screens (Home / Safety / Profile); the History tab is the real Incidents screen.
 */
export function PlaceholderScreen({
  title,
  onBack,
  links = [],
  tab,
  onTab,
  onSos,
  onAssistant,
}: {
  title: string;
  onBack?: () => void;
  links?: NavLink[];
  tab?: TabKey;
  onTab?: (t: TabKey) => void;
  onSos?: () => void;
  onAssistant?: () => void;
}) {
  return (
    <Screen>
      <NavBar title={title} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heading}>{title}</Text>
          <Badge tone="warning">Not implemented yet</Badge>
        </View>
        {links.length > 0 ? <Text style={styles.label}>GO TO</Text> : null}
        <View style={styles.links}>
          {links.map((l, i) => (
            <AppButton key={`${l.label}-${i}`} variant={i === 0 ? "primary" : "secondary"} size="md" onPress={l.onPress}>
              {l.label}
            </AppButton>
          ))}
        </View>
      </ScrollView>
      {tab ? <BottomNav active={tab} onSelect={onTab} onSos={onSos} onAssistant={onAssistant} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  hero: { alignItems: "flex-start", gap: 10, marginBottom: 28 },
  heading: { fontSize: 30, fontWeight: "700", color: colors.foreground, letterSpacing: -0.4 },
  label: { fontSize: 12, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.6, marginBottom: 10 },
  links: { gap: 10 },
});
