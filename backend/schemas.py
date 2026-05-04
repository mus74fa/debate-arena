from pydantic import BaseModel, EmailStr
from typing import Optional

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    xp: int
    level: int
    streak: int
    level_title: str
    xp_for_next_level: int

class DebateCreate(BaseModel):
    topic: str
    rounds: int

class DebateResponse(BaseModel):
    id: int
    topic: str
    rounds: int
    status: str
    created_at: str

class MessageResponse(BaseModel):
    id: int
    speaker: str
    content: str
    created_at: str

class UserMessage(BaseModel):
    content: str

class HotTopicResponse(BaseModel):
    topic: str
    date: str

class LeaderboardEntry(BaseModel):
    username: str
    xp: int
    level: int
    level_title: str
    streak: int