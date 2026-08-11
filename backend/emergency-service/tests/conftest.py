import pytest


@pytest.fixture(autouse=True)
def force_in_memory_mode(monkeypatch):
    """
    Makes the test suite hermetic: forces get_supabase() to return None
    (in-memory dev mode) for every test by default, regardless of what
    backend/.env or the ambient environment sets. Tests that want to
    exercise the Supabase-mode code path already patch get_supabase()
    directly at the point of use (e.g. patch("app.services.incident_service.get_supabase", ...))
    — that explicit patch takes precedence over this fixture for those tests,
    since it's applied after this fixture's monkeypatch in the same test.
    """
    monkeypatch.setattr("app.services.incident_service.get_supabase", lambda: None)
