from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.export import Export
from app.models.family import Family
from app.models.person import ParentChildLink, Person, Union
from app.models.user import User, UserRole
from app.schemas.export import ExportOut
from app.services.export import export_pdf, render_html
from app.services.layout import build_layout

router = APIRouter()


def _get_family_or_404(db: Session, user: User, family_id: int) -> Family:
    query = db.query(Family)
    if user.role != UserRole.ADMIN:
        query = query.filter(Family.created_by == user.id)
    family = query.filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return family


@router.post("/families/{family_id}/export/pdf", response_model=ExportOut, status_code=status.HTTP_201_CREATED)
def create_pdf_export(
    family_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    family = _get_family_or_404(db, current_user, family_id)

    persons = db.query(Person).filter(Person.family_id == family_id).all()
    unions = db.query(Union).filter(Union.family_id == family_id).all()
    links = db.query(ParentChildLink).filter(ParentChildLink.family_id == family_id).all()

    if not persons:
        raise HTTPException(status_code=400, detail="Family has no persons")

    layout = build_layout(persons, unions, links)
    html = render_html(layout, family)
    try:
        file_path = export_pdf(html, family_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    export = Export(
        family_id=family_id,
        exported_by=current_user.id,
        format="pdf",
        template_version="v1",
        file_path=file_path,
    )
    db.add(export)
    db.commit()
    db.refresh(export)
    return export


@router.get("/exports/{export_id}/download")
def download_export(
    export_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    export = db.query(Export).filter(Export.id == export_id).first()
    if not export:
        raise HTTPException(status_code=404, detail="Export not found")

    _get_family_or_404(db, current_user, export.family_id)

    return FileResponse(export.file_path, media_type="application/pdf", filename="arvore-genealógica.pdf")


@router.get("/families/{family_id}/exports", response_model=list[ExportOut])
def list_exports(
    family_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_family_or_404(db, current_user, family_id)
    return db.query(Export).filter(Export.family_id == family_id).order_by(Export.created_at.desc()).all()
