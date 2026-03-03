from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate, UserOut

router = APIRouter()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
