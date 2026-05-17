from pydantic import BaseModel, EmailStr
from typing import Optional, List

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

class DebateCreate(BaseModel):
    topic: str
    rounds: int
    persona_ids: Optional[List[int]] = []
    include_defaults: Optional[bool] = True

class PersonaCreate(BaseModel):
    name: str
    title: Optional[str] = None
    personality: str
    debating_style: str
    expertise: str
    avatar: Optional[str] = "🎓"

class PersonaResponse(BaseModel):
    id: int
    name: str
    title: Optional[str]
    personality: str
    debating_style: str
    expertise: str
    avatar: str
    created_by: int
    created_at: str

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

