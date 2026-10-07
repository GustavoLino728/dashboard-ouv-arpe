import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["servidor", "coordenador", "admin"] = "servidor"
    department: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    role: Literal["servidor", "coordenador", "admin"] | None = None
    department: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    department: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime