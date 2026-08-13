import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from "react-native";
import { colors, radii } from "../theme/tokens";
import { NavBar } from "../components/ds/NavBar";
import { fakeCallService } from "../services/fakeCallService";
import { FakeCallConfig } from "../types/fakeCall";

export function FakeCallScreen({
  onBack,
}: {
  onBack?: () => void;
}) {
  const [config, setConfig] = useState<FakeCallConfig | null>(null);

  useEffect(() => {
    async function load() {
      const cfg = await fakeCallService.getConfig();
      setConfig(cfg);
    }
    load();
  }, []);

  const saveSetting = async (updates: Partial<FakeCallConfig>) => {
    if (!config) return;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await fakeCallService.saveConfig(newConfig);
  };

  if (!config) {
    return (
      <View style={styles.screen}>
        <NavBar title="Fake Call Settings" onBack={onBack} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <NavBar title="Fake Call Settings" onBack={onBack} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerSub}>
            Configure the fake call behavior. Long press the Fake Call button on the home screen to access these settings anytime.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Predefined Caller</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity 
              style={[styles.optionBtn, config.callerName === 'Mom' && styles.optionBtnActive]}
              onPress={() => saveSetting({ callerName: 'Mom' })}
            >
              <Text style={[styles.optionText, config.callerName === 'Mom' && styles.optionTextActive]}>Mom</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionBtn, config.callerName === 'Dad' && styles.optionBtnActive]}
              onPress={() => saveSetting({ callerName: 'Dad' })}
            >
              <Text style={[styles.optionText, config.callerName === 'Dad' && styles.optionTextActive]}>Dad</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringtone</Text>
          <View style={styles.optionsRow}>
            {['Marimba', 'Classic', 'Silent'].map(tone => (
              <TouchableOpacity 
                key={tone}
                style={[styles.optionBtn, config.ringtone === tone && styles.optionBtnActive]}
                onPress={() => saveSetting({ ringtone: tone })}
              >
                <Text style={[styles.optionText, config.ringtone === tone && styles.optionTextActive]}>{tone}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delay</Text>
          <View style={styles.optionsRow}>
            {[0, 1, 3, 5, 10].map(delay => (
              <TouchableOpacity 
                key={delay}
                style={[styles.optionBtn, config.delayMinutes === delay && styles.optionBtnActive]}
                onPress={() => saveSetting({ delayMinutes: delay })}
              >
                <Text style={[styles.optionText, config.delayMinutes === delay && styles.optionTextActive]}>
                  {delay === 0 ? 'Instant' : `${delay}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Behaviors</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Vibrate on incoming call</Text>
            <Switch
              value={config.vibrate}
              onValueChange={(val) => saveSetting({ vibrate: val })}
              trackColor={{ false: "#cbd5e1", true: colors.primary }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto-play voice on answer</Text>
            <Switch
              value={config.autoPlayVoice}
              onValueChange={(val) => saveSetting({ autoPlayVoice: val })}
              trackColor={{ false: "#cbd5e1", true: colors.primary }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerInfo: {
    marginBottom: 24,
  },
  headerSub: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  loadingText: {
    padding: 20,
    textAlign: "center",
    color: colors.mutedForeground,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  optionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  optionTextActive: {
    color: colors.primary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.foreground,
  },
});
