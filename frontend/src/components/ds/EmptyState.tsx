import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

export function EmptyState({
  illustration,
  title,
  body,
  action,
}: {
  illustration?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.illustrationWrap}>
        <View style={styles.blob} />
        {illustration}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 48 },
  illustrationWrap: { marginBottom: 24, width: 112, height: 112, alignItems: "center", justifyContent: "center" },
  blob: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.brandViolet}40`,
  },
  title: { fontSize: 19, fontWeight: "600", letterSpacing: -0.19, color: colors.foreground, textAlign: "center" },
  body: { marginTop: 8, maxWidth: 260, fontSize: 15, lineHeight: 22, color: colors.mutedForeground, textAlign: "center" },
  action: { marginTop: 24, width: "100%", maxWidth: 220 },
});
