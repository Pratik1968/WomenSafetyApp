import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Card } from "./Card";
import { colors, gradientBrand } from "../../theme/tokens";

export function ProfileCard({ initials, name, meta, action }: { initials: string; name: string; meta: string; action?: ReactNode }) {
  return (
    <Card style={styles.row}>
      <LinearGradient
        colors={gradientBrand as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.avatar}
      >
        <Text style={styles.initials}>{initials}</Text>
      </LinearGradient>
      <View style={styles.textWrap}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
      </View>
      {action}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  initials: { fontSize: 20, fontWeight: "600", color: colors.primaryForeground },
  textWrap: { flex: 1, minWidth: 0 },
  name: { fontSize: 19, fontWeight: "600", letterSpacing: -0.19, color: colors.foreground },
  meta: { fontSize: 14, color: colors.mutedForeground },
});
