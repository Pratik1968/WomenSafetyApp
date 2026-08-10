from fastapi import APIRouter
from app.schemas.health import HealthCheckResponse
from app.core.firebase import get_firebase_app

router = APIRouter(prefix="/health", tags=["Health & Status Checks"])

@router.get("", response_model=HealthCheckResponse)
async def health_check():
    firebase_app = get_firebase_app()
    return HealthCheckResponse(
        status="healthy",
        service="Aegis AI Women Safety Modular Monolith",
        version="1.0.0",
        firebase_connected=bool(firebase_app),
        details={
            "database": "online",
            "firebase_admin": "initialized" if firebase_app else "mock_mode"
        }
    )
