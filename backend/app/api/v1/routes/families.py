from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.family import Family, FamilyStatus
from app.models.user import User
from app.schemas.family import FamilyCreate, FamilyOut, FamilyStatusUpdate, FamilyUpdate
from app.schemas.common import MessageResponse
from app.services.family_access import get_family_or_404, query_visible_families

router = APIRouter()

ALLOWED_TRANSITIONS = {
    FamilyStatus.DRAFT: {FamilyStatus.REVIEWED, FamilyStatus.ARCHIVED},
    FamilyStatus.REVIEWED: {FamilyStatus.EXPORTED, FamilyStatus.ARCHIVED, FamilyStatus.DRAFT},
    FamilyStatus.EXPORTED: {FamilyStatus.ARCHIVED, FamilyStatus.REVIEWED},
    FamilyStatus.ARCHIVED: set(),
}
@router.get("", response_model=list[FamilyOut])
def list_families(
    status_filter: FamilyStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = query_visible_families(db, current_user)
    if status_filter:
        query = query.filter(Family.status == status_filter)
    return query.order_by(Family.updated_at.desc()).all()


@router.post("", response_model=FamilyOut, status_code=status.HTTP_201_CREATED)
def create_family(
    payload: FamilyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    family = Family(
        title=payload.title,
        client_reference=payload.client_reference,
        created_by=current_user.id,
    )
    db.add(family)
    db.commit()
    db.refresh(family)
    return family


@router.get("/{family_id}", response_model=FamilyOut)
def get_family(
    family_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_family_or_404(db, current_user, family_id)


@router.patch("/{family_id}", response_model=FamilyOut)
def update_family(
    family_id: int,
    payload: FamilyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    family = get_family_or_404(db, current_user, family_id)
    if payload.title is not None:
        family.title = payload.title
    if payload.client_reference is not None:
        family.client_reference = payload.client_reference
    db.add(family)
    db.commit()
    db.refresh(family)
    return family


@router.patch("/{family_id}/status", response_model=FamilyOut)
def update_family_status(
    family_id: int,
    payload: FamilyStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    family = get_family_or_404(db, current_user, family_id)

    allowed = ALLOWED_TRANSITIONS.get(family.status, set())
    if payload.status != family.status and payload.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid transition: {family.status} -> {payload.status}")

    family.status = payload.status
    if payload.status == FamilyStatus.ARCHIVED:
        family.archived_at = datetime.now(UTC)
    db.add(family)
    db.commit()
    db.refresh(family)
    return family


@router.delete("/{family_id}", response_model=MessageResponse)
def archive_family(
    family_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    family = get_family_or_404(db, current_user, family_id)
    family.status = FamilyStatus.ARCHIVED
    family.archived_at = datetime.now(UTC)
    db.add(family)
    db.commit()
    return MessageResponse(message="Family archived")
