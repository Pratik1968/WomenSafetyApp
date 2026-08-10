from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    firebase_uid: str
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    date_of_birth: Optional[str] = None
    medical_notes: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    firebase_uid: str
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    date_of_birth: Optional[str] = None
    medical_notes: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
