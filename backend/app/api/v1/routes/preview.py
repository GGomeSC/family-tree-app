from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.case import Case
from app.models.person import ParentChildLink, Person, Union
from app.models.user import User, UserRole
from app.schemas.preview import LayoutPreview
from app.services.layout import build_layout

router = APIRouter()


def _get_case_or_404(db: Session, user: User, case_id: int) -> Case:
    query = db.query(Case)
    if user.role != UserRole.ADMIN:
        query = query.filter(Case.created_by == user.id)
    case = query.filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.get("/{case_id}/preview", response_model=LayoutPreview)
def preview_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case_or_404(db, current_user, case_id)
    persons = db.query(Person).filter(Person.case_id == case_id).all()
    unions = db.query(Union).filter(Union.case_id == case_id).all()
    links = db.query(ParentChildLink).filter(ParentChildLink.case_id == case_id).all()

    if not persons:
        raise HTTPException(status_code=400, detail="Case has no persons")

    return build_layout(persons, unions, links)
