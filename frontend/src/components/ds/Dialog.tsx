import type { ReactNode } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";

export function Dialog({
  open,
  onClose,
  title,
  body,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  actions: ReactNode;
}) {
  if (!open) return null;
  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.actions}>{actions}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: `${colors.foreground}33`,
  },
  card: {
    width: "100%",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  title: { fontSize: 19, fontWeight: "600", letterSpacing: -0.19, color: colors.foreground, textAlign: "center" },
  body: { marginTop: 8, fontSize: 15, lineHeight: 22, color: colors.mutedForeground, textAlign: "center" },
  actions: { marginTop: 24, width: "100%", gap: 8 },
});
