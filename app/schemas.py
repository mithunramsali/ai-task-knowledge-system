from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

# 1. DEFINE BASE FIRST
class UserBase(BaseModel):
    username: str

# 2. THEN DEFINE THE OTHERS THAT USE IT
class UserCreate(UserBase):
    password: str
    role_id: int

class UserOut(UserBase):
    id: int
    role_id: int
    model_config = ConfigDict(from_attributes=True)

# --- Add these for the next steps ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role_id: int

class SearchQuery(BaseModel):
    query: str


# --- TASK SCHEMAS ---

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "pending"

class TaskCreate(TaskBase):
    assigned_to: int

class TaskOut(TaskBase):
    id: int
    assigned_to: int
    model_config = ConfigDict(from_attributes=True)

class ActivityLogOut(BaseModel):
    id: int
    user_id: int
    action: str
    timestamp: datetime

    class Config:
        from_attributes = True