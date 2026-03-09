from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.family import Family
from app.models.person import ParentChildLink, Person, Union
from app.models.user import User, UserRole
from app.schemas.common import MessageResponse
from app.schemas.person import ParentChildCreate, PersonCreate, PersonOut, PersonUpdate, UnionCreate, UnionOut, UnionUpdate
from app.services.graph import detect_cycle, would_create_cycle

router = APIRouter()


def _get_family_or_404(db: Session, user: User, family_id: int, *, for_update: bool = False) -> Family:
    query = db.query(Family)
    if user.role != UserRole.ADMIN:
        query = query.filter(Family.created_by == user.id)
    if for_update:
        query = query.with_for_update()
    family = query.filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return family


def _assert_person_in_family(db: Session, family_id: int, person_id: int) -> Person:
    person = db.query(Person).filter(Person.id == person_id, Person.family_id == family_id).first()
    if not person:
        raise HTTPException(status_code=400, detail=f"Person {person_id} does not belong to family")
    return person


@router.post("/{family_id}/persons", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
def create_person(
    family_id: int,
    payload: PersonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_family_or_404(db, current_user, family_id)
    person = Person(family_id=family_id, **payload.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.patch("/{family_id}/persons/{person_id}", response_model=PersonOut)
def update_person(
    family_id: int,
    person_id: int,
    payload: PersonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_family_or_404(db, current_user, family_id)
    person = _assert_person_in_family(db, family_id, person_id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(person, key, value)

    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.delete("/{family_id}/persons/{person_id}", response_model=MessageResponse)
def delete_person(
    family_id: int,
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_family_or_404(db, current_user, family_id)
    person = _assert_person_in_family(db, family_id, person_id)

    db.query(Union).filter(
        Union.family_id == family_id,
        or_(Union.partner_a_person_id == person_id, Union.partner_b_person_id == person_id),
    ).delete()
    db.query(ParentChildLink).filter(
        ParentChildLink.family_id == family_id,
        or_(ParentChildLink.parent_person_id == person_id, ParentChildLink.child_person_id == person_id),
    ).delete()
    db.delete(person)
    db.commit()
    return MessageResponse(message="Person deleted")


@router.post("/{family_id}/unions", response_model=UnionOut, status_code=status.HTTP_201_CREATED)
def create_union(
    family_id: int,
    payload: UnionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_family_or_404(db, current_user, family_id)

    if payload.partner_a_person_id == payload.partner_b_person_id:
        raise HTTPException(status_code=400, detail="Partners must be different people")

    _assert_person_in_family(db, family_id, payload.partner_a_person_id)
    _assert_person_in_family(db, family_id, payload.partner_b_person_id)

    existing_union = db.query(Union).filter(
        Union.family_id == family_id,
        or_(
            (Union.partner_a_person_id == payload.partner_a_person_id)
            & (Union.partner_b_person_id == payload.partner_b_person_id),
            (Union.partner_a_person_id == payload.partner_b_person_id)
            & (Union.partner_b_person_id == payload.partner_a_person_id),
        ),
    ).first()
    if existing_union:
        raise HTTPException(status_code=409, detail="Union already exists for this pair")

    union = Union(family_id=family_id, **payload.model_dump())
    db.add(union)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Union already exists for this pair") from exc
    db.refresh(union)
    return union


@router.patch("/{family_id}/unions/{union_id}", response_model=UnionOut)
def update_union(
    family_id: int,
    union_id: int,
    payload: UnionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_family_or_404(db, current_user, family_id)
    union = db.query(Union).filter(Union.id == union_id, Union.family_id == family_id).first()
    if not union:
        raise HTTPException(status_code=404, detail="Union not found")

    data = payload.model_dump(exclude_unset=True)
    new_a = data.get("partner_a_person_id", union.partner_a_person_id)
    new_b = data.get("partner_b_person_id", union.partner_b_person_id)
    if new_a == new_b:
        raise HTTPException(status_code=400, detail="Partners must be different people")

    _assert_person_in_family(db, family_id, new_a)
    _assert_person_in_family(db, family_id, new_b)

    for key, value in data.items():
        setattr(union, key, value)

    db.add(union)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Union already exists for this pair") from exc
    db.refresh(union)
    return union


@router.delete("/{family_id}/unions/{union_id}", response_model=MessageResponse)
def delete_union(
    family_id: int,
    union_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_family_or_404(db, current_user, family_id)
    union = db.query(Union).filter(Union.id == union_id, Union.family_id == family_id).first()
    if not union:
        raise HTTPException(status_code=404, detail="Union not found")

    db.delete(union)
    db.commit()
    return MessageResponse(message="Union deleted")


@router.post("/{family_id}/parent-child-links", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_parent_child_link(
    family_id: int,
    payload: ParentChildCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        _get_family_or_404(db, current_user, family_id, for_update=True)

        locked_people = db.query(Person).with_for_update().filter(
            Person.family_id == family_id,
            Person.id.in_([payload.parent_person_id, payload.child_person_id]),
        ).all()
        locked_person_ids = {person.id for person in locked_people}
        if payload.parent_person_id not in locked_person_ids:
            raise HTTPException(status_code=400, detail=f"Person {payload.parent_person_id} does not belong to family")
        if payload.child_person_id not in locked_person_ids:
            raise HTTPException(status_code=400, detail=f"Person {payload.child_person_id} does not belong to family")

        existing_links = db.query(ParentChildLink).filter(ParentChildLink.family_id == family_id).all()
        existing_edges = [(link.parent_person_id, link.child_person_id) for link in existing_links]
        new_edge = (payload.parent_person_id, payload.child_person_id)
        if would_create_cycle(existing_edges, new_edge):
            raise HTTPException(status_code=400, detail="This relationship would create a cycle in lineage")
        if new_edge in existing_edges:
            raise HTTPException(status_code=409, detail="Parent-child link already exists")

        link = ParentChildLink(family_id=family_id, **payload.model_dump())
        db.add(link)
        db.flush()

        all_person_ids = {person.id for person in db.query(Person).filter(Person.family_id == family_id).all()}
        all_edges = [
            (existing_link.parent_person_id, existing_link.child_person_id)
            for existing_link in db.query(ParentChildLink).filter(ParentChildLink.family_id == family_id).all()
        ]
        if detect_cycle(all_person_ids, all_edges):
            raise HTTPException(status_code=400, detail="Cycle detected")

        db.commit()
        return MessageResponse(message="Parent-child link created")
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Parent-child link already exists") from exc
    except HTTPException:
        db.rollback()
        raise


@router.delete("/{family_id}/parent-child-links/{link_id}", response_model=MessageResponse)
def delete_parent_child_link(
    family_id: int,
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_family_or_404(db, current_user, family_id)
    link = db.query(ParentChildLink).filter(ParentChildLink.id == link_id, ParentChildLink.family_id == family_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()
    return MessageResponse(message="Parent-child link deleted")
