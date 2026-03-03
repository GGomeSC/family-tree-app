from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.common import MessageResponse
from app.schemas.user import UserOut

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.is_active.is_(True)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/logout", response_model=MessageResponse)
def logout(_: User = Depends(get_current_user)):
    return MessageResponse(message="Logout realizado. Remova o token no cliente.")


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
