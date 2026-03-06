from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.family import FamilyStatus


class FamilyCreate(BaseModel):
    title: str
    client_reference: str | None = None


class FamilyUpdate(BaseModel):
    title: str | None = None
    client_reference: str | None = None


class FamilyStatusUpdate(BaseModel):
    status: FamilyStatus


class FamilyOut(BaseModel):
    id: int
    title: str
    client_reference: str | None
    status: FamilyStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
