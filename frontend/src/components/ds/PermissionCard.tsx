import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "./Card";
import { colors } from "../../theme/tokens";

export function PermissionCard({ icon, title, reason }: { icon: ReactNode; title: string; reason: string }) {
  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.reason}>{reason}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center" },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primary}14`,
  },
  title: { fontSize: 19, fontWeight: "600", letterSpacing: -0.19, color: colors.foreground, textAlign: "center" },
  reason: { marginTop: 8, fontSize: 15, lineHeight: 22, color: colors.mutedForeground, textAlign: "center" },
});
