from pydantic import BaseModel


class LayoutPerson(BaseModel):
    id: int
    name: str
    birth_date: str
    is_richiedente: bool
    x: float
    y: float
    role: str
    page: int


class LayoutUnion(BaseModel):
    id: int
    partner_a_person_id: int
    partner_b_person_id: int
    marriage_date: str | None


class LayoutEdge(BaseModel):
    from_id: int
    to_id: int
    via_union_id: int | None = None
    from_page: int
    to_page: int


class LayoutPreview(BaseModel):
    pages: int
    persons: list[LayoutPerson]
    unions: list[LayoutUnion]
    edges: list[LayoutEdge]
    continuation_edges: list[LayoutEdge]
