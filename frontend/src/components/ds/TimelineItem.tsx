import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

export type TimelineTone = "brand" | "success" | "warning" | "emergency";

export function TimelineItem({
  time,
  title,
  detail,
  tone = "brand",
  last,
}: {
  time: string;
  title: string;
  detail?: string;
  tone?: TimelineTone;
  last?: boolean;
}) {
  const dotColor = { brand: colors.primary, success: colors.success, warning: colors.warning, emergency: colors.emergency }[tone];
  return (
    <View style={styles.row}>
      <Text style={styles.time}>{time}</Text>
      <View style={styles.dotColumn}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {last ? null : <View style={styles.connector} />}
      </View>
      <View style={[styles.content, { paddingBottom: last ? 0 : 24 }]}>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  time: { width: 64, paddingTop: 3, textAlign: "right", fontSize: 13, color: colors.mutedForeground },
  dotColumn: { width: 20, alignItems: "center" },
  dot: { marginTop: 7, width: 10, height: 10, borderRadius: 5 },
  connector: { position: "absolute", top: 20, bottom: 0, width: 1, backgroundColor: colors.border },
  content: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "600", letterSpacing: -0.15, color: colors.foreground },
  detail: { fontSize: 14, lineHeight: 20, color: colors.mutedForeground },
});
