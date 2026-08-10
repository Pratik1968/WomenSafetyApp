import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet } from "react-native";
import { Camera, ImagePlus, MapPin, ShieldCheck } from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { AppButton } from "../components/ds/AppButton";
import { Card } from "../components/ds/Card";
import { Chip } from "../components/ds/Chip";
import { NavBar } from "../components/ds/NavBar";
import { SuccessCheck } from "../components/ds/SuccessCheck";
import { Aurora } from "../components/ds/Aurora";

export type ReportState = "empty" | "filled" | "submitting" | "success";

const REPORT_CATEGORIES = [
  { id: "r1", label: "Low street lighting" },
  { id: "r2", label: "Catcalling / Harassment" },
  { id: "r3", label: "Suspicious activity" },
  { id: "r4", label: "Deserted stretch" },
  { id: "r5", label: "Lack of CCTV" },
];

export function ReportScreen({
  state = "empty",
  onBack,
  onSubmitDone,
}: {
  state?: ReportState;
  onBack?: () => void;
  onSubmitDone?: () => void;
}) {
  const [picked, setPicked] = useState<string[]>(state === "empty" ? [] : ["r1", "r4"]);
  const [description, setDescription] = useState(
    state === "empty"
      ? ""
      : "Streetlights on the 5th Cross stretch have been out for two weeks. It's completely dark between 9 and 11 PM."
  );

  if (state === "success") {
    return (
      <View style={styles.successScreen}>
        <Aurora />
        <View style={styles.successContent}>
          <SuccessCheck size={96} />
          <Text style={styles.successTitle}>Thank you for speaking up</Text>
          <Text style={styles.successSub}>
            This stretch is now flagged for 47 women who walk here every week. Your name is never attached to a report.
          </Text>
        </View>
        <View style={styles.successFooter}>
          <AppButton onPress={onSubmitDone}>Done</AppButton>
        </View>
      </View>
    );
  }

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <View style={styles.screen}>
      <NavBar title="Report unsafe area" onBack={onBack} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.mainTitle}>What felt unsafe here?</Text>
        <Text style={styles.mainSub}>
          Pick everything that applies. Reports are anonymous and help others plan safer routes.
        </Text>

        <View style={styles.categoriesWrap}>
          {REPORT_CATEGORIES.map((c) => (
            <Chip key={c.id} active={picked.includes(c.id)} onPress={() => toggle(c.id)}>
              {c.label}
            </Chip>
          ))}
        </View>

        <Text style={styles.sectionHeading}>DESCRIPTION</Text>
        <View style={styles.textInputWrap}>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Optional. A sentence is enough — what happened, and around what time."
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <Text style={styles.sectionHeading}>PHOTO (OPTIONAL)</Text>
        <View style={styles.photosGrid}>
          <Pressable style={styles.photoUploadBtn}>
            <Camera size={22} color={colors.mutedForeground} />
          </Pressable>
          <Pressable style={styles.photoUploadBtn}>
            <ImagePlus size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={styles.sectionHeading}>LOCATION</Text>
        <Card style={styles.locationCard}>
          <View style={styles.locationMapStub}>
            <MapPin size={22} color={colors.warning} />
            <Text style={styles.locationMapStubText}>5th Cross, Indiranagar</Text>
          </View>
          <View style={styles.locationInfoRow}>
            <MapPin size={18} color={colors.primary} />
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationName}>5th Cross, Indiranagar</Text>
              <Text style={styles.locationSub}>Current location · ±8 m</Text>
            </View>
            <Text style={styles.locationChangeBtn}>Change</Text>
          </View>
        </Card>

        <View style={styles.privacyNote}>
          <ShieldCheck size={16} color={colors.mutedForeground} />
          <Text style={styles.privacyNoteText}>
            Your identity is never shared. Only the area, category and time are made visible to others.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton loading={state === "submitting"} disabled={picked.length === 0} onPress={onSubmitDone}>
          Submit report
        </AppButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  mainTitle: { fontSize: 24, fontWeight: "700", color: colors.foreground, letterSpacing: -0.2 },
  mainSub: { fontSize: 15, color: colors.mutedForeground, marginTop: 6, lineHeight: 22 },
  categoriesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5, marginTop: 24, marginBottom: 10 },
  textInputWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 14,
    minHeight: 110,
  },
  textArea: { fontSize: 15, color: colors.foreground, textAlignVertical: "top" },
  photosGrid: { flexDirection: "row", gap: 12 },
  photoUploadBtn: {
    width: 80,
    height: 80,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  locationCard: { padding: 0, overflow: "hidden" },
  locationMapStub: {
    height: 100,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationMapStubText: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  locationInfoRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  locationTextWrap: { flex: 1 },
  locationName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  locationSub: { fontSize: 12, color: colors.mutedForeground },
  locationChangeBtn: { fontSize: 14, fontWeight: "600", color: colors.primary },
  privacyNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16 },
  privacyNoteText: { flex: 1, fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
  footer: { paddingHorizontal: 20, paddingBottom: 20 },
  successScreen: { flex: 1, backgroundColor: colors.background, justifyContent: "space-between" },
  successContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, textAlign: "center" },
  successTitle: { fontSize: 28, fontWeight: "700", color: colors.foreground, marginTop: 24, textAlign: "center" },
  successSub: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", marginTop: 12, lineHeight: 22 },
  successFooter: { paddingHorizontal: 20, paddingBottom: 24 },
});
