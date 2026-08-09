import type { ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors } from "../../theme/tokens";

export function SettingRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
  tone = "default",
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  tone?: "default" | "danger";
}) {
  const Container = onPress ? Pressable : View;
  return (
    <Container onPress={onPress} style={styles.row}>
      {icon ? (
        <View style={[styles.iconWrap, tone === "danger" && styles.iconWrapDanger]}>{icon}</View>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={[styles.title, tone === "danger" && styles.titleDanger]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? <ChevronRight size={18} color={colors.mutedForeground} opacity={0.6} />}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  iconWrapDanger: {
    backgroundColor: `${colors.emergency}1a`,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.16,
    color: colors.foreground,
  },
  titleDanger: {
    color: colors.emergency,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
