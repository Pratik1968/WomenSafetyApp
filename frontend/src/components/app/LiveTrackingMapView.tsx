import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "../../theme/tokens";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RoutePolyline {
  id: string;
  points: Array<[number, number]>; // [lat, lng]
  color?: string;
  isPrimary?: boolean;
}

export interface SafeSpotMarker {
  id: string;
  name: string;
  type: "police" | "hospital" | "shelter";
  lat: number;
  lng: number;
}

interface LiveTrackingMapViewProps {
  userLocation: LatLng;
  destination?: LatLng;
  routes?: RoutePolyline[];
  safeSpots?: SafeSpotMarker[];
  geofenceRadiusMeters?: number;
  showGeofence?: boolean;
  isFamilyView?: boolean;
  height?: number | string;
}

export function LiveTrackingMapView({
  userLocation,
  destination,
  routes = [],
  safeSpots = [],
  geofenceRadiusMeters = 500,
  showGeofence = false,
  isFamilyView = false,
  height = 280,
}: LiveTrackingMapViewProps) {
  const webViewRef = useRef<any>(null);

  // Generate Leaflet OpenStreetMap HTML bundle
  const generateMapHtml = () => {
    const destJson = destination ? JSON.stringify(destination) : "null";
    const routesJson = JSON.stringify(routes);
    const safeSpotsJson = JSON.stringify(safeSpots);
    const primaryColor = isFamilyView ? "#10B981" : colors.primary;

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #0f172a; }
    .user-pulse-marker {
      width: 22px;
      height: 22px;
      background-color: #3B82F6;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 14px #3B82F6;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
      70% { transform: scale(1.15); box-shadow: 0 0 0 16px rgba(59, 130, 246, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }
    .dest-marker {
      background: #10B981;
      border: 2px solid white;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${userLocation.lat}, ${userLocation.lng}], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Custom pulse icon for user live tracking
    var userIcon = L.divIcon({
      className: 'user-pulse-marker',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    var userMarker = L.marker([${userLocation.lat}, ${userLocation.lng}], { icon: userIcon }).addTo(map);
    userMarker.bindPopup("<b>${isFamilyView ? "Family Member" : "Your Location"}</b><br>Auto-updating (4s)");

    var destMarker = null;
    var destination = ${destJson};
    if (destination) {
      var destIcon = L.divIcon({
        className: 'dest-marker',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      destMarker = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      destMarker.bindPopup("<b>Destination</b>");
    }

    var geofenceCircle = null;
    if (${showGeofence}) {
      geofenceCircle = L.circle([${userLocation.lat}, ${userLocation.lng}], {
        color: '#3B82F6',
        fillColor: '#3B82F6',
        fillOpacity: 0.18,
        weight: 2.5,
        radius: ${geofenceRadiusMeters}
      }).addTo(map);
    }

    // Draw route polylines
    var polylines = [];
    var routesData = ${routesJson};
    if (routesData && routesData.length > 0) {
      routesData.forEach(function(r) {
        var pl = L.polyline(r.points, {
          color: r.color || (r.isPrimary ? '#6366F1' : '#94A3B8'),
          weight: r.isPrimary ? 5 : 3,
          dashArray: r.isPrimary ? null : '6, 8',
          opacity: r.isPrimary ? 0.9 : 0.6
        }).addTo(map);
        polylines.push(pl);
      });
    }

    // Draw safe spots markers (Police, Hospital, Shelter)
    var safeSpotsData = ${safeSpotsJson};
    if (safeSpotsData && safeSpotsData.length > 0) {
      safeSpotsData.forEach(function(spot) {
        var bgColor = spot.type === 'police' ? '#3B82F6' : spot.type === 'hospital' ? '#EF4444' : '#8B5CF6';
        var iconHtml = '<div style="background:' + bgColor + ';width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>';
        var spotIcon = L.divIcon({ className: '', html: iconHtml, iconSize: [16, 16], iconAnchor: [8, 8] });
        L.marker([spot.lat, spot.lng], { icon: spotIcon }).addTo(map).bindPopup("<b>" + spot.name + "</b><br>" + spot.type.toUpperCase());
      });
    }

    // Function called via WebView message to update live position without page reload
    window.updateUserLocation = function(lat, lng) {
      var newPos = [lat, lng];
      userMarker.setLatLng(newPos);
      map.panTo(newPos, { animate: true, duration: 1.0 });
      if (geofenceCircle) {
        geofenceCircle.setLatLng(newPos);
      }
    };
  </script>
</body>
</html>`;
  };

  // Push location updates seamlessly into Leaflet JS engine
  useEffect(() => {
    if (webViewRef.current && userLocation) {
      const js = `if (window.updateUserLocation) { window.updateUserLocation(${userLocation.lat}, ${userLocation.lng}); } true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [userLocation.lat, userLocation.lng]);

  return (
    <View style={[styles.container, { height: height as any }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: generateMapHtml() }}
        style={styles.webView}
        scrollEnabled={false}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: colors.border,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill as any,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
});
