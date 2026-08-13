import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Linking } from "react-native";
import { Lock, ShieldCheck, Fingerprint, Trash2, KeyRound, MapPin } from "lucide-react-native";
import { colors } from "../theme/tokens";
import { Card } from "../components/ds/Card";
import { Badge } from "../components/ds/Badge";
import { NavBar } from "../components/ds/NavBar";
import { Screen } from "../components/ds/Screen";
import { AppButton } from "../components/ds/AppButton";
import { Dialog } from "../components/ds/Dialog";
import { TimelineItem, type TimelineTone } from "../components/ds/TimelineItem";
import { SkeletonLine } from "../components/ds/SkeletonLine";
import { getEvidence, getAccessLog, deleteEvidence } from "../data/evidence";
import type { Evidence, EvidenceAccessLog } from "../data/models";
import { formatBytes, formatDuration, formatDateTime } from "../data/format";
import { EVIDENCE_META } from "../components/app/entityMeta";

// GPS evidence encodes its coordinate in the file name: location_<lat>_<lng>.geojson
function parseGps(name?: string | null): { lat: number; lng: number } | null {
  if (!name) return null;
  const m = name.match(/location_(-?\d+\.?\d*)_(-?\d+\.?\d*)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

const ACTION_TONE: Record<string, TimelineTone> = {
  upload: "success",
  retrieve: "brand",
  view: "brand",
  download: "brand",
  delete: "emergency",
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function EvidenceDetailScreen({ id, onBack }: { id?: string; onBack?: () => void }) {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [log, setLog] = useState<EvidenceAccessLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retrieval, setRetrieval] = useState<{ url: string; expiresAt: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("No evidence selected");
      return;
    }
    let alive = true;
    getEvidence(id)
      .then((r) => alive && setEvidence(r.evidence))
      .catch((e) => alive && setError(e?.message ?? "Could not load evidence"));
    getAccessLog(id)
      .then((rows) => alive && setLog(rows))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);

  async function onSecureRetrieval() {
    if (!id) return;
    setBusy(true);
    try {
      const r = await getEvidence(id);
      setRetrieval({ url: r.signedUrl, expiresAt: r.expiresAt });
      getAccessLog(id).then(setLog).catch(() => {});
    } catch (e) {
      setError((e as Error)?.message ?? "Retrieval failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!id) return;
    setBusy(true);
    try {
      await deleteEvidence(id);
      setConfirmDelete(false);
      onBack?.();
    } catch (e) {
      setError((e as Error)?.message ?? "Delete failed");
      setBusy(false);
    }
  }

  const meta = evidence ? EVIDENCE_META[evidence.type] : null;
  const gps = evidence && evidence.type === "gps_track" ? parseGps(evidence.file_name) : null;

  return (
    <Screen>
      <NavBar title="Evidence" onBack={onBack} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {error ? (
          <Card style={styles.card}>
            <Text style={styles.errTitle}>Something went wrong</Text>
            <Text style={styles.errBody}>{error}</Text>
          </Card>
        ) : !evidence || !meta ? (
          <Card style={styles.card}>
            <SkeletonLine style={{ width: "50%" }} />
            <SkeletonLine style={{ width: "80%", marginTop: 12 }} />
            <SkeletonLine style={{ width: "65%", marginTop: 12 }} />
          </Card>
        ) : (
          <>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <meta.Icon size={24} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>{evidence.file_name ?? meta.label}</Text>
                <Text style={styles.headerSub}>
                  {meta.label} · {formatBytes(evidence.size_bytes)}
                </Text>
                <View style={styles.badgeRow}>
                  {evidence.is_encrypted ? <Badge tone="success">Encrypted</Badge> : <Badge tone="warning">Unencrypted</Badge>}
                </View>
              </View>
            </View>

            {/* GPS location (opens a map) */}
            {gps ? (
              <Card style={styles.card}>
                <View style={styles.rowIconTitle}>
                  <MapPin size={17} color={colors.primary} />
                  <Text style={styles.cardTitle}>Location</Text>
                </View>
                <Text style={styles.cardBody}>
                  {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                </Text>
                <AppButton
                  variant="secondary"
                  size="md"
                  onPress={() =>
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${gps.lat},${gps.lng}`).catch(() => {})
                  }
                  leading={<MapPin size={16} color={colors.foreground} />}
                >
                  Open in Maps
                </AppButton>
              </Card>
            ) : null}

            {/* Secure retrieval */}
            <Card style={styles.card}>
              <View style={styles.rowIconTitle}>
                <KeyRound size={17} color={colors.primary} />
                <Text style={styles.cardTitle}>Secure retrieval</Text>
              </View>
              <Text style={styles.cardBody}>
                Generates a one-time, short-lived link (60 s) and records the access for chain-of-custody.
              </Text>
              <AppButton size="md" loading={busy} onPress={onSecureRetrieval} leading={<Lock size={16} color={colors.primaryForeground} />}>
                Retrieve securely
              </AppButton>
            </Card>

            {/* Integrity / encryption */}
            <Text style={styles.sectionHeading}>INTEGRITY</Text>
            <Card style={styles.card}>
              <MetaRow label="Encryption" value={evidence.encryption_algo} />
              <MetaRow label="Duration" value={formatDuration(evidence.duration_seconds) ?? "—"} />
              <MetaRow label="Captured" value={formatDateTime(evidence.captured_at)} />
              <MetaRow label="Uploaded" value={formatDateTime(evidence.uploaded_at)} />
              <View style={styles.sealRow}>
                <Fingerprint size={16} color={colors.success} />
                <Text style={styles.sealText}>Tamper seal {evidence.tamper_seal ?? "—"}</Text>
              </View>
              <Text style={styles.checksum} numberOfLines={1}>
                SHA-256 {evidence.checksum_sha256 ?? "—"}
              </Text>
            </Card>

            {/* Access log */}
            <Text style={styles.sectionHeading}>ACCESS HISTORY</Text>
            <Card style={styles.card}>
              {log.length === 0 ? (
                <Text style={styles.cardBody}>No access recorded yet.</Text>
              ) : (
                log.map((a, i) => (
                  <TimelineItem
                    key={a.id}
                    time={formatDateTime(a.accessed_at)}
                    title={a.action[0].toUpperCase() + a.action.slice(1)}
                    detail={a.signed_url_expires_at ? `Signed link expired ${formatDateTime(a.signed_url_expires_at)}` : undefined}
                    tone={ACTION_TONE[a.action] ?? "brand"}
                    last={i === log.length - 1}
                  />
                ))
              )}
            </Card>

            {/* Danger zone */}
            <AppButton variant="destructive" size="md" onPress={() => setConfirmDelete(true)} leading={<Trash2 size={16} color={colors.destructiveForeground} />}>
              Delete evidence
            </AppButton>
          </>
        )}
      </ScrollView>

      {/* Retrieval dialog */}
      <Dialog
        open={!!retrieval}
        onClose={() => setRetrieval(null)}
        title="Secure link ready"
        body={retrieval ? `Valid until ${formatDateTime(retrieval.expiresAt)}. This access has been logged.` : ""}
        actions={
          <View style={styles.dialogActions}>
            <AppButton variant="secondary" size="md" onPress={() => setRetrieval(null)}>
              Close
            </AppButton>
            <AppButton
              size="md"
              leading={<ShieldCheck size={16} color={colors.primaryForeground} />}
              onPress={() => {
                if (retrieval) Linking.openURL(retrieval.url).catch(() => {});
                setRetrieval(null);
              }}
            >
              Open
            </AppButton>
          </View>
        }
      />

      {/* Delete confirm */}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this evidence?"
        body="The encrypted file and its metadata will be permanently removed. This cannot be undone."
        actions={
          <View style={styles.dialogActions}>
            <AppButton variant="secondary" size="md" onPress={() => setConfirmDelete(false)}>
              Cancel
            </AppButton>
            <AppButton variant="destructive" size="md" loading={busy} onPress={onDelete}>
              Delete
            </AppButton>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 28, gap: 0 },
  headerRow: { flexDirection: "row", gap: 14, marginTop: 12, marginBottom: 16 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: `${colors.primary}15`, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: colors.foreground },
  headerSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  card: { padding: 16, marginBottom: 14 },
  rowIconTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  cardBody: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18, marginBottom: 12 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5, marginTop: 6, marginBottom: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  metaLabel: { fontSize: 13, color: colors.mutedForeground },
  metaValue: { fontSize: 14, fontWeight: "500", color: colors.foreground, maxWidth: "60%" },
  sealRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  sealText: { fontSize: 13, color: colors.foreground, fontWeight: "500" },
  checksum: { fontSize: 12, color: colors.mutedForeground, marginTop: 6 },
  errTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  errBody: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
  dialogActions: { flexDirection: "row", gap: 10 },
});
