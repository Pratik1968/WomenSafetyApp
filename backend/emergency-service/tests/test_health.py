# backend/emergency-service/tests/test_health.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check_returns_healthy_status():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "emergency-service",
        "version": "1.0.0",
    }
