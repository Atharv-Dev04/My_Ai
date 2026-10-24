"""
Authentication schemas for registration, login, and user representations.
"""
from __future__ import annotations

import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    is_active: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
