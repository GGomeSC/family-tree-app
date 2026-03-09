from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.person import ParentChildLink, Person, Union
from app.models.user import User
from app.schemas.preview import LayoutPreview
from app.services.family_access import get_family_or_404
from app.services.layout import build_layout

router = APIRouter()


@router.get("/{family_id}/preview", response_model=LayoutPreview)
def preview_family(
    family_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_family_or_404(db, current_user, family_id)
    persons = db.query(Person).filter(Person.family_id == family_id).all()
    unions = db.query(Union).filter(Union.family_id == family_id).all()
    links = db.query(ParentChildLink).filter(ParentChildLink.family_id == family_id).all()

    if not persons:
        raise HTTPException(status_code=400, detail="Family has no persons")

    return build_layout(persons, unions, links)
