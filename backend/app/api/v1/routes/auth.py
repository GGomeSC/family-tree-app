from datetime import timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest
from app.schemas.common import MessageResponse
from app.schemas.user import UserOut

router = APIRouter()
logger = logging.getLogger(__name__)


def _login_rate_limit() -> str:
    return f"{settings.login_rate_limit_attempts}/{settings.login_rate_limit_window_minutes} minutes"


def _set_auth_cookie(response: Response, token: str) -> None:
    max_age = settings.access_token_expire_minutes * 60
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=max_age,
        path=settings.auth_cookie_path,
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        path=settings.auth_cookie_path,
    )


@router.post("/login", response_model=MessageResponse)
@limiter.limit(_login_rate_limit)
def login(request: Request, payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    user = db.query(User).filter(User.email == payload.email, User.is_active.is_(True)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        logger.warning("login_failed email=%s ip=%s", payload.email, client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.id, expires_delta=timedelta(minutes=settings.access_token_expire_minutes))
    _set_auth_cookie(response, token)
    logger.info("login_success email=%s ip=%s", user.email, client_ip)
    return MessageResponse(message="Login successful")


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response):
    _clear_auth_cookie(response)
    return MessageResponse(message="Logout successful")


@router.post("/refresh", response_model=MessageResponse)
def refresh_token(response: Response, current_user: User = Depends(get_current_user)):
    token = create_access_token(
        current_user.id, expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    _set_auth_cookie(response, token)
    return MessageResponse(message="Token refreshed")


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
