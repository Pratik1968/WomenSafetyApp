
from pydantic import BaseModel
from typing import Optional
from app.schemas.user import UserResponse

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: Optional[str] = None
    user: Optional[UserResponse] = None

class PasswordStatusResponse(BaseModel):
    has_password: bool

class LoginRequest(BaseModel):
    firebase_id_token: str

class PasswordLoginRequest(BaseModel):
    identifier: str  # email or phone number
    password: str

class SetPasswordRequest(BaseModel):
    new_password: str
    firebase_uid: Optional[str] = None

class PasswordRegisterRequest(BaseModel):
    email: str
    phone: str
    password: str
    full_name: Optional[str] = None

