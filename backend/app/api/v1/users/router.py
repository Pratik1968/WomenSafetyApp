from fastapi import APIRouter, Depends, status, HTTPException

from app.schemas.user import UserCreate, UserResponse
from app.services.user.user_service import UserService
from app.core.security import FirebaseIdentity, get_current_firebase_identity, get_current_firebase_uid
from app.core.logging import logger

router = APIRouter(prefix="/users", tags=["Users Module"])


@router.post("/profile", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def save_profile(payload: UserCreate, current_uid: str = Depends(get_current_firebase_uid)):
    """
    Create or update the profile for the authenticated Firebase user.
    """
    if payload.firebase_uid != current_uid:
        raise HTTPException(status_code=403, detail="Cannot save a profile for another user")
    try:
        service = UserService()
        profile = service.save_profile(payload)
        return profile
    except Exception as err:
        logger.error(f"Error saving user profile: {err}")
        raise HTTPException(status_code=500, detail=f"Failed to save profile: {str(err)}")


@router.get("/profile/{firebase_uid}", response_model=UserResponse)
async def get_profile(firebase_uid: str, identity: FirebaseIdentity = Depends(get_current_firebase_identity)):
    """
    Fetch a user's profile by Firebase UID. Callers may only fetch their own profile.
    Falls back to a phone-number match (from the verified token) if this UID has no
    row yet - covers accounts whose stored firebase_uid predates this sign-in.
    """
    if firebase_uid != identity.uid:
        raise HTTPException(status_code=403, detail="Cannot access another user's profile")
    try:
        service = UserService()
        profile = service.get_profile(firebase_uid, phone_number=identity.phone_number)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        return profile
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error fetching user profile: {err}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(err)}")
