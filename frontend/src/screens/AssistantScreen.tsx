/**
 * AssistantScreen — "Ask Aegis" AI Chat
 *
 * Redesigned with modern ChatGPT/Gemini-quality UI:
 * - Compact horizontal suggestion chips (hidden after first message)
 * - Aegis message bubbles with icon + title + body + action buttons
 * - Minimal whitespace for maximum chat area
 * - Predefined templates for key safety workflows
 * - Natural, calm canned responses
 *
 * Architecture (providers, hooks, API) is unchanged.
 */

import { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowUp,
  MapPin,
  Sparkles,
  RefreshCw,
  Shield,
  Phone,
  Navigation,
  AlertTriangle,
  Heart,
  Scale,
  Info,
  ChevronRight,
} from "lucide-react-native";
import { colors, gradientBrand, radii } from "../theme/tokens";
import { NavBar } from "../components/ds/NavBar";
import { useAI } from "../hooks/useAI";
import { useLocation } from "../modules/location";
import { AISafetyIntent } from "../modules/ai/types/ai.types";

// ─── Suggestion Chips ──────────────────────────────────────────────────────────

interface SuggestionChip {
  id: string;
  label: string;
  prompt: string;
  icon: React.ComponentType<any>;
}

const SUGGESTION_CHIPS: SuggestionChip[] = [
  { id: "safe-route",   label: "Safe Route",         prompt: "What's the safest route home from my current location?",        icon: Navigation },
  { id: "police",       label: "Nearby Police",      prompt: "Show me the nearest police station and contact number.",         icon: Shield },
  { id: "hospital",     label: "Hospital",           prompt: "Find the nearest hospital or emergency medical center.",          icon: Heart },
  { id: "report",       label: "Report Area",        prompt: "How do I report an unsafe area or suspicious activity?",          icon: AlertTriangle },
  { id: "emergency",    label: "Emergency Help",     prompt: "I need emergency help right now. What should I do?",              icon: Phone },
  { id: "safety-mode",  label: "Safety Mode",        prompt: "How does Safety Mode work and how do I start it?",               icon: Sparkles },
  { id: "legal",        label: "Legal Rights",       prompt: "What are my legal rights if I feel unsafe or harassed?",          icon: Scale },
  { id: "first-aid",    label: "First Aid",          prompt: "Give me basic first aid steps for a common emergency.",           icon: Info },
];

// ─── Intent → icon + title mapping ────────────────────────────────────────────

interface IntentMeta {
  icon: React.ComponentType<any>;
  color: string;
  title: string;
}

function getIntentMeta(intent?: AISafetyIntent): IntentMeta {
  switch (intent) {
    case "EMERGENCY":
      return { icon: Phone,        color: colors.emergency, title: "Emergency Guidance" };
    case "POLICE_LOOKUP":
      return { icon: Shield,       color: colors.primary,   title: "Police Information" };
    case "HOSPITAL_LOOKUP":
      return { icon: Heart,        color: "#ec4899",        title: "Medical Help" };
    case "FIRST_AID":
      return { icon: Heart,        color: "#22c55e",        title: "First Aid" };
    case "LEGAL":
      return { icon: Scale,        color: colors.warning,   title: "Legal Guidance" };
    case "SAFETY_GUIDANCE":
      return { icon: Shield,       color: colors.primary,   title: "Safety Tips" };
    case "EMOTIONAL_SUPPORT":
      return { icon: Heart,        color: "#ec4899",        title: "You've got this" };
    default:
      return { icon: Sparkles,     color: colors.primary,   title: "Aegis" };
  }
}

// ─── Typing Indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <View style={styles.typingRow}>
      <View style={styles.aegisAvatar}>
        <Sparkles size={12} color={colors.primaryForeground} />
      </View>
      <View style={styles.typingBubble}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.typingText}>Aegis is thinking…</Text>
      </View>
    </View>
  );
}

// ─── AssistantScreen ───────────────────────────────────────────────────────────

