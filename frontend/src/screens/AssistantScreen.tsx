import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from "react-native";
import { ArrowUp, Plus, ShieldCheck, Sparkles } from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { ChatBubble } from "../components/ds/ChatBubble";
import { EmptyState } from "../components/ds/EmptyState";
import { NavBar } from "../components/ds/NavBar";

export type AssistantState = "chat" | "typing" | "empty";

const CHAT = [
  { id: "1", from: "aegis" as const, text: "Hi Aisha, I'm Aegis. I monitor safety data and keep an eye on your surroundings. How can I help right now?", time: "9:40 PM" },
  { id: "2", from: "user" as const, text: "Is it safe to walk from Indiranagar metro to 100 Ft Road at this hour?", time: "9:41 PM" },
  { id: "3", from: "aegis" as const, text: "The main 100 Ft Road is bright and active right now, but 5th Cross behind the metro has low lighting reports. I recommend staying on the main road.", time: "9:41 PM" },
];

const CHAT_QUICK = [
  "Safe way home?",
  "Check nearby police",
  "How does Safety Mode work?",
  "Report low lighting",
];

export function AssistantScreen({
  state = "chat",
  onBack,
}: {
  state?: AssistantState;
  onBack?: () => void;
}) {
  const [input, setInput] = useState("");
  const messages = state === "empty" ? [] : CHAT;

  return (
    <View style={styles.screen}>
      <NavBar
        title="Ask Aegis"
        onBack={onBack}
        action={
          <View style={styles.headerIconWrap}>
            <Sparkles size={16} color={colors.primaryForeground} />
          </View>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {state === "empty" ? (
          <EmptyState
            title="No conversations yet"
            body="Ask about a route, a place, or what to do right now. Aegis answers calmly and fast."
          />
        ) : (
          <View style={styles.messagesList}>
            {messages.map((m) => (
              <ChatBubble key={m.id} from={m.from} time={m.time}>
                {m.text}
              </ChatBubble>
            ))}

            {state === "typing" ? (
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>Aegis is typing...</Text>
              </View>
            ) : (
              <View style={styles.suggestionCard}>
                <ShieldCheck size={18} color={colors.primary} />
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionTitle}>Start Safety Mode now?</Text>
                  <Text style={styles.suggestionSub}>Amma and Meera will see your live route until you arrive.</Text>
                  <View style={styles.suggestionButtons}>
                    <Pressable style={styles.suggestBtnPrimary}>
                      <Text style={styles.suggestBtnPrimaryText}>Yes, start</Text>
                    </Pressable>
                    <Pressable style={styles.suggestBtnSecondary}>
                      <Text style={styles.suggestBtnSecondaryText}>Not now</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Quick Prompts */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptsRow}>
        {CHAT_QUICK.map((q) => (
          <Pressable key={q} onPress={() => setInput(q)} style={styles.promptChip}>
            <Text style={styles.promptChipText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Composer Input Bar */}
      <View style={styles.composerContainer}>
        <View style={styles.composerBar}>
          <Pressable style={styles.plusBtn}>
            <Plus size={18} color={colors.mutedForeground} />
          </Pressable>
          <TextInput
            style={styles.textInput}
            placeholder="Ask Aegis anything…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
          />
          <Pressable style={styles.sendBtn}>
            <ArrowUp size={18} color={colors.primaryForeground} strokeWidth={2.5} />
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>Aegis gives guidance, not medical or legal advice.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  messagesList: { gap: 14 },
  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  typingText: { fontSize: 13, color: colors.mutedForeground },
  suggestionCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    borderRadius: radii.xl2,
    padding: 16,
    marginTop: 8,
  },
  suggestionTextWrap: { flex: 1, gap: 4 },
  suggestionTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  suggestionSub: { fontSize: 13, color: colors.mutedForeground },
  suggestionButtons: { flexDirection: "row", gap: 10, marginTop: 10 },
  suggestBtnPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  suggestBtnPrimaryText: { fontSize: 13, fontWeight: "700", color: colors.primaryForeground },
  suggestBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  suggestBtnSecondaryText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  quickPromptsRow: { gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
  promptChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  promptChipText: { fontSize: 13, color: colors.foreground, fontWeight: "500" },
  composerContainer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
  composerBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: { flex: 1, fontSize: 15, color: colors.foreground, paddingHorizontal: 6 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: { fontSize: 11, color: colors.mutedForeground, textAlign: "center", marginTop: 8 },
});
