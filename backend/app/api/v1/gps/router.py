import math
import uuid
from datetime import datetime
from typing import Dict
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, FileResponse

from app.schemas.gps import (
    LocationPingRequest,
    LocationPingResponse,
    GeofenceCheckRequest,
    GeofenceCheckResponse,
    TrackingSessionCreateRequest,
    TrackingSessionResponse,
    FamilyLiveTrackingData,
)

router = APIRouter(prefix="/gps", tags=["GPS & Location Module"])

# In-memory store for active live tracking sessions
ACTIVE_SESSIONS: Dict[str, Dict] = {}

def calculate_haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * (math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.post("/ping", response_model=LocationPingResponse)
async def ping_location(payload: LocationPingRequest):
    recorded_at = datetime.utcnow().isoformat()
    geofence_status = "inside"

    if payload.session_id:
        if payload.session_id not in ACTIVE_SESSIONS:
            ACTIVE_SESSIONS[payload.session_id] = {
                "session_id": payload.session_id,
                "user_id": payload.user_id or "usr_active",
                "user_name": "User",
                "current_lat": payload.latitude,
                "current_lng": payload.longitude,
                "destination_name": "Safe Haven",
                "destination_lat": payload.latitude + 0.005,
                "destination_lng": payload.longitude + 0.005,
                "distance_remaining_km": 1.2,
                "eta_minutes": 5,
                "battery_level": payload.battery_level or 85,
                "started_at": recorded_at,
                "last_updated_at": recorded_at,
                "is_active": True,
            }
        else:
            session = ACTIVE_SESSIONS[payload.session_id]
            session["current_lat"] = payload.latitude
            session["current_lng"] = payload.longitude
            session["last_updated_at"] = recorded_at
            if payload.battery_level is not None:
                session["battery_level"] = payload.battery_level

            dest_lat = session.get("destination_lat", payload.latitude + 0.005)
            dest_lng = session.get("destination_lng", payload.longitude + 0.005)
            dist_m = calculate_haversine_meters(payload.latitude, payload.longitude, dest_lat, dest_lng)
            session["distance_remaining_km"] = round(dist_m / 1000.0, 2)
            session["eta_minutes"] = max(1, math.ceil(dist_m / 75.0))

    return LocationPingResponse(
        status="success",
        recorded_at=recorded_at,
        geofence_status=geofence_status
    )

@router.post("/session/start", response_model=TrackingSessionResponse)
async def start_tracking_session(payload: TrackingSessionCreateRequest):
    session_id = f"trk_{uuid.uuid4().hex[:8]}"
    started_at = datetime.utcnow().isoformat()
    
    ACTIVE_SESSIONS[session_id] = {
        "session_id": session_id,
        "user_id": payload.user_id,
        "user_name": "User",
        "current_lat": 12.9716,
        "current_lng": 77.5946,
        "destination_name": payload.destination_name,
        "destination_lat": payload.destination_lat,
        "destination_lng": payload.destination_lng,
        "distance_remaining_km": 4.2,
        "eta_minutes": 18,
        "battery_level": 85,
        "started_at": started_at,
        "last_updated_at": started_at,
        "is_active": True,
    }

    return TrackingSessionResponse(
        session_id=session_id,
        share_url=f"aegis://family-tracking?session={session_id}",
        started_at=started_at,
        status="active"
    )

@router.get("/session/{session_id}", response_model=FamilyLiveTrackingData)
async def get_family_live_tracking(session_id: str):
    if session_id in ACTIVE_SESSIONS:
        s = ACTIVE_SESSIONS[session_id]
        return FamilyLiveTrackingData(
            session_id=s["session_id"],
            user_id=s["user_id"],
            user_name=s["user_name"],
            current_lat=s["current_lat"],
            current_lng=s["current_lng"],
            destination_name=s["destination_name"],
            destination_lat=s["destination_lat"],
            destination_lng=s["destination_lng"],
            distance_remaining_km=s["distance_remaining_km"],
            eta_minutes=s["eta_minutes"],
            battery_level=s.get("battery_level", 80),
            last_updated_at=s["last_updated_at"],
            is_active=s["is_active"]
        )

    # Fallback response for demonstration if session_id is generic
    return FamilyLiveTrackingData(
        session_id=session_id,
        user_id="usr_default",
        user_name="Priya Sharma",
        current_lat=12.9716,
        current_lng=77.5946,
        destination_name="Home · Nandi Layout",
        destination_lat=12.9850,
        destination_lng=77.6050,
        distance_remaining_km=3.4,
        eta_minutes=14,
        battery_level=88,
        last_updated_at=datetime.utcnow().isoformat(),
        is_active=True
    )

@router.post("/session/{session_id}/stop")
async def stop_tracking_session(session_id: str):
    if session_id in ACTIVE_SESSIONS:
        ACTIVE_SESSIONS[session_id]["is_active"] = False
        return {"status": "success", "message": "Live tracking session stopped. User confirmed safe."}
    return {"status": "success", "message": "Session closed."}

@router.get("/track/{session_id}", response_class=HTMLResponse)
async def track_web_page(session_id: str):
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Aegis Live Safety Tracking</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
    body {{ background-color: #0f172a; color: #f8fafc; display: flex; flex-direction: column; min-height: 100vh; }}
    header {{ background: #1e293b; border-bottom: 1px solid #334155; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; }}
    .logo {{ font-size: 18px; font-weight: 800; color: #ef4444; display: flex; align-items: center; gap: 8px; }}
    .badge {{ background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; }}
    .container {{ flex: 1; display: flex; flex-direction: column; max-width: 800px; width: 100%; margin: 0 auto; padding: 16px; gap: 16px; }}
    #map {{ height: 340px; width: 100%; border-radius: 16px; border: 1px solid #334155; overflow: hidden; }}
    .grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }}
    .card {{ background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 14px; text-align: center; }}
    .val {{ font-size: 20px; font-weight: 800; color: #ffffff; }}
    .lbl {{ font-size: 12px; color: #94a3b8; margin-top: 4px; }}
    .actions {{ display: flex; flex-direction: column; gap: 10px; margin-top: auto; padding-top: 8px; }}
    .btn {{ width: 100%; padding: 14px; border-radius: 14px; font-weight: 700; font-size: 15px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }}
    .btn-safe {{ background: #10b981; color: white; }}
    .btn-emergency {{ background: #ef4444; color: white; }}
    .user-pulse-marker {{ width: 22px; height: 22px; background-color: #10b981; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 12px #10b981; animation: pulse 1.8s infinite; }}
    @keyframes pulse {{ 0% {{ transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }} 70% {{ transform: scale(1.15); box-shadow: 0 0 0 14px rgba(16,185,129,0); }} 100% {{ transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0); }} }}
    .safe-banner {{ background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #10b981; padding: 16px; border-radius: 14px; text-align: center; font-weight: 700; display: none; }}
  </style>
</head>
<body>
  <header>
    <div class="logo">🛡️ Aegis Live Safety Tracking</div>
    <div class="badge" id="syncStatus">LIVE AUTO-SYNC (4s)</div>
  </header>
  <div class="container">
    <div id="map"></div>
    <div class="grid">
      <div class="card"><div class="val" id="etaVal">-- min</div><div class="lbl">ETA</div></div>
      <div class="card"><div class="val" id="distVal">-- km</div><div class="lbl">Distance Left</div></div>
      <div class="card"><div class="val" id="batteryVal">--%</div><div class="lbl">Battery</div></div>
    </div>
    <div class="safe-banner" id="safeBanner">✅ User Confirmed Safe — Live Location Tracking Stopped</div>
    <div class="actions">
      <button class="btn btn-safe" id="stopBtn" onclick="stopTracking()">I'm Safe — Stop Live Location</button>
      <a class="btn btn-emergency" href="tel:112">🚨 Emergency SOS (Call 112)</a>
    </div>
  </div>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
  <script>
    var sessionId = "{session_id}";
    var map = L.map('map', {{ zoomControl: false }}).setView([12.9716, 77.5946], 15);
    L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{ maxZoom: 19, attribution: '© OpenStreetMap' }}).addTo(map);
    var userIcon = L.divIcon({{ className: 'user-pulse-marker', iconSize: [22, 22], iconAnchor: [11, 11] }});
    var userMarker = L.marker([12.9716, 77.5946], {{ icon: userIcon }}).addTo(map);

    // 1. Firebase Realtime Database Direct Stream (bypasses tunnel completely)
    try {{
      const firebaseConfig = {{
        projectId: "women-safety-3d446",
        databaseURL: "https://women-safety-3d446-default-rtdb.firebaseio.com",
        authDomain: "women-safety-3d446.firebaseapp.com"
      }};
      if (typeof firebase !== 'undefined' && firebase.initializeApp) {{
        firebase.initializeApp(firebaseConfig);
        firebase.database().ref('tracking_sessions/' + sessionId).on('value', (snapshot) => {{
          const val = snapshot.val();
          if (val && val.lat && val.lng) {{
            userMarker.setLatLng([val.lat, val.lng]);
            map.panTo([val.lat, val.lng]);
            if (!val.active) {{
              document.getElementById('safeBanner').style.display = 'block';
              document.getElementById('stopBtn').style.display = 'none';
              document.getElementById('syncStatus').innerText = 'SESSION ENDED';
            }}
          }}
        }});
      }}
    }} catch (e) {{ console.log(e); }}

    // 2. Server API fallback with Bypass-Tunnel-Reminder header
    function fetchLiveFeed() {{
      fetch('/api/v1/gps/session/' + sessionId, {{
        headers: {{ 'Bypass-Tunnel-Reminder': 'true' }}
      }})
        .then(res => res.json())
        .then(data => {{
          if (data) {{
            userMarker.setLatLng([data.current_lat, data.current_lng]);
            map.panTo([data.current_lat, data.current_lng]);
            document.getElementById('etaVal').innerText = (data.eta_minutes || '--') + ' min';
            document.getElementById('distVal').innerText = (data.distance_remaining_km || '--') + ' km';
            document.getElementById('batteryVal').innerText = (data.battery_level || '--') + '%';
            if (!data.is_active) {{
              document.getElementById('safeBanner').style.display = 'block';
              document.getElementById('stopBtn').style.display = 'none';
              document.getElementById('syncStatus').innerText = 'SESSION ENDED';
            }}
          }}
        }}).catch(err => console.log(err));
    }}
    fetchLiveFeed();
    setInterval(fetchLiveFeed, 4000);

    function stopTracking() {{
      fetch('/api/v1/gps/session/' + sessionId + '/stop', {{
        method: 'POST',
        headers: {{ 'Bypass-Tunnel-Reminder': 'true' }}
      }})
        .then(() => {{
          document.getElementById('safeBanner').style.display = 'block';
          document.getElementById('stopBtn').style.display = 'none';
          document.getElementById('syncStatus').innerText = 'SESSION ENDED';
        }});
    }}
  </script>
</body>
</html>"""
    return HTMLResponse(content=html_content)

@router.post("/geofence/check", response_model=GeofenceCheckResponse)
async def check_geofence(payload: GeofenceCheckRequest):
    dist = calculate_haversine_meters(
        payload.current_lat, payload.current_lng,
        payload.center_lat, payload.center_lng
    )
    is_inside = dist <= payload.radius_meters
    return GeofenceCheckResponse(
        is_inside=is_inside,
        distance_meters=round(dist, 1),
        zone_name="Safe Corridor Zone"
    )

