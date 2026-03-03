from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.case import CaseStatus


class CaseCreate(BaseModel):
    title: str
    client_reference: str | None = None


class CaseUpdate(BaseModel):
    title: str | None = None
    client_reference: str | None = None


class CaseStatusUpdate(BaseModel):
    status: CaseStatus


class CaseOut(BaseModel):
    id: int
    title: str
    client_reference: str | None
    status: CaseStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
