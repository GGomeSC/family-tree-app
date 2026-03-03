from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.case import Case, CaseStatus
from app.models.user import User, UserRole
from app.schemas.case import CaseCreate, CaseOut, CaseStatusUpdate, CaseUpdate
from app.schemas.common import MessageResponse

router = APIRouter()

ALLOWED_TRANSITIONS = {
    CaseStatus.DRAFT: {CaseStatus.REVIEWED, CaseStatus.ARCHIVED},
    CaseStatus.REVIEWED: {CaseStatus.EXPORTED, CaseStatus.ARCHIVED, CaseStatus.DRAFT},
    CaseStatus.EXPORTED: {CaseStatus.ARCHIVED, CaseStatus.REVIEWED},
    CaseStatus.ARCHIVED: set(),
}


def _query_visible_cases(db: Session, user: User):
    query = db.query(Case)
    if user.role != UserRole.ADMIN:
        query = query.filter(Case.created_by == user.id)
    return query


def _get_case_or_404(db: Session, user: User, case_id: int) -> Case:
    query = _query_visible_cases(db, user)
    case = query.filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.get("", response_model=list[CaseOut])
def list_cases(
    status_filter: CaseStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _query_visible_cases(db, current_user)
    if status_filter:
        query = query.filter(Case.status == status_filter)
    return query.order_by(Case.updated_at.desc()).all()


@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = Case(
        title=payload.title,
        client_reference=payload.client_reference,
        created_by=current_user.id,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.get("/{case_id}", response_model=CaseOut)
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_case_or_404(db, current_user, case_id)


@router.patch("/{case_id}", response_model=CaseOut)
def update_case(
    case_id: int,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = _get_case_or_404(db, current_user, case_id)
    if payload.title is not None:
        case.title = payload.title
    if payload.client_reference is not None:
        case.client_reference = payload.client_reference
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.patch("/{case_id}/status", response_model=CaseOut)
def update_case_status(
    case_id: int,
    payload: CaseStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = _get_case_or_404(db, current_user, case_id)

    allowed = ALLOWED_TRANSITIONS.get(case.status, set())
    if payload.status != case.status and payload.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid transition: {case.status} -> {payload.status}")

    case.status = payload.status
    if payload.status == CaseStatus.ARCHIVED:
        case.archived_at = datetime.utcnow()
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.delete("/{case_id}", response_model=MessageResponse)
def archive_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = _get_case_or_404(db, current_user, case_id)
    case.status = CaseStatus.ARCHIVED
    case.archived_at = datetime.utcnow()
    db.add(case)
    db.commit()
    return MessageResponse(message="Case archived")
