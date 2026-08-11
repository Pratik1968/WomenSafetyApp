import { useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { X } from "lucide-react-native";
import { colors } from "../../theme/tokens";
import { AppButton } from "../ds/AppButton";

// Leaflet + OpenStreetMap map. Tap (or drag the pin) to choose a point; coords post back to RN.
function mapHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;padding:0}</style>
</head><body><div id="map"></div><script>
  var map = L.map('map').setView([${lat}, ${lng}], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
  function post(){ var ll = marker.getLatLng(); if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ lat: ll.lat, lng: ll.lng })); }
  map.on('click', function(e){ marker.setLatLng(e.latlng); post(); });
  marker.on('dragend', post);
  post();
</script></body></html>`;
}

export function MapPicker({
  open,
  initial,
  onPick,
  onClose,
}: {
  open: boolean;
  initial?: { lat: number; lng: number };
  onPick: (coords: { lat: number; lng: number }) => void;
  onClose: () => void;
}) {
  const start = initial ?? { lat: 12.9719, lng: 77.5937 }; // default: Bengaluru
  const [coords, setCoords] = useState(start);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close map">
            <X size={20} color={colors.foreground} />
          </Pressable>
          <Text style={styles.title}>Choose location</Text>
          <View style={{ width: 36 }} />
        </View>

        <WebView
          originWhitelist={["*"]}
          source={{ html: mapHtml(start.lat, start.lng) }}
          onMessage={(e: any) => {
            try {
              const c = JSON.parse(e.nativeEvent.data);
              if (typeof c.lat === "number" && typeof c.lng === "number") setCoords(c);
            } catch {
              /* ignore */
            }
          }}
          style={styles.web}
        />

        <View style={styles.footer}>
          <Text style={styles.coords}>
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </Text>
          <AppButton size="lg" onPress={() => onPick(coords)}>
            Use this location
          </AppButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  web: { flex: 1 },
  footer: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  coords: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", fontWeight: "600" },
});
