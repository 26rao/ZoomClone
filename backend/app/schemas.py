from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    id: str
    role: Optional[str] = "participant"

class User(UserBase):
    id: str
    role: Optional[str] = "participant"

    class Config:
        from_attributes = True

# Participant Schemas
class ParticipantBase(BaseModel):
    user_name: str

class ParticipantCreate(ParticipantBase):
    meeting_id: str
    user_id: Optional[str] = None
    role: Optional[str] = "participant"

class Participant(ParticipantBase):
    id: int
    meeting_id: str
    user_id: Optional[str] = None
    role: Optional[str] = "participant"
    joined_at: datetime

    class Config:
        from_attributes = True

# Meeting Schemas
class MeetingBase(BaseModel):
    title: str
    duration: int  # in minutes

class MeetingCreate(MeetingBase):
    host_id: str
    host_name: str
    start_time: datetime
    description: Optional[str] = None
    passcode: Optional[str] = None
    is_demo: Optional[bool] = False
    demo_participants: Optional[List[str]] = []

class Meeting(MeetingBase):
    id: str
    meeting_id: str
    description: Optional[str] = None
    passcode: Optional[str] = None
    host_id: str
    host_name: str
    start_time: datetime
    scheduled_time: Optional[datetime] = None
    status: str
    invite_link: str
    is_active: Optional[bool] = True
    is_demo: Optional[bool] = False
    demo_participants: Optional[List[str]] = []
    participants: List[Participant] = []

    class Config:
        from_attributes = True

class JoinMeetingRequest(BaseModel):
    user_name: str
    user_id: Optional[str] = None

class TokenRequest(BaseModel):
    user_id: str
    user_name: Optional[str] = None

class TokenResponse(BaseModel):
    token: str
    api_key: str

class UserRegisterRequest(BaseModel):
    name: str
    email: str

class UserLoginRequest(BaseModel):
    email: str

class AuthResponse(BaseModel):
    token: str
    user_id: str
    name: str
    email: str
