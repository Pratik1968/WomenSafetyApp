import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import { Paperclip, CheckCircle2, ImagePlus, MapPin } from "lucide-react-native";
import { colors, radii } from "../theme/tokens";
import { Card } from "../components/ds/Card";
import { Chip } from "../components/ds/Chip";
import { NavBar } from "../components/ds/NavBar";
import { Screen } from "../components/ds/Screen";
import { AppButton } from "../components/ds/AppButton";
import { FieldLabel } from "../components/ds/Field";
import { MapPicker } from "../components/app/MapPicker";
import { EVIDENCE_META } from "../components/app/entityMeta";
import { uploadEvidenceFile } from "../data/evidence";
import type { EvidenceType } from "../data/models";
import { formatBytes } from "../data/format";

const EVIDENCE_TYPES = Object.keys(EVIDENCE_META) as EvidenceType[];

type PickedFile = { uri: string; name: string; mimeType?: string; size?: number };

export function UploadEvidenceScreen({
  incidentId,
  onBack,
  onDone,
}: {
  incidentId?: string;
  onBack?: () => void;
  onDone?: () => void;
}) {
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("image");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapInitial, setMapInitial] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setCoords(null);
  }

  // ----- photo / video from the library -----
  async function pickMedia() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo library permission is required.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: evidenceType === "video" ? ["videos"] : ["images"],
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    const fallbackName = evidenceType === "video" ? "video.mp4" : "photo.jpg";
    setCoords(null);
    setFile({
      uri: a.uri,
      name: a.fileName ?? fallbackName,
      mimeType: a.mimeType ?? (evidenceType === "video" ? "video/mp4" : "image/jpeg"),
      size: a.fileSize ?? undefined,
    });
  }

  // ----- GPS: choose a point on the map -----
  async function openMap() {
    setError(null);
    let initial: { lat: number; lng: number } | undefined;
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.granted) {
      try {
        const pos = await Location.getCurrentPositionAsync({});
        initial = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        /* fall back to default */
      }
    }
    setMapInitial(initial);
    setMapOpen(true);
  }

  async function onMapPicked(c: { lat: number; lng: number }) {
    setMapOpen(false);
    const geojson = JSON.stringify({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.lng, c.lat] },
      properties: { capturedAt: new Date().toISOString() },
    });
    const uri = `${FileSystem.cacheDirectory}gps_${Date.now()}.geojson`;
    await FileSystem.writeAsStringAsync(uri, geojson);
    const info = await FileSystem.getInfoAsync(uri);
    setCoords(c);
    setFile({
      uri,
      name: `location_${c.lat.toFixed(6)}_${c.lng.toFixed(6)}.geojson`,
      mimeType: "application/geo+json",
      size: info.exists ? info.size : geojson.length,
    });
  }

  // ----- audio / logs / other: any file -----
  async function pickFile() {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    setCoords(null);
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size ?? undefined });
  }

  function onCapture() {
    if (evidenceType === "image" || evidenceType === "video") return pickMedia();
    if (evidenceType === "gps_track") return openMap();
    return pickFile();
  }

  async function onUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadEvidenceFile({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        type: evidenceType,
        incidentId,
      });
      onDone?.();
    } catch (e) {
      setError((e as Error)?.message ?? "Upload failed");
      setUploading(false);
    }
  }

  const captureLabel =
    evidenceType === "image"
      ? "Pick a photo"
      : evidenceType === "video"
        ? "Pick a video"
        : evidenceType === "gps_track"
          ? "Choose location on map"
          : "Choose a file";
  const CaptureIcon = evidenceType === "gps_track" ? MapPin : evidenceType === "image" || evidenceType === "video" ? ImagePlus : Paperclip;

  return (
    <Screen>
      <NavBar title="Add evidence" onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <FieldLabel>Evidence type</FieldLabel>
          <View style={styles.chips}>
            {EVIDENCE_TYPES.map((t) => (
              <Chip
                key={t}
                active={evidenceType === t}
                onPress={() => {
                  setEvidenceType(t);
                  reset();
                }}
              >
                {EVIDENCE_META[t].label}
              </Chip>
            ))}
          </View>

          <View style={{ height: 14 }} />
          <AppButton variant="secondary" size="md" onPress={onCapture} leading={<CaptureIcon size={16} color={colors.foreground} />}>
            {file ? "Change selection" : captureLabel}
          </AppButton>

          {coords ? (
            <View style={styles.fileRow}>
              <MapPin size={18} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName}>Location selected</Text>
                <Text style={styles.fileMeta}>
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </Text>
              </View>
            </View>
          ) : file ? (
            <View style={styles.fileRow}>
              <CheckCircle2 size={18} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <Text style={styles.fileMeta}>
                  {file.mimeType ?? "file"}
                  {file.size ? ` · ${formatBytes(file.size)}` : ""}
                </Text>
              </View>
            </View>
          ) : null}
        </Card>

        {error ? (
          <Card style={styles.card}>
            <Text style={styles.err}>{error}</Text>
          </Card>
        ) : null}

        <AppButton size="lg" disabled={!file} loading={uploading} onPress={onUpload}>
          Upload evidence
        </AppButton>
        <Text style={styles.note}>Files are encrypted and uploaded to your private vault, attached to this incident.</Text>
      </ScrollView>

      <MapPicker open={mapOpen} initial={mapInitial} onPick={onMapPicked} onClose={() => setMapOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  card: { padding: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fileRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, padding: 12, borderRadius: radii.lg, backgroundColor: `${colors.success}12` },
  fileName: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  fileMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  err: { fontSize: 13, color: colors.emergency },
  note: { fontSize: 12, color: colors.mutedForeground, textAlign: "center", marginTop: 4 },
});
