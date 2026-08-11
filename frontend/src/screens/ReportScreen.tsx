import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Image, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Camera, ImagePlus, MapPin, ShieldCheck, Video, X } from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { AppButton } from "../components/ds/AppButton";
import { Card } from "../components/ds/Card";
import { Chip } from "../components/ds/Chip";
import { NavBar } from "../components/ds/NavBar";
import { Screen } from "../components/ds/Screen";
import { SuccessCheck } from "../components/ds/SuccessCheck";
import { Aurora } from "../components/ds/Aurora";
import { REPORT_TYPE_META } from "../components/app/reportMeta";
import { submitIncidentReport, type ReportMediaFile, type ReportType } from "../data/reports";

const CATEGORIES = Object.keys(REPORT_TYPE_META) as ReportType[];
const MAX_ATTACHMENTS = 5;

type Attachment = ReportMediaFile & { kind: "photo" | "video" };

function assetToAttachment(asset: ImagePicker.ImagePickerAsset): Attachment {
  const isVideo = asset.type === "video";
  const mimeType = asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg");
  const name = asset.fileName || `${isVideo ? "video" : "photo"}-${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
  return { uri: asset.uri, name, mimeType, kind: isVideo ? "video" : "photo" };
}

export function ReportScreen({
  onBack,
  onSubmitDone,
  onViewCommunity,
}: {
  onBack?: () => void;
  onSubmitDone?: () => void;
  onViewCommunity?: () => void;
}) {
  const [picked, setPicked] = useState<ReportType | null>(null);
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is needed to attach where this happened.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      setCoords({ lat: latitude, lng: longitude });

      try {
        const results = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        const place = results?.[0];
        if (place) {
          const line = [place.street, place.city || place.subregion].filter(Boolean).join(", ");
          setAddress(line || null);
        }
      } catch {
        // Reverse geocoding is best-effort — coordinates alone are still enough to submit.
      }
    } catch {
      setError("Couldn't get your current location. Check location services and try again.");
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    refreshLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (submitted) {
    return (
      <Screen style={styles.successScreen}>
        <Aurora />
        <View style={styles.successContent}>
          <SuccessCheck size={96} />
          <Text style={styles.successTitle}>Thank you for speaking up</Text>
          <Text style={styles.successSub}>This report helps others plan safer routes. Your name is never attached to a report.</Text>
        </View>
        <View style={styles.successFooter}>
          <AppButton onPress={onSubmitDone}>Done</AppButton>
          <Pressable onPress={onViewCommunity} style={styles.successLink}>
            <Text style={styles.successLinkText}>View community reports</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const addPhoto = async () => {
    if (attachments.length >= MAX_ATTACHMENTS) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("Camera permission is needed to attach a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAttachments((prev) => [...prev, assetToAttachment(result.assets[0])]);
    }
  };

  const addFromLibrary = async () => {
    if (attachments.length >= MAX_ATTACHMENTS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo library permission is needed to attach media.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS - attachments.length,
    });
    if (!result.canceled && result.assets?.length) {
      setAttachments((prev) => [...prev, ...result.assets.map(assetToAttachment)].slice(0, MAX_ATTACHMENTS));
    }
  };

  const removeAttachment = (uri: string) => setAttachments((prev) => prev.filter((a) => a.uri !== uri));

  const canSubmit = picked !== null && coords !== null && !submitting;

  const handleSubmit = async () => {
    if (!picked || !coords) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitIncidentReport({
        reportType: picked,
        lat: coords.lat,
        lng: coords.lng,
        description: description.trim() || undefined,
        address: address || undefined,
        files: attachments,
      });
      setSubmitted(true);
    } catch (e) {
      setError((e as Error)?.message ?? "Couldn't submit your report. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <NavBar title="Report unsafe area" onBack={onBack} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.mainTitle}>What felt unsafe here?</Text>
          <Text style={styles.mainSub}>Pick the category that best fits. Reports are anonymous and help others plan safer routes.</Text>

          <View style={styles.categoriesWrap}>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={picked === c} onPress={() => setPicked(c)}>
                {REPORT_TYPE_META[c].label}
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

          <Text style={styles.sectionHeading}>PHOTOS &amp; VIDEO (OPTIONAL)</Text>
          <View style={styles.photosGrid}>
            {attachments.map((a) => (
              <View key={a.uri} style={styles.thumbWrap}>
                {a.kind === "photo" ? (
                  <Image source={{ uri: a.uri }} style={styles.thumbImage} />
                ) : (
                  <View style={[styles.thumbImage, styles.videoThumb]}>
                    <Video size={22} color={colors.mutedForeground} />
                  </View>
                )}
                <Pressable style={styles.thumbRemove} onPress={() => removeAttachment(a.uri)}>
                  <X size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            {attachments.length < MAX_ATTACHMENTS && (
              <>
                <Pressable style={styles.photoUploadBtn} onPress={addPhoto} testID="report-add-photo">
                  <Camera size={22} color={colors.mutedForeground} />
                </Pressable>
                <Pressable style={styles.photoUploadBtn} onPress={addFromLibrary} testID="report-add-library">
                  <ImagePlus size={22} color={colors.mutedForeground} />
                </Pressable>
              </>
            )}
          </View>

          <Text style={styles.sectionHeading}>LOCATION</Text>
          <Card style={styles.locationCard}>
            <View style={styles.locationMapStub}>
              <MapPin size={22} color={colors.warning} />
              <Text style={styles.locationMapStubText}>
                {locating ? "Locating…" : address || (coords ? "Current location" : "Location unavailable")}
              </Text>
            </View>
            <View style={styles.locationInfoRow}>
              <MapPin size={18} color={colors.primary} />
              <View style={styles.locationTextWrap}>
                <Text style={styles.locationName}>{address || "Current location"}</Text>
                <Text style={styles.locationSub}>
                  {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "Waiting for GPS fix"}
                </Text>
              </View>
              <Pressable onPress={refreshLocation}>
                <Text style={styles.locationChangeBtn}>{locating ? "…" : "Refresh"}</Text>
              </Pressable>
            </View>
          </Card>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.privacyNote}>
            <ShieldCheck size={16} color={colors.mutedForeground} />
            <Text style={styles.privacyNoteText}>
              Your identity is never shared. Only the area, category and time are made visible to others.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton loading={submitting} disabled={!canSubmit} onPress={handleSubmit}>
            Submit report
          </AppButton>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.2,
  },
  mainSub: {
    fontSize: 15,
    color: colors.mutedForeground,
    marginTop: 6,
    lineHeight: 22,
  },
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.mutedForeground,
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 10,
  },
  textInputWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 14,
    minHeight: 110,
  },
  textArea: {
    fontSize: 15,
    color: colors.foreground,
    textAlignVertical: "top",
  },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
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
  thumbWrap: { width: 80, height: 80 },
  thumbImage: { width: 80, height: 80, borderRadius: radii.xl },
  videoThumb: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.foreground,
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
  locationMapStubText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  locationInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  locationTextWrap: { flex: 1 },
  locationName: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  locationSub: { fontSize: 12, color: colors.mutedForeground },
  locationChangeBtn: { fontSize: 14, fontWeight: "600", color: colors.primary },
  errorText: { fontSize: 13, color: colors.destructive, marginTop: 16 },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 16,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  footer: { paddingHorizontal: 20, paddingBottom: 20 },
  successScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "space-between",
  },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 24,
    textAlign: "center",
  },
  successSub: {
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  successFooter: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  successLink: { alignItems: "center", paddingVertical: 4 },
  successLinkText: { fontSize: 14, fontWeight: "600", color: colors.primary },
});
