import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Siren } from "lucide-react-native";
import { colors } from "../theme/tokens";
import { Card } from "../components/ds/Card";
import { Chip } from "../components/ds/Chip";
import { NavBar } from "../components/ds/NavBar";
import { Screen } from "../components/ds/Screen";
import { AppButton } from "../components/ds/AppButton";
import { AppInput, FieldLabel } from "../components/ds/Field";
import { INCIDENT_META } from "../components/app/entityMeta";
import { createIncident } from "../data/incidents";
import type { IncidentType } from "../data/models";

const TYPES = Object.keys(INCIDENT_META) as IncidentType[];
const SEVERITIES = [
  { label: "Low", value: 20 },
  { label: "Medium", value: 50 },
  { label: "High", value: 80 },
];

export function NewIncidentScreen({ onBack, onCreated }: { onBack?: () => void; onCreated?: (id: string) => void }) {
  const [type, setType] = useState<IncidentType | null>(null);
  const [address, setAddress] = useState("");
  const [severity, setSeverity] = useState(50);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!type) return;
    setSaving(true);
    setError(null);
    try {
      const inc = await createIncident({ type, address: address || undefined, severity });
      onCreated?.(inc.id);
    } catch (e) {
      setError((e as Error)?.message ?? "Could not create incident");
      setSaving(false);
    }
  }

  return (
    <Screen>
      <NavBar title="Report incident" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <FieldLabel>Type</FieldLabel>
          <View style={styles.chips}>
            {TYPES.map((t) => (
              <Chip key={t} active={type === t} onPress={() => setType(t)}>
                {INCIDENT_META[t].label}
              </Chip>
            ))}
          </View>

          <View style={{ height: 16 }} />
          <FieldLabel>Location</FieldLabel>
          <AppInput value={address} onChangeText={setAddress} placeholder="Where did this happen?" />

          <View style={{ height: 16 }} />
          <FieldLabel>Severity</FieldLabel>
          <View style={styles.chips}>
            {SEVERITIES.map((s) => (
              <Chip key={s.value} active={severity === s.value} onPress={() => setSeverity(s.value)}>
                {s.label}
              </Chip>
            ))}
          </View>
        </Card>

        {error ? (
          <Card style={styles.card}>
            <Text style={styles.err}>{error}</Text>
          </Card>
        ) : null}

        <AppButton size="lg" disabled={!type} loading={saving} onPress={onSubmit} leading={<Siren size={16} color={colors.primaryForeground} />}>
          Create incident
        </AppButton>
        <Text style={styles.note}>You’ll add evidence (audio, video, photos, GPS) on the next screen.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  card: { padding: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  err: { fontSize: 13, color: colors.emergency },
  note: { fontSize: 12, color: colors.mutedForeground, textAlign: "center", marginTop: 4 },
});