export function AssistantScreen({ onBack }: { onBack?: () => void }) {
  const { messages: aiMessages, isThinking, networkError, sendChatMessage, clearHistory } = useAI();
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const { formattedAddress } = useLocation();

  // Derive whether user has sent at least one message
  const hasConversation = aiMessages.some((m) => m.role === "user");

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    return () => clearTimeout(t);
  }, [aiMessages, isThinking]);

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    sendChatMessage(msg);
    setInput("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <NavBar
        title="Ask Aegis"
        onBack={onBack}
        action={
          hasConversation ? (
            <Pressable onPress={clearHistory} style={styles.headerActionBtn} hitSlop={8}>
              <RefreshCw size={15} color={colors.mutedForeground} />
            </Pressable>
          ) : (
            <View style={styles.headerAegisChip}>
              <Sparkles size={13} color={colors.primaryForeground} />
              <Text style={styles.headerAegisChipText}>AI</Text>
            </View>
          )
        }
      />

      {/* ── Location strip ─────────────────────────────────────────────────── */}
      {formattedAddress ? (
        <View style={styles.locationBar}>
          <MapPin size={12} color={colors.primary} />
          <Text style={styles.locationBarText} numberOfLines={1}>
            {formattedAddress}
          </Text>
          <Text style={styles.locationBarBadge}>· Police 0.8km · Hospital 1.2km</Text>
        </View>
      ) : null}

      {/* ── Offline banner ──────────────────────────────────────────────────── */}
      {networkError ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>⚡ Offline — cached responses in use</Text>
        </View>
      ) : null}

      {/* ── Chat area ──────────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          !hasConversation && styles.scrollContentCentered,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {!hasConversation ? (
          /* ── Welcome state ─────────────────────────────────────────────── */
          <View style={styles.welcomeWrap}>
            <LinearGradient
              colors={gradientBrand as unknown as [string, string, ...string[]]}
              style={styles.welcomeAvatar}
            >
              <Sparkles size={28} color="#fff" />
            </LinearGradient>
            <Text style={styles.welcomeTitle}>How can I help you?</Text>
            <Text style={styles.welcomeSubtitle}>
              I'm Aegis — your personal safety assistant. Ask me anything.
            </Text>
          </View>
        ) : (
          /* ── Messages list ─────────────────────────────────────────────── */
          <View style={styles.messagesList}>
            {aiMessages.map((m) => {
              if (m.role === "user") {
                return (
                  <View key={m.id} style={styles.userRow}>
                    <LinearGradient
                      colors={gradientBrand as unknown as [string, string, ...string[]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.userBubble}
                    >
                      <Text style={styles.userBubbleText}>{m.content}</Text>
                    </LinearGradient>
                    <Text style={styles.messageTime}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                );
              }

              // Assistant message
              const meta = getIntentMeta(m.intent);
              const IconComp = meta.icon;
              const actions = m.actionPayload?.suggestedActions ?? [];

              return (
                <View key={m.id} style={styles.aegisRow}>
                  {/* Avatar */}
                  <View style={[styles.aegisBubbleAvatar, { backgroundColor: `${meta.color}18` }]}>
                    <IconComp size={14} color={meta.color} strokeWidth={2} />
                  </View>

                  <View style={styles.aegisBubbleWrap}>
                    {/* Title row */}
                    <Text style={[styles.aegisBubbleTitle, { color: meta.color }]}>
                      {meta.title}
                    </Text>

                    {/* Body */}
                    <View style={styles.aegisBubble}>
                      <Text style={styles.aegisBubbleText}>{m.content}</Text>
                    </View>

                    {/* Action chips */}
                    {actions.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.actionChipsRow}
                      >
                        {actions.map((action) => (
                          <Pressable
                            key={action}
                            style={styles.actionChip}
                            onPress={() => handleSend(action)}
                          >
                            <Text style={styles.actionChipText}>{action}</Text>
                            <ChevronRight size={12} color={colors.primary} />
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}

                    {/* Timestamp */}
                    <Text style={styles.messageTime}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Typing indicator */}
            {isThinking && <TypingIndicator />}
          </View>
        )}
      </ScrollView>

      {/* ── Suggestion chips (only before first message) ────────────────── */}
      {!hasConversation && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          keyboardShouldPersistTaps="handled"
        >
          {SUGGESTION_CHIPS.map((chip) => {
            const ChipIcon = chip.icon;
            return (
              <Pressable
                key={chip.id}
                style={styles.chip}
                onPress={() => handleSend(chip.prompt)}
              >
                <ChipIcon size={13} color={colors.primary} strokeWidth={2} />
                <Text style={styles.chipText}>{chip.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── Composer ───────────────────────────────────────────────────────── */}
      <View style={styles.composerContainer}>
        <View style={styles.composerBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Message Aegis…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            multiline
          />
          <Pressable
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isThinking}
          >
            <ArrowUp size={17} color={colors.primaryForeground} strokeWidth={2.5} />
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>Aegis gives guidance, not medical or legal advice.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  headerAegisChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerAegisChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryForeground,
  },

  // ── Location bar
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  locationBarText: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "500",
    flexShrink: 1,
  },
  locationBarBadge: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "500",
  },

  // ── Offline banner
  offlineBanner: {
    backgroundColor: "#fef3c7",
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  offlineBannerText: {
    color: "#92400e",
    fontSize: 11,
    fontWeight: "600",
  },

  // ── Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  scrollContentCentered: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Welcome state
  welcomeWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  welcomeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Messages
  messagesList: { gap: 16 },

  // User bubble
  userRow: { alignItems: "flex-end", gap: 3 },
  userBubble: {
    maxWidth: "82%",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    borderBottomRightRadius: 6,
  },
  userBubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.primaryForeground,
  },

  // Aegis bubble
  aegisRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: "92%",
  },
  aegisBubbleAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  aegisBubbleWrap: { flex: 1, gap: 4 },
  aegisBubbleTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    paddingLeft: 2,
  },
  aegisBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  aegisBubbleText: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.foreground,
  },

  // Action chips under aegis bubble
  actionChipsRow: { gap: 6, paddingTop: 2, paddingBottom: 2 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },

  // Timestamp
  messageTime: {
    fontSize: 11,
    color: `${colors.mutedForeground}aa`,
    paddingHorizontal: 2,
  },

  // ── Typing indicator
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  aegisAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderTopLeftRadius: 6,
  },
  typingText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },

  // ── Suggestion chips row
  chipsRow: {
    gap: 7,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    borderRadius: 18,
  },
  chipText: {
    fontSize: 13,
    color: colors.foreground,
    fontWeight: "500",
  },

  // ── Composer
  composerContainer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === "android" ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  composerBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.foreground,
    maxHeight: 100,
    lineHeight: 22,
    paddingVertical: 2,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
  disclaimer: {
    fontSize: 10,
    color: `${colors.mutedForeground}99`,
    textAlign: "center",
    marginTop: 6,
  },
});
