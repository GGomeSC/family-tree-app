from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PersonCreate(BaseModel):
    full_name: str
    birth_date: date
    is_richiedente: bool = False
    notes: str | None = None


class PersonUpdate(BaseModel):
    full_name: str | None = None
    birth_date: date | None = None
    is_richiedente: bool | None = None
    notes: str | None = None


class PersonOut(BaseModel):
    id: int
    family_id: int
    full_name: str
    birth_date: date
    is_richiedente: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnionCreate(BaseModel):
    partner_a_person_id: int
    partner_b_person_id: int
    marriage_date: date | None = None


class UnionUpdate(BaseModel):
    partner_a_person_id: int | None = None
    partner_b_person_id: int | None = None
    marriage_date: date | None = None


class UnionOut(BaseModel):
    id: int
    family_id: int
    partner_a_person_id: int
    partner_b_person_id: int
    marriage_date: date | None

    model_config = ConfigDict(from_attributes=True)


class ParentChildCreate(BaseModel):
    parent_person_id: int
    child_person_id: int
