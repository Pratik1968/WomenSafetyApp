# backend/emergency-service/tests/test_incident_service.py
from unittest.mock import MagicMock, patch

from app.schemas.incident_schema import IncidentEventRequest, LocationPayload
from app.services import incident_service


def make_payload(**overrides):
    defaults = dict(
        clientIncidentId="sos-1000-abc12",
        firebaseUid="uid-1",
        source="BUTTON",
        status="active",
        startedAt=1000,
        endedAt=None,
        location=LocationPayload(lat=12.9716, lon=77.5946, accurate=True),
        step="SOS_TRIGGERED",
        stepData={"source": "BUTTON"},
        occurredAt=1000,
    )
    defaults.update(overrides)
    return IncidentEventRequest(**defaults)


def test_record_incident_event_in_memory_mode_creates_and_returns_incident_id():
    with patch("app.services.incident_service.get_supabase", return_value=None):
        incident_service._memory_incidents.clear()
        incident_id = incident_service.record_incident_event(make_payload())
        assert incident_id
        assert incident_service._memory_incidents[incident_id]["client_incident_id"] == "sos-1000-abc12"
        assert len(incident_service._memory_incidents[incident_id]["timeline"]) == 1


def test_record_incident_event_in_memory_mode_appends_to_existing_incident():
    with patch("app.services.incident_service.get_supabase", return_value=None):
        incident_service._memory_incidents.clear()
        incident_id = incident_service.record_incident_event(make_payload())
        incident_service.record_incident_event(
            make_payload(step="SMS_SENT", stepData={"numbers": ["+91999"]}, occurredAt=2000)
        )
        assert len(incident_service._memory_incidents[incident_id]["timeline"]) == 2
        assert incident_service._memory_incidents[incident_id]["status"] == "active"


def test_record_incident_event_in_memory_mode_updates_status_and_ended_at():
    with patch("app.services.incident_service.get_supabase", return_value=None):
        incident_service._memory_incidents.clear()
        incident_id = incident_service.record_incident_event(make_payload())
        incident_service.record_incident_event(
            make_payload(step="SOS_ENDED", status="resolved", endedAt=5000, location=None, occurredAt=5000)
        )
        assert incident_service._memory_incidents[incident_id]["status"] == "resolved"
        assert incident_service._memory_incidents[incident_id]["ended_at"] == 5000


def test_record_incident_event_supabase_mode_calls_upsert_and_insert():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.upsert.return_value.execute.return_value.data = [{"id": "row-uuid-1"}]
    with patch("app.services.incident_service.get_supabase", return_value=mock_supabase):
        incident_id = incident_service.record_incident_event(make_payload())

    assert incident_id == "row-uuid-1"
    mock_supabase.table.assert_any_call("sos_incidents")
    mock_supabase.table.return_value.upsert.assert_called_once()
    upsert_kwargs = mock_supabase.table.return_value.upsert.call_args
    assert upsert_kwargs.kwargs.get("on_conflict") == "client_incident_id"
    mock_supabase.table.assert_any_call("incident_timeline")
    mock_supabase.table.return_value.insert.assert_called_once()


def test_record_incident_event_supabase_mode_contacts_notified_upsert_does_not_clobber_flags():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.upsert.return_value.execute.return_value.data = [{"id": "row-uuid-1"}]
    with patch("app.services.incident_service.get_supabase", return_value=mock_supabase):
        incident_service.record_incident_event(
            make_payload(step="SMS_SENT", stepData={"numbers": ["+91999"]}, occurredAt=2000)
        )
        incident_service.record_incident_event(
            make_payload(step="CALL_PLACED", stepData={"numbers": ["+91999"]}, occurredAt=3000)
        )

    contact_upsert_calls = [
        call
        for call in mock_supabase.table.return_value.upsert.call_args_list
        if call.args and call.args[0].get("phone") == "+91999"
    ]
    assert len(contact_upsert_calls) == 2

    first_row, second_row = contact_upsert_calls[0].args[0], contact_upsert_calls[1].args[0]
    assert first_row.get("sms_sent") is True
    assert "call_placed" not in first_row

    assert second_row.get("call_placed") is True
    # The second (CALL_PLACED) upsert must NOT explicitly set sms_sent to False —
    # that would clobber the previously-set sms_sent=True on conflict, since
    # PostgREST upsert only touches columns present in the payload.
    assert "sms_sent" not in second_row


