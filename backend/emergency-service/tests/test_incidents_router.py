# backend/emergency-service/tests/test_incidents_router.py
from fastapi.testclient import TestClient

from app.main import app
from app.services import incident_service

client = TestClient(app)


def setup_function():
    incident_service._memory_incidents.clear()


def base_event(**overrides):
    payload = {
        "clientIncidentId": "sos-9000-xyz99",
        "firebaseUid": "uid-router-test",
        "source": "BUTTON",
        "status": "active",
        "startedAt": 9000,
        "endedAt": None,
        "location": {"lat": 12.9, "lon": 77.5, "accurate": True},
        "step": "SOS_TRIGGERED",
        "stepData": {"source": "BUTTON"},
        "occurredAt": 9000,
    }
    payload.update(overrides)
    return payload


def test_sync_endpoint_creates_incident_and_returns_success_envelope():
    response = client.post("/api/v1/emergency/incidents/sync", json=base_event())
    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["data"]["incidentId"]
    assert "timestamp" in body


def test_sync_endpoint_rejects_missing_required_field():
    payload = base_event()
    del payload["clientIncidentId"]
    response = client.post("/api/v1/emergency/incidents/sync", json=payload)
    assert response.status_code == 422


def test_history_endpoint_returns_only_matching_firebase_uid():
    client.post("/api/v1/emergency/incidents/sync", json=base_event(firebaseUid="uid-a"))
    client.post(
        "/api/v1/emergency/incidents/sync",
        json=base_event(clientIncidentId="sos-9001-other", firebaseUid="uid-b"),
    )

    response = client.get("/api/v1/emergency/incidents/history", params={"firebaseUid": "uid-a"})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) == 1
    assert body["data"][0]["clientIncidentId"] == "sos-9000-xyz99"


def test_history_detail_endpoint_returns_full_timeline():
    sync_response = client.post("/api/v1/emergency/incidents/sync", json=base_event())
    incident_id = sync_response.json()["data"]["incidentId"]
    client.post(
        "/api/v1/emergency/incidents/sync",
        json=base_event(step="SMS_SENT", occurredAt=9500),
    )

    response = client.get(f"/api/v1/emergency/incidents/history/{incident_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]["timeline"]) == 2


def test_history_detail_endpoint_returns_404_for_unknown_incident():
    response = client.get("/api/v1/emergency/incidents/history/does-not-exist")
    assert response.status_code == 404
