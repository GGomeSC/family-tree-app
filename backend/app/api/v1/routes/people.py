from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.case import Case
from app.models.person import ParentChildLink, Person, Union
from app.models.user import User, UserRole
from app.schemas.common import MessageResponse
from app.schemas.person import ParentChildCreate, PersonCreate, PersonOut, PersonUpdate, UnionCreate, UnionOut, UnionUpdate
from app.services.graph import detect_cycle, would_create_cycle

router = APIRouter()


def _get_case_or_404(db: Session, user: User, case_id: int) -> Case:
    query = db.query(Case)
    if user.role != UserRole.ADMIN:
        query = query.filter(Case.created_by == user.id)
    case = query.filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


def _assert_person_in_case(db: Session, case_id: int, person_id: int) -> Person:
    person = db.query(Person).filter(Person.id == person_id, Person.case_id == case_id).first()
    if not person:
        raise HTTPException(status_code=400, detail=f"Person {person_id} does not belong to case")
    return person


@router.post("/{case_id}/persons", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
def create_person(
    case_id: int,
    payload: PersonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case_or_404(db, current_user, case_id)
    person = Person(case_id=case_id, **payload.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.patch("/{case_id}/persons/{person_id}", response_model=PersonOut)
def update_person(
    case_id: int,
    person_id: int,
    payload: PersonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case_or_404(db, current_user, case_id)
    person = _assert_person_in_case(db, case_id, person_id)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(person, key, value)

    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.delete("/{case_id}/persons/{person_id}", response_model=MessageResponse)
def delete_person(
    case_id: int,
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case_or_404(db, current_user, case_id)
    person = _assert_person_in_case(db, case_id, person_id)

    db.query(Union).filter(
        Union.case_id == case_id,
        or_(Union.partner_a_person_id == person_id, Union.partner_b_person_id == person_id),
    ).delete()
    db.query(ParentChildLink).filter(
        ParentChildLink.case_id == case_id,
        or_(ParentChildLink.parent_person_id == person_id, ParentChildLink.child_person_id == person_id),
    ).delete()
    db.delete(person)
    db.commit()
    return MessageResponse(message="Person deleted")


@router.post("/{case_id}/unions", response_model=UnionOut, status_code=status.HTTP_201_CREATED)
def create_union(
    case_id: int,
    payload: UnionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case_or_404(db, current_user, case_id)

    if payload.partner_a_person_id == payload.partner_b_person_id:
        raise HTTPException(status_code=400, detail="Partners must be different people")

    _assert_person_in_case(db, case_id, payload.partner_a_person_id)
    _assert_person_in_case(db, case_id, payload.partner_b_person_id)

    existing_union = db.query(Union).filter(
        Union.case_id == case_id,
        or_(
            (Union.partner_a_person_id == payload.partner_a_person_id)
            & (Union.partner_b_person_id == payload.partner_b_person_id),
            (Union.partner_a_person_id == payload.partner_b_person_id)
            & (Union.partner_b_person_id == payload.partner_a_person_id),
        ),
    ).first()
    if existing_union:
        raise HTTPException(status_code=409, detail="Union already exists for this pair")

    union = Union(case_id=case_id, **payload.model_dump())
    db.add(union)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Union already exists for this pair") from exc
    db.refresh(union)
    return union


@router.patch("/{case_id}/unions/{union_id}", response_model=UnionOut)
def update_union(
    case_id: int,
    union_id: int,
    payload: UnionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case_or_404(db, current_user, case_id)
    union = db.query(Union).filter(Union.id == union_id, Union.case_id == case_id).first()
    if not union:
        raise HTTPException(status_code=404, detail="Union not found")

    data = payload.model_dump(exclude_unset=True)
    new_a = data.get("partner_a_person_id", union.partner_a_person_id)
    new_b = data.get("partner_b_person_id", union.partner_b_person_id)
    if new_a == new_b:
        raise HTTPException(status_code=400, detail="Partners must be different people")

    _assert_person_in_case(db, case_id, new_a)
    _assert_person_in_case(db, case_id, new_b)

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


@router.delete("/{case_id}/unions/{union_id}", response_model=MessageResponse)
def delete_union(
    case_id: int,
    union_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case_or_404(db, current_user, case_id)
    union = db.query(Union).filter(Union.id == union_id, Union.case_id == case_id).first()
    if not union:
        raise HTTPException(status_code=404, detail="Union not found")

    db.delete(union)
    db.commit()
    return MessageResponse(message="Union deleted")


@router.post("/{case_id}/parent-child-links", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_parent_child_link(
    case_id: int,
    payload: ParentChildCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case_or_404(db, current_user, case_id)

    _assert_person_in_case(db, case_id, payload.parent_person_id)
    _assert_person_in_case(db, case_id, payload.child_person_id)

    existing_edges = [
        (l.parent_person_id, l.child_person_id)
        for l in db.query(ParentChildLink).filter(ParentChildLink.case_id == case_id).all()
    ]
    if would_create_cycle(existing_edges, (payload.parent_person_id, payload.child_person_id)):
        raise HTTPException(status_code=400, detail="This relationship would create a cycle in lineage")
    if (payload.parent_person_id, payload.child_person_id) in existing_edges:
        raise HTTPException(status_code=409, detail="Parent-child link already exists")

    link = ParentChildLink(case_id=case_id, **payload.model_dump())
    db.add(link)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Parent-child link already exists") from exc

    all_person_ids = {p.id for p in db.query(Person).filter(Person.case_id == case_id).all()}
    all_edges = [
        (l.parent_person_id, l.child_person_id)
        for l in db.query(ParentChildLink).filter(ParentChildLink.case_id == case_id).all()
    ]
    if detect_cycle(all_person_ids, all_edges):
        db.delete(link)
        db.commit()
        raise HTTPException(status_code=400, detail="Cycle detected")

    return MessageResponse(message="Parent-child link created")


@router.delete("/{case_id}/parent-child-links/{link_id}", response_model=MessageResponse)
def delete_parent_child_link(
    case_id: int,
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case_or_404(db, current_user, case_id)
    link = db.query(ParentChildLink).filter(ParentChildLink.id == link_id, ParentChildLink.case_id == case_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()
    return MessageResponse(message="Parent-child link deleted")