def test_record_incident_event_supabase_mode_location_history_uses_location_timestamp_when_present():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.upsert.return_value.execute.return_value.data = [{"id": "row-uuid-1"}]
    with patch("app.services.incident_service.get_supabase", return_value=mock_supabase):
        incident_service.record_incident_event(
            make_payload(
                step="LOCATION_UPDATE",
                location=LocationPayload(lat=13.0, lon=77.6, accurate=True, timestamp=9999),
                occurredAt=1500,
            )
        )

    location_insert_calls = [
        call
        for call in mock_supabase.table.return_value.insert.call_args_list
        if call.args and call.args[0].get("latitude") == 13.0
    ]
    assert len(location_insert_calls) == 1
    inserted_row = location_insert_calls[0].args[0]
    # location.timestamp (9999) must win over occurredAt (1500) — the GPS fix's
    # own timestamp is more precise than the general sync-call timestamp.
    assert inserted_row["recorded_at"] == incident_service._epoch_ms_to_iso(9999)


def test_list_incidents_in_memory_mode_filters_by_firebase_uid():
    with patch("app.services.incident_service.get_supabase", return_value=None):
        incident_service._memory_incidents.clear()
        incident_service.record_incident_event(make_payload(firebaseUid="uid-1"))
        incident_service.record_incident_event(make_payload(clientIncidentId="sos-2000-def34", firebaseUid="uid-2"))

        results = incident_service.list_incidents("uid-1")
        assert len(results) == 1
        assert results[0]["clientIncidentId"] == "sos-1000-abc12"


def test_get_incident_detail_in_memory_mode_returns_full_timeline():
    with patch("app.services.incident_service.get_supabase", return_value=None):
        incident_service._memory_incidents.clear()
        incident_id = incident_service.record_incident_event(make_payload())
        incident_service.record_incident_event(make_payload(step="SMS_SENT", occurredAt=2000))

        detail = incident_service.get_incident_detail(incident_id)
        assert detail is not None
        assert len(detail["timeline"]) == 2
        assert detail["timeline"][0]["step"] == "SOS_TRIGGERED"


def test_get_incident_detail_returns_none_for_unknown_id():
    with patch("app.services.incident_service.get_supabase", return_value=None):
        incident_service._memory_incidents.clear()
        assert incident_service.get_incident_detail("does-not-exist") is None


def test_get_incident_detail_in_memory_mode_populates_location_history_and_contacts_notified():
    with patch("app.services.incident_service.get_supabase", return_value=None):
        incident_service._memory_incidents.clear()
        incident_id = incident_service.record_incident_event(make_payload())
        incident_service.record_incident_event(
            make_payload(
                step="LOCATION_UPDATE",
                location=LocationPayload(lat=13.0, lon=77.6, accurate=True),
                occurredAt=1500,
            )
        )
        incident_service.record_incident_event(
            make_payload(step="SMS_SENT", stepData={"numbers": ["+91999"]}, occurredAt=2000)
        )

        detail = incident_service.get_incident_detail(incident_id)
        assert detail is not None

        assert len(detail["locationHistory"]) == 1
        assert detail["locationHistory"][0]["latitude"] == 13.0
        assert detail["locationHistory"][0]["longitude"] == 77.6

        assert len(detail["contactsNotified"]) == 1
        assert detail["contactsNotified"][0]["phone"] == "+91999"
        assert detail["contactsNotified"][0]["sms_sent"] is True
        assert detail["contactsNotified"][0]["call_placed"] is False


def test_get_incident_detail_in_memory_mode_location_history_uses_location_timestamp_when_present():
    with patch("app.services.incident_service.get_supabase", return_value=None):
        incident_service._memory_incidents.clear()
        incident_id = incident_service.record_incident_event(make_payload())
        incident_service.record_incident_event(
            make_payload(
                step="LOCATION_UPDATE",
                location=LocationPayload(lat=13.0, lon=77.6, accurate=True, timestamp=9999),
                occurredAt=1500,
            )
        )

        detail = incident_service.get_incident_detail(incident_id)
        # location.timestamp (9999) must win over occurredAt (1500), matching the
        # Supabase-mode preference, for consistency between the two modes.
        assert detail["locationHistory"][0]["recorded_at"] == incident_service._epoch_ms_to_iso(9999)


def test_get_incident_detail_in_memory_mode_location_history_falls_back_to_occurred_at_when_no_location_timestamp():
    with patch("app.services.incident_service.get_supabase", return_value=None):
        incident_service._memory_incidents.clear()
        incident_id = incident_service.record_incident_event(make_payload())
        incident_service.record_incident_event(
            make_payload(
                step="LOCATION_UPDATE",
                location=LocationPayload(lat=13.0, lon=77.6, accurate=True),  # no timestamp
                occurredAt=1500,
            )
        )

        detail = incident_service.get_incident_detail(incident_id)
        assert detail["locationHistory"][0]["recorded_at"] == incident_service._epoch_ms_to_iso(1500)
