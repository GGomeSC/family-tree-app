"""Shared family access helpers for scoped lookup and visibility checks."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.family import Family
from app.models.user import User, UserRole


def query_visible_families(db: Session, user: User):
    """Return the family query scoped to what the current user can access."""
    query = db.query(Family)
    if user.role != UserRole.ADMIN:
        query = query.filter(Family.created_by == user.id)
    return query


def get_family_or_404(db: Session, user: User, family_id: int, *, for_update: bool = False) -> Family:
    """Return a visible family or raise 404 when it does not exist for the user."""
    query = query_visible_families(db, user)
    if for_update:
        query = query.with_for_update()

    family = query.filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return family
