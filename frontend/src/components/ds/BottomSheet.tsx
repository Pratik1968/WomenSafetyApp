import type { ReactNode } from "react";
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { colors } from "../../theme/tokens";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: `${colors.foreground}33`,
  },
  sheet: {
    maxHeight: "78%",
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: "center",
    marginTop: 12,
    width: 40,
    height: 6,
    borderRadius: 9999,
    backgroundColor: colors.border,
  },
  title: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 19,
    fontWeight: "600",
    letterSpacing: -0.19,
    color: colors.foreground,
  },
  content: { maxHeight: 480 },
  contentInner: { paddingHorizontal: 16, paddingBottom: 8 },
});
